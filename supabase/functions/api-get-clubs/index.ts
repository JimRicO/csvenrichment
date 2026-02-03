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

  try {
    // Validate API key
    const apiKey = req.headers.get('x-api-key');
    const expectedKey = Deno.env.get('CRM_API_KEY');
    
    if (!apiKey || apiKey !== expectedKey) {
      console.log('Unauthorized access attempt to api-get-clubs');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse query parameters
    const url = new URL(req.url);
    const needsEnrichment = url.searchParams.get('needs_enrichment') === 'true';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const jobId = url.searchParams.get('job_id');

    console.log(`api-get-clubs: needs_enrichment=${needsEnrichment}, limit=${limit}, offset=${offset}, job_id=${jobId}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Build query - return ALL enriched_clubs fields for external systems
    let query = supabase
      .from('enriched_clubs')
      .select(`
        id,
        job_id,
        enrichment_row_id,
        club_name,
        website_url,
        instagram_handle,
        instagram_followers,
        instagram_bio,
        instagram_profile_pic_url,
        description,
        email,
        phone,
        address,
        logo_storage_url,
        color_palette,
        fonts,
        attitude,
        aesthetics,
        perplexity_description,
        founder_info,
        founding_year,
        recent_activities,
        perplexity_citations,
        key_people,
        raw_branding_data,
        raw_instagram_data,
        scraped_content,
        created_at,
        updated_at
      `);

    // Filter by job_id if provided
    if (jobId) {
      query = query.eq('job_id', jobId);
    }

    // Filter for clubs needing enrichment
    if (needsEnrichment) {
      query = query.or('perplexity_description.is.null,founder_info.is.null');
    }

    // Apply pagination
    const { data: clubs, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Database query error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch clubs', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`api-get-clubs: returning ${clubs?.length || 0} clubs`);

    return new Response(
      JSON.stringify({
        clubs: clubs || [],
        pagination: {
          limit,
          offset,
          returned: clubs?.length || 0
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in api-get-clubs:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
