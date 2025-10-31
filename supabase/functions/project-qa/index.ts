import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { job_id, question } = await req.json();

    if (!job_id || !question) {
      throw new Error('job_id and question are required');
    }

    console.log(`Processing Q&A for job_id: ${job_id}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the Anthropic API key
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicApiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    // Fetch the job and its conversation history
    const { data: job, error: jobError } = await supabase
      .from('scraping_jobs')
      .select('conversation, project_id')
      .eq('id', job_id)
      .single();

    if (jobError) {
      console.error('Error fetching job:', jobError);
      throw new Error('Failed to fetch job');
    }

    console.log(`Job found: ${job.project_id}`);

    // Fetch all scraped content for this job
    const { data: scrapedRows, error: rowsError } = await supabase
      .from('scraped_rows')
      .select('website_url, scraped_content, business_description, team_members, whatsapp_contact, social_media, custom_answer_1, custom_answer_2, extraction_status')
      .eq('job_id', job_id)
      .eq('extraction_status', 'completed');

    if (rowsError) {
      console.error('Error fetching scraped rows:', rowsError);
      throw new Error('Failed to fetch scraped content');
    }

    console.log(`Found ${scrapedRows?.length || 0} scraped rows`);

    // Build context from scraped content
    const contextParts = scrapedRows?.map((row, index) => {
      return `
=== Website ${index + 1}: ${row.website_url} ===
Business Description: ${row.business_description || 'N/A'}
Team Members: ${row.team_members || 'N/A'}
WhatsApp Contact: ${row.whatsapp_contact || 'N/A'}
Social Media: ${row.social_media ? JSON.stringify(row.social_media) : 'N/A'}
Custom Answer 1: ${row.custom_answer_1 || 'N/A'}
Custom Answer 2: ${row.custom_answer_2 || 'N/A'}

Scraped Content:
${row.scraped_content?.substring(0, 5000) || 'No content available'}
      `.trim();
    }) || [];

    const context = contextParts.join('\n\n---\n\n');

    // Build conversation history for Claude
    const conversationHistory = job.conversation || [];
    const messages = [
      {
        role: 'user',
        content: `You are an AI assistant helping to analyze scraped web data. Below is all the scraped content from a data extraction project:\n\n${context}\n\nPlease answer questions about this data accurately and concisely.`
      },
      {
        role: 'assistant',
        content: 'I understand. I have access to the scraped data and I\'m ready to answer your questions about it.'
      },
      ...conversationHistory.map((msg: any) => ({
        role: msg.role,
        content: msg.content
      })),
      {
        role: 'user',
        content: question
      }
    ];

    console.log('Calling Claude Haiku API...');

    // Call Claude Haiku API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 2048,
        messages: messages.slice(2) // Remove the initial system context from messages array
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error:', response.status, errorText);
      throw new Error(`Claude API error: ${response.status}`);
    }

    const claudeResponse = await response.json();
    const answer = claudeResponse.content[0].text;

    console.log('Claude response received');

    // Update conversation history
    const updatedConversation = [
      ...conversationHistory,
      { role: 'user', content: question, timestamp: new Date().toISOString() },
      { role: 'assistant', content: answer, timestamp: new Date().toISOString() }
    ];

    // Save updated conversation
    const { error: updateError } = await supabase
      .from('scraping_jobs')
      .update({ 
        conversation: updatedConversation,
        updated_at: new Date().toISOString()
      })
      .eq('id', job_id);

    if (updateError) {
      console.error('Error updating conversation:', updateError);
      throw new Error('Failed to save conversation');
    }

    console.log('Conversation updated successfully');

    return new Response(
      JSON.stringify({ 
        answer,
        conversation: updatedConversation
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in project-qa function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});