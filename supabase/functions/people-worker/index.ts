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

interface IntelligenceProfile {
  identity: {
    full_name: string | null;
    aliases: string[];
    photo_url: string | null;
  };
  current_role: {
    title: string | null;
    company: string | null;
    department: string | null;
    start_date: string | null;
    reports_to: string | null;
  };
  biography: string | null;
  career_history: Array<{
    company: string;
    title: string;
    dates: string;
    highlights: string[];
  }>;
  education: Array<{
    institution: string;
    degree: string;
    field: string;
    year: string | null;
  }>;
  public_presence: {
    linkedin_url: string | null;
    twitter_handle: string | null;
    other_profiles: Record<string, string>;
    website: string | null;
    notable_content: string[];
  };
  recent_news: Array<{
    headline: string;
    source: string;
    date: string;
    url: string;
  }>;
  contact: {
    email: string | null;
    email_confidence: string | null;
    email_pattern: string | null;
    phone: string | null;
    location: string | null;
  };
  insights: {
    communication_style: string | null;
    key_interests: string[];
    conversation_starters: string[];
    quotes: string[];
  };
  sources: string[];
  research_summary: string | null;
}

async function callComprehensiveResearch(personName: string, context: string | null, apiKey: string): Promise<IntelligenceProfile> {
  const contextStr = context ? ` (${context})` : '';
  const companyHint = context || '';
  
  console.log(`Calling Perplexity Comprehensive Intelligence Research for: ${personName}${contextStr}`);
  
  const response = await fetch('https://api.perplexity.ai/v1/responses', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      preset: "deep-research",
      input: `Build a comprehensive intelligence dossier on: ${personName}${contextStr}.

Research their professional background, career history, education, public presence, recent news mentions, contact information, and insights for sales outreach.

I need:
- Full biography (3-5 paragraphs, narrative style)
- Career history with dates and highlights
- Education and certifications
- LinkedIn, Twitter, website URLs
- Recent news articles mentioning them
- Work email (verified or pattern-based)
- Communication style and conversation starters`,
      instructions: `You are building a premium competitive intelligence dossier. Research exhaustively using multiple searches and fetch_url to get full page content.

OUTPUT FORMAT - Respond with this JSON structure only:
{
  "identity": { "full_name": "...", "aliases": [], "photo_url": null },
  "current_role": { "title": "...", "company": "...", "department": null, "start_date": null, "reports_to": null },
  "biography": "3-5 paragraph narrative biography...",
  "career_history": [{ "company": "...", "title": "...", "dates": "...", "highlights": [] }],
  "education": [{ "institution": "...", "degree": "...", "field": "...", "year": null }],
  "public_presence": { "linkedin_url": null, "twitter_handle": null, "other_profiles": {}, "website": null, "notable_content": [] },
  "recent_news": [{ "headline": "...", "source": "...", "date": "...", "url": "..." }],
  "contact": { "email": null, "email_confidence": "verified|pattern_based|not_found", "email_pattern": null, "phone": null, "location": null },
  "insights": { "communication_style": "...", "key_interests": [], "conversation_starters": [], "quotes": [] },
  "sources": ["all URLs used"],
  "research_summary": "Brief summary of research quality and any gaps"
}`,
      max_output_tokens: 4000
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Perplexity API error: ${response.status} - ${errorText}`);
    throw new Error(`Perplexity API error: ${response.status}`);
  }

  const data = await response.json();
  
  // Log usage data if available from Perplexity
  if (data.usage) {
    console.log(`Perplexity usage data:`, JSON.stringify(data.usage));
  }
  
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

  console.log(`Comprehensive research response length: ${outputText.length} chars`);

  // Parse JSON from output
  let parsedResult: IntelligenceProfile;
  try {
    const cleanedText = outputText.replace(/```json\n?|\n?```/g, '').trim();
    parsedResult = JSON.parse(cleanedText);
  } catch (parseError) {
    console.error('Failed to parse comprehensive response:', parseError);
    console.log('Raw response (first 500 chars):', outputText.substring(0, 500));
    
    // Return minimal result
    parsedResult = {
      identity: { full_name: null, aliases: [], photo_url: null },
      current_role: { title: null, company: null, department: null, start_date: null, reports_to: null },
      biography: null,
      career_history: [],
      education: [],
      public_presence: { linkedin_url: null, twitter_handle: null, other_profiles: {}, website: null, notable_content: [] },
      recent_news: [],
      contact: { email: null, email_confidence: null, email_pattern: null, phone: null, location: null },
      insights: { communication_style: null, key_interests: [], conversation_starters: [], quotes: [] },
      sources: [],
      research_summary: 'Failed to parse research results'
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

    // Estimated cost for deep-research preset (based on observed actual costs ~$0.30-0.50)
    const estimatedCost = 0.38;

    try {
      // ========== Comprehensive Intelligence Research ==========
      console.log('Calling Perplexity Comprehensive Intelligence Research API...');
      
      const result = await callComprehensiveResearch(row.person_name, row.context, PERPLEXITY_API_KEY);
      
      console.log(`Research complete. Sources: ${result.sources?.length || 0}`);

      // ========== Map to previous_roles format for DB compatibility ==========
      const previousRoles = (result.career_history || []).map(role => ({
        title: role.title,
        company: role.company,
        years: role.dates
      }));

      // ========== Map education format ==========
      const education = (result.education || []).map(edu => ({
        degree: edu.degree,
        institution: edu.institution,
        year: edu.year || ''
      }));

      // ========== Store Results ==========
      console.log('Storing enriched person data...');
      
      const { error: insertError } = await supabase
        .from('enriched_people')
        .insert({
          job_id: row.job_id,
          people_row_id: row.id,
          person_name: result.identity?.full_name || row.person_name,
          context: row.context,
          
          // Identity fields
          aliases: result.identity?.aliases || [],
          photo_url: result.identity?.photo_url || null,
          
          // Current role
          job_title: result.current_role?.title || null,
          company: result.current_role?.company || null,
          department: result.current_role?.department || null,
          start_date: result.current_role?.start_date || null,
          reports_to: result.current_role?.reports_to || null,
          
          // Biography
          biography: result.biography || null,
          biography_source: result.sources?.[0] || null,
          role_source: result.sources?.[0] || null,
          
          // Career history
          previous_roles: previousRoles,
          career_highlights: result.career_history?.flatMap(r => r.highlights || []) || [],
          
          // Education
          education: education,
          
          // Notable achievements (synthesized from career highlights)
          notable_achievements: result.career_history?.flatMap(r => r.highlights || []).slice(0, 3).join('. ') || null,
          achievements_source: result.sources?.[0] || null,
          
          // Public presence
          linkedin_url: result.public_presence?.linkedin_url || null,
          twitter_handle: result.public_presence?.twitter_handle || null,
          other_socials: result.public_presence?.other_profiles || {},
          website: result.public_presence?.website || null,
          notable_content: result.public_presence?.notable_content || [],
          
          // News
          recent_news: result.recent_news || [],
          
          // Contact
          email: result.contact?.email || null,
          email_source: result.sources?.find(s => s.includes('linkedin') || s.includes('contact')) || null,
          email_confidence: result.contact?.email_confidence || null,
          email_pattern: result.contact?.email_pattern || null,
          phone: result.contact?.phone || null,
          phone_source: null,
          location: result.contact?.location || null,
          
          // Insights
          communication_style: result.insights?.communication_style || null,
          key_interests: result.insights?.key_interests || [],
          conversation_starters: result.insights?.conversation_starters || [],
          quotes: result.insights?.quotes || [],
          
          // Sources and quality
          all_citations: result.sources || [],
          confidence_score: result.sources?.length >= 5 ? 'high' : result.sources?.length >= 2 ? 'medium' : 'low',
          research_summary: result.research_summary || null
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

      console.log(`Successfully processed: ${row.person_name}, cost: $${estimatedCost.toFixed(2)}`);

      return new Response(
        JSON.stringify({
          success: true,
          person_name: row.person_name,
          cost: estimatedCost,
          citations_found: result.sources?.length || 0,
          has_biography: !!result.biography,
          has_insights: !!(result.insights?.communication_style || result.insights?.quotes?.length)
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
