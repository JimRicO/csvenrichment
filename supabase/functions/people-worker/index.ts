import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PeopleRow {
  id: string;
  job_id: string;
  person_name: string;
  context: string | null;
  status: string;
}

interface PerplexityResult {
  content: string;
  citations: string[];
}

async function searchPerplexity(query: string, apiKey: string): Promise<PerplexityResult> {
  try {
    console.log('Perplexity search query:', query.substring(0, 100));
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          { role: 'system', content: 'Be precise and concise. Provide factual information with specific details when available.' },
          { role: 'user', content: query }
        ],
      }),
    });

    if (!response.ok) {
      console.error(`Perplexity API error: ${response.status}`);
      return { content: '', citations: [] };
    }

    const data = await response.json();
    return {
      content: data.choices?.[0]?.message?.content || '',
      citations: data.citations || []
    };
  } catch (error) {
    console.error('Perplexity search error:', error);
    return { content: '', citations: [] };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { job_id } = await req.json();

    if (!job_id) {
      return new Response(
        JSON.stringify({ error: 'job_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`People worker starting for job: ${job_id}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get API keys
    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');

    if (!PERPLEXITY_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'PERPLEXITY_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find a pending row to process
    const { data: pendingRow, error: rowError } = await supabase
      .from('people_rows')
      .select('*')
      .eq('job_id', job_id)
      .eq('status', 'pending')
      .limit(1)
      .single();

    if (rowError || !pendingRow) {
      console.log('No pending rows found for job:', job_id);
      return new Response(
        JSON.stringify({ message: 'No pending rows to process', job_id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const row = pendingRow as PeopleRow;
    console.log(`Processing person: ${row.person_name}`);

    // Lock the row by setting status to processing
    await supabase
      .from('people_rows')
      .update({ status: 'processing' })
      .eq('id', row.id);

    let totalCost = 0;

    try {
      // ========== STEP 1: Perplexity Search - "Who is" ==========
      console.log('Step 1: Running biographical search...');
      const contextStr = row.context ? ` (${row.context})` : '';
      const bioQuery = `Who is ${row.person_name}${contextStr}? Provide their background, current role, company, career history, education, and notable achievements. Be specific with dates, company names, and titles.`;
      
      const bioResult = await searchPerplexity(bioQuery, PERPLEXITY_API_KEY);
      console.log(`Bio search returned ${bioResult.content.length} chars, ${bioResult.citations.length} citations`);
      totalCost += 0.005; // Perplexity cost estimate

      // ========== STEP 2: Perplexity Search - Contact Details ==========
      console.log('Step 2: Running contact details search...');
      const contactQuery = `${row.person_name}${contextStr} contact information: email address, phone number, LinkedIn profile URL, Twitter/X handle. Only provide verified contact information if publicly available.`;
      
      const contactResult = await searchPerplexity(contactQuery, PERPLEXITY_API_KEY);
      console.log(`Contact search returned ${contactResult.content.length} chars, ${contactResult.citations.length} citations`);
      totalCost += 0.005; // Perplexity cost estimate

      // Combine all citations
      const allCitations = [...new Set([...bioResult.citations, ...contactResult.citations])];

      // ========== STEP 3: Claude Synthesis ==========
      console.log('Step 3: Running Claude synthesis...');
      
      const synthesisPrompt = `Analyze the following web research about a person and extract structured information with source attribution.

SEARCH 1 - BIOGRAPHICAL INFORMATION:
${bioResult.content || 'No biographical information found.'}

Source URLs from Search 1:
${bioResult.citations.length > 0 ? bioResult.citations.map((c, i) => `[${i + 1}] ${c}`).join('\n') : 'No sources'}

SEARCH 2 - CONTACT INFORMATION:
${contactResult.content || 'No contact information found.'}

Source URLs from Search 2:
${contactResult.citations.length > 0 ? contactResult.citations.map((c, i) => `[${bioResult.citations.length + i + 1}] ${c}`).join('\n') : 'No sources'}

PERSON NAME: ${row.person_name}
CONTEXT PROVIDED: ${row.context || 'None'}

Extract and synthesize the information. For each field, identify which source URL (if any) supports that information. Return ONLY valid JSON in this exact format:

{
  "biography": "2-3 sentence biography synthesizing the person's background and significance",
  "biography_source": "URL that best supports the biography, or null",
  "job_title": "Current job title, or null if unknown",
  "company": "Current company/employer, or null if unknown",
  "role_source": "URL that supports the role/company info, or null",
  "previous_roles": [{"title": "Job Title", "company": "Company Name", "years": "2018-2022"}],
  "education": [{"degree": "Degree Name", "institution": "University Name", "year": "2010"}],
  "notable_achievements": "Key accomplishments in 1-2 sentences, or null",
  "achievements_source": "URL that supports achievements, or null",
  "email": "email@example.com or null if not found",
  "email_source": "URL where email was found, or null",
  "phone": "+1-555-123-4567 or null if not found",
  "phone_source": "URL where phone was found, or null",
  "linkedin_url": "https://linkedin.com/in/username or null",
  "twitter_handle": "@username or null",
  "other_socials": {"platform": "url"},
  "confidence_score": "high/medium/low based on data quality and source reliability"
}

Important:
- Only include information that was actually found in the searches
- Use null for any field where no reliable information was found
- previous_roles and education should be empty arrays if not found
- Confidence should be "high" if multiple sources agree, "medium" if single source, "low" if uncertain`;

      const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          messages: [{ role: 'user', content: synthesisPrompt }],
        }),
      });

      if (!claudeResponse.ok) {
        const errorText = await claudeResponse.text();
        throw new Error(`Claude API error: ${claudeResponse.status} - ${errorText}`);
      }

      const claudeData = await claudeResponse.json();
      const claudeContent = claudeData.content?.[0]?.text || '';
      
      // Calculate Claude cost
      const inputTokens = claudeData.usage?.input_tokens || 0;
      const outputTokens = claudeData.usage?.output_tokens || 0;
      totalCost += (inputTokens * 0.003 + outputTokens * 0.015) / 1000;

      console.log(`Claude synthesis complete. Tokens: ${inputTokens} in, ${outputTokens} out`);

      // Parse Claude response
      let parsedResult: any = {};
      try {
        // Extract JSON from response (handle markdown code blocks)
        const jsonMatch = claudeContent.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, claudeContent];
        const jsonStr = jsonMatch[1] || claudeContent;
        parsedResult = JSON.parse(jsonStr.trim());
      } catch (parseError) {
        console.error('Failed to parse Claude response:', parseError);
        console.log('Raw response:', claudeContent.substring(0, 500));
        // Create minimal result
        parsedResult = {
          biography: null,
          job_title: null,
          company: null,
          confidence_score: 'low'
        };
      }

      // ========== STEP 4: Store Results ==========
      console.log('Step 4: Storing enriched person data...');
      
      const { error: insertError } = await supabase
        .from('enriched_people')
        .insert({
          job_id: row.job_id,
          people_row_id: row.id,
          person_name: row.person_name,
          context: row.context,
          biography: parsedResult.biography || null,
          biography_source: parsedResult.biography_source || null,
          job_title: parsedResult.job_title || null,
          company: parsedResult.company || null,
          role_source: parsedResult.role_source || null,
          previous_roles: parsedResult.previous_roles || [],
          education: parsedResult.education || [],
          notable_achievements: parsedResult.notable_achievements || null,
          achievements_source: parsedResult.achievements_source || null,
          email: parsedResult.email || null,
          email_source: parsedResult.email_source || null,
          phone: parsedResult.phone || null,
          phone_source: parsedResult.phone_source || null,
          linkedin_url: parsedResult.linkedin_url || null,
          twitter_handle: parsedResult.twitter_handle || null,
          other_socials: parsedResult.other_socials || {},
          all_citations: allCitations,
          confidence_score: parsedResult.confidence_score || 'medium'
        });

      if (insertError) {
        throw new Error(`Failed to insert enriched person: ${insertError.message}`);
      }

      // Mark row as completed
      await supabase
        .from('people_rows')
        .update({ status: 'completed' })
        .eq('id', row.id);

      // Update job progress
      await supabase.rpc('increment_people_job_processed', {
        job_id_param: row.job_id,
        cost_increment: totalCost
      });

      console.log(`Successfully processed: ${row.person_name}, cost: $${totalCost.toFixed(4)}`);

      return new Response(
        JSON.stringify({
          success: true,
          person_name: row.person_name,
          cost: totalCost,
          citations_found: allCitations.length
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (processingError) {
      console.error('Processing error:', processingError);
      
      // Mark row as failed
      await supabase
        .from('people_rows')
        .update({ 
          status: 'failed',
          error_message: processingError instanceof Error ? processingError.message : 'Unknown error'
        })
        .eq('id', row.id);

      // Still increment job progress for failed rows
      await supabase.rpc('increment_people_job_processed', {
        job_id_param: row.job_id,
        cost_increment: totalCost
      });

      return new Response(
        JSON.stringify({
          success: false,
          person_name: row.person_name,
          error: processingError instanceof Error ? processingError.message : 'Unknown error'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Error in people-worker:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
