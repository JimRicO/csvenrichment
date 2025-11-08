import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.27.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicApiKey) {
      console.error('ANTHROPIC_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Anthropic API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get active model configuration
    const { data: modelConfig, error: modelError } = await supabase
      .from('ai_extraction_models')
      .select('*')
      .eq('is_active', true)
      .single();

    if (modelError || !modelConfig) {
      console.error('No active model configured');
      return new Response(
        JSON.stringify({ error: 'No active extraction model configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find and lock one row ready for extraction (EXCLUDE Instagram jobs)
    const { data: rows, error: queryError } = await supabase
      .from('scraped_rows')
      .select('*')
      .eq('scrape_status', 'completed')
      .eq('extraction_status', 'pending')
      .not('job_id', 'like', 'IG%')
      .order('created_at', { ascending: true })
      .limit(1);

    if (queryError) {
      console.error('Query error:', queryError);
      return new Response(
        JSON.stringify({ error: 'Database query failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!rows || rows.length === 0) {
      console.log('No rows ready for extraction');
      return new Response(
        JSON.stringify({ message: 'No pending work' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const row = rows[0];
    
    // Immediately mark as processing to prevent other workers from picking it up
    const { error: lockError } = await supabase
      .from('scraped_rows')
      .update({ extraction_status: 'processing' })
      .eq('id', row.id)
      .eq('extraction_status', 'pending'); // Only update if still pending
    
    if (lockError) {
      console.error('Failed to lock row:', lockError);
      return new Response(
        JSON.stringify({ error: 'Failed to lock row' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }


    console.log(`Extracting data from row ${row.id}`);

    // Get job's extraction config to retrieve custom questions
    const { data: job, error: jobError } = await supabase
      .from('scraping_jobs')
      .select('extraction_config')
      .eq('id', row.job_id)
      .single();

    if (jobError) {
      console.error('Failed to fetch job config:', jobError);
      throw new Error('Failed to fetch job configuration');
    }

    // Build dynamic prompt with custom questions
    let dynamicPrompt = modelConfig.extraction_prompt;
    
    // Replace the generic custom answer section with actual questions
    const customQuestions: string[] = [];
    if (job.extraction_config?.custom_question_1) {
      customQuestions.push(`custom_answer_1: ${job.extraction_config.custom_question_1}`);
    }
    if (job.extraction_config?.custom_question_2) {
      customQuestions.push(`custom_answer_2: ${job.extraction_config.custom_question_2}`);
    }
    
    if (customQuestions.length > 0) {
      dynamicPrompt += `\n\n### CUSTOM QUESTIONS TO ANSWER:\n${customQuestions.join('\n')}`;
    }

    // Call Claude API using model configuration from database
    const anthropic = new Anthropic({ apiKey: anthropicApiKey });

    try {
      const message = await anthropic.messages.create({
        model: modelConfig.model_name,
        max_tokens: 2048,
        messages: [{
          role: 'user',
          content: `${dynamicPrompt}\n\nWebsite Content:\n${row.scraped_content}`,
        }],
      });

      const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
      
      // Parse JSON response
      let extractedData;
      try {
        extractedData = JSON.parse(responseText);
      } catch {
        // If not JSON, try to extract JSON from the response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          extractedData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Failed to parse extraction response as JSON');
        }
      }

      // Calculate costs using model pricing from database
      const inputTokens = message.usage.input_tokens;
      const outputTokens = message.usage.output_tokens;
      const inputCost = (inputTokens / 1_000_000) * modelConfig.input_cost_per_mtok;
      const outputCost = (outputTokens / 1_000_000) * modelConfig.output_cost_per_mtok;
      const totalCost = inputCost + outputCost;

      // Update row with extracted data
      const { error: updateError } = await supabase
        .from('scraped_rows')
        .update({
          extraction_status: 'completed',
          extracted_at: new Date().toISOString(),
          model_id: modelConfig.id,
          business_description: extractedData.business_description || null,
          team_members: Array.isArray(extractedData.team_members) 
            ? extractedData.team_members.join(', ') 
            : extractedData.team_members || null,
          social_media: extractedData.social_media || null,
          whatsapp_contact: extractedData.whatsapp_contact || null,
          custom_answer_1: extractedData.custom_answer_1 || null,
          custom_answer_2: extractedData.custom_answer_2 || null,
          input_tokens: inputTokens,
          output_tokens: outputTokens,
        })
        .eq('id', row.id);

      if (updateError) {
        console.error('Failed to update row:', updateError);
        throw updateError;
      }

      // Update job statistics
      const { data: job } = await supabase
        .from('scraping_jobs')
        .select('processed_rows, total_rows, total_input_tokens, total_output_tokens, estimated_cost_usd')
        .eq('id', row.job_id)
        .single();

      if (job) {
        // Count actual finished rows (completed or failed in both scrape and extraction)
        const { count: finishedCount } = await supabase
          .from('scraped_rows')
          .select('*', { count: 'exact', head: true })
          .eq('job_id', row.job_id)
          .in('scrape_status', ['completed', 'failed'])
          .in('extraction_status', ['completed', 'failed']);

        const newProcessedRows = job.processed_rows + 1;
        const isComplete = (finishedCount || 0) >= job.total_rows;

        await supabase
          .from('scraping_jobs')
          .update({
            processed_rows: newProcessedRows,
            total_input_tokens: job.total_input_tokens + inputTokens,
            total_output_tokens: job.total_output_tokens + outputTokens,
            estimated_cost_usd: job.estimated_cost_usd + totalCost,
            status: isComplete ? 'completed' : 'processing',
          })
          .eq('id', row.job_id);
      }

      console.log(`Successfully extracted data from row ${row.id} (cost: $${totalCost.toFixed(4)})`);

      return new Response(
        JSON.stringify({
          success: true,
          row_id: row.id,
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          cost_usd: totalCost,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (extractError) {
      console.error('Extraction error:', extractError);
      
      // Mark row as failed
      await supabase
        .from('scraped_rows')
        .update({
          extraction_status: 'failed',
          extraction_error_message: extractError instanceof Error ? extractError.message : 'Unknown error',
        })
        .eq('id', row.id);

      // Update job statistics even for failed rows (so job can complete)
      const { data: job } = await supabase
        .from('scraping_jobs')
        .select('processed_rows, total_rows')
        .eq('id', row.job_id)
        .single();

      if (job) {
        // Count actual finished rows (completed or failed in both scrape and extraction)
        const { count: finishedCount } = await supabase
          .from('scraped_rows')
          .select('*', { count: 'exact', head: true })
          .eq('job_id', row.job_id)
          .in('scrape_status', ['completed', 'failed'])
          .in('extraction_status', ['completed', 'failed']);

        const newProcessedRows = job.processed_rows + 1;
        const isComplete = (finishedCount || 0) >= job.total_rows;

        await supabase
          .from('scraping_jobs')
          .update({
            processed_rows: newProcessedRows,
            status: isComplete ? 'completed' : 'processing',
          })
          .eq('id', row.job_id);
      }

      return new Response(
        JSON.stringify({
          success: false,
          row_id: row.id,
          error: extractError instanceof Error ? extractError.message : 'Extraction failed',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Worker error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
