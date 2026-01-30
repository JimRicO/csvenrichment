import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only accept GET requests
  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Validate API key
    const apiKey = req.headers.get('x-api-key');
    const expectedKey = Deno.env.get('CRM_API_KEY');
    
    if (!apiKey || apiKey !== expectedKey) {
      console.log('Unauthorized access attempt to api-get-people');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse query parameters
    const url = new URL(req.url);
    const jobId = url.searchParams.get('job_id');
    const needsEnrichment = url.searchParams.get('needs_enrichment') === 'true';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);
    const offset = parseInt(url.searchParams.get('offset') || '0');

    console.log(`api-get-people: job_id=${jobId}, needs_enrichment=${needsEnrichment}, limit=${limit}, offset=${offset}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Build query - select all columns from enriched_people
    let query = supabase
      .from('enriched_people')
      .select(`
        id,
        job_id,
        people_row_id,
        person_name,
        context,
        job_title,
        company,
        department,
        location,
        biography,
        biography_source,
        photo_url,
        email,
        email_confidence,
        email_pattern,
        email_source,
        phone,
        phone_source,
        linkedin_url,
        twitter_handle,
        website,
        other_socials,
        education,
        previous_roles,
        career_highlights,
        start_date,
        reports_to,
        role_source,
        notable_achievements,
        achievements_source,
        key_interests,
        communication_style,
        recent_news,
        notable_content,
        quotes,
        conversation_starters,
        research_summary,
        confidence_score,
        aliases,
        all_citations,
        created_at,
        updated_at
      `);

    // Filter by job_id if provided
    if (jobId) {
      query = query.eq('job_id', jobId);
    }

    // Filter for people needing enrichment (incomplete records)
    if (needsEnrichment) {
      query = query.or('biography.is.null,email.is.null,linkedin_url.is.null');
    }

    // Apply pagination
    const { data: people, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Database query error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch people', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`api-get-people: returning ${people?.length || 0} people`);

    return new Response(
      JSON.stringify({
        people: people || [],
        pagination: {
          limit,
          offset,
          returned: people?.length || 0
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in api-get-people:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
