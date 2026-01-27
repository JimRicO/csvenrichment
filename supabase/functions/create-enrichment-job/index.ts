import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ClubInput {
  club_name: string;
  website_url: string;
  instagram_handle?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // Support both single club and bulk CSV modes
    let clubs: ClubInput[] = [];
    
    if (body.rows && Array.isArray(body.rows)) {
      // Bulk mode: { rows: [{ club_name, website_url, instagram_handle }, ...] }
      clubs = body.rows;
    } else if (body.club_name && body.website_url) {
      // Single club mode: { club_name, website_url, instagram_handle }
      clubs = [{
        club_name: body.club_name,
        website_url: body.website_url,
        instagram_handle: body.instagram_handle
      }];
    } else {
      return new Response(
        JSON.stringify({ error: 'Either provide a single club (club_name, website_url) or bulk rows' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (clubs.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No clubs provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate inputs
    for (const club of clubs) {
      if (!club.club_name || !club.website_url) {
        return new Response(
          JSON.stringify({ error: 'Each club must have club_name and website_url' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log(`Creating enrichment job for ${clubs.length} clubs`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Generate job ID
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const jobId = `ENRICH_${timestamp}_${randomSuffix}`;
    const projectId = body.project_id || `project_${timestamp}`;

    // Create the enrichment job
    const { error: jobError } = await supabase
      .from('enrichment_jobs')
      .insert({
        id: jobId,
        project_id: projectId,
        status: 'pending',
        total_rows: clubs.length,
        processed_rows: 0,
        estimated_cost_usd: 0
      });

    if (jobError) {
      console.error('Failed to create enrichment job:', jobError);
      return new Response(
        JSON.stringify({ error: 'Failed to create job', details: jobError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Created enrichment job: ${jobId}`);

    // Insert all enrichment rows
    const enrichmentRows = clubs.map(club => ({
      job_id: jobId,
      club_name: club.club_name,
      website_url: club.website_url.startsWith('http') ? club.website_url : `https://${club.website_url}`,
      instagram_handle: club.instagram_handle || null,
      status: 'pending'
    }));

    const { error: rowsError } = await supabase
      .from('enrichment_rows')
      .insert(enrichmentRows);

    if (rowsError) {
      console.error('Failed to insert enrichment rows:', rowsError);
      // Cleanup the job if rows failed to insert
      await supabase.from('enrichment_jobs').delete().eq('id', jobId);
      return new Response(
        JSON.stringify({ error: 'Failed to create enrichment rows', details: rowsError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Inserted ${enrichmentRows.length} enrichment rows`);

    // Update job status to processing
    await supabase
      .from('enrichment_jobs')
      .update({ status: 'processing' })
      .eq('id', jobId);

    return new Response(
      JSON.stringify({
        success: true,
        job_id: jobId,
        project_id: projectId,
        total_rows: clubs.length,
        message: `Enrichment job created with ${clubs.length} club(s)`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in create-enrichment-job:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
