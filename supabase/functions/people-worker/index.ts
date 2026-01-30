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

interface AgenticResearchResult {
  full_name: string | null;
  biography: string | null;
  job_title: string | null;
  company: string | null;
  previous_roles: Array<{ title: string; company: string; years: string }>;
  education: Array<{ degree: string; institution: string; year: string }>;
  notable_achievements: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  twitter_handle: string | null;
  other_socials: Record<string, string>;
  confidence: 'high' | 'medium' | 'low';
  sources: string[];
}

async function callAgenticResearch(personName: string, context: string | null, apiKey: string): Promise<AgenticResearchResult> {
  const contextStr = context ? ` (${context})` : '';
  
  const instructions = `You are a professional researcher. Find comprehensive information about this person.

SEARCH: LinkedIn profile, company websites, news articles, professional directories, social media, public records.

RESPOND ONLY with this JSON, no other text:
{
  "full_name": "string or null",
  "biography": "2-3 sentence professional biography summarizing their background and significance",
  "job_title": "current job title or null",
  "company": "current company/employer or null",
  "previous_roles": [{"title": "Job Title", "company": "Company Name", "years": "2018-2022"}],
  "education": [{"degree": "Degree Name", "institution": "University Name", "year": "2010"}],
  "notable_achievements": "Key accomplishments, awards, or recognition in 1-2 sentences or null",
  "email": "work email address or null",
  "phone": "phone number or null",
  "linkedin_url": "LinkedIn profile URL or null",
  "twitter_handle": "@username or null",
  "other_socials": {"platform": "url"},
  "confidence": "high|medium|low",
  "sources": ["URLs used to gather this information"]
}

RULES:
- Only include verified information, use null for missing fields
- Biography should synthesize their professional identity and significance
- previous_roles and education should be empty arrays [] if not found
- Prioritize work email over personal email
- Never fabricate or guess data
- Confidence: "high" if multiple sources agree, "medium" if single source, "low" if uncertain`;

  console.log(`Calling Perplexity Agentic Research for: ${personName}${contextStr}`);
  
  const response = await fetch('https://api.perplexity.ai/responses', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: "openai/gpt-5.2",
      input: `Research ${personName}${contextStr}. Find their professional background, career history, contact information, and notable achievements.`,
      tools: [{ type: "web_search" }],
      instructions: instructions
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Perplexity Agentic API error: ${response.status} - ${errorText}`);
    throw new Error(`Perplexity API error: ${response.status}`);
  }

  const data = await response.json();
  
  // Extract output_text from the agentic response format
  let outputText = data.output_text || "";
  if (!outputText && data.output) {
    for (const item of data.output) {
      if (item.type === "message" && item.content) {
        for (const content of item.content) {
          if (content.type === "output_text") {
            outputText += content.text;
          }
        }
      }
    }
  }

  console.log(`Agentic response length: ${outputText.length} chars`);

  // Parse JSON from output
  let parsedResult: AgenticResearchResult;
  try {
    // Remove markdown code blocks if present
    const cleanedText = outputText.replace(/```json\n?|\n?```/g, '').trim();
    parsedResult = JSON.parse(cleanedText);
  } catch (parseError) {
    console.error('Failed to parse agentic response:', parseError);
    console.log('Raw response (first 500 chars):', outputText.substring(0, 500));
    
    // Return minimal result
    parsedResult = {
      full_name: null,
      biography: null,
      job_title: null,
      company: null,
      previous_roles: [],
      education: [],
      notable_achievements: null,
      email: null,
      phone: null,
      linkedin_url: null,
      twitter_handle: null,
      other_socials: {},
      confidence: 'low',
      sources: []
    };
  }

  return parsedResult;
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

    // Get API key
    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');

    if (!PERPLEXITY_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'PERPLEXITY_API_KEY not configured' }),
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

    // Estimated cost for single Agentic Research call (~$0.03-0.05)
    const estimatedCost = 0.035;

    try {
      // ========== Single Agentic Research Call ==========
      console.log('Calling Perplexity Agentic Research API...');
      
      const result = await callAgenticResearch(row.person_name, row.context, PERPLEXITY_API_KEY);
      
      console.log(`Research complete. Confidence: ${result.confidence}, Sources: ${result.sources.length}`);

      // ========== Store Results ==========
      console.log('Storing enriched person data...');
      
      const { error: insertError } = await supabase
        .from('enriched_people')
        .insert({
          job_id: row.job_id,
          people_row_id: row.id,
          person_name: result.full_name || row.person_name,
          context: row.context,
          biography: result.biography || null,
          biography_source: result.sources?.[0] || null,
          job_title: result.job_title || null,
          company: result.company || null,
          role_source: result.sources?.[0] || null,
          previous_roles: result.previous_roles || [],
          education: result.education || [],
          notable_achievements: result.notable_achievements || null,
          achievements_source: result.sources?.[0] || null,
          email: result.email || null,
          email_source: result.sources?.find(s => s.includes('linkedin') || s.includes('contact')) || null,
          phone: result.phone || null,
          phone_source: null,
          linkedin_url: result.linkedin_url || null,
          twitter_handle: result.twitter_handle || null,
          other_socials: result.other_socials || {},
          all_citations: result.sources || [],
          confidence_score: result.confidence || 'medium'
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
        cost_increment: estimatedCost
      });

      console.log(`Successfully processed: ${row.person_name}, cost: $${estimatedCost.toFixed(4)}`);

      return new Response(
        JSON.stringify({
          success: true,
          person_name: row.person_name,
          cost: estimatedCost,
          citations_found: result.sources?.length || 0,
          confidence: result.confidence
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
        cost_increment: estimatedCost
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
