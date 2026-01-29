import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

interface ClubInput {
  club_name: string;
  website_url?: string;
  instagram_handle?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
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
      console.log('Unauthorized access attempt to api-create-enrichment-job');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body = await req.json();
    
    // Support both single club and bulk modes
    let clubs: ClubInput[] = [];
    
    if (body.clubs && Array.isArray(body.clubs)) {
      // Bulk mode: { clubs: [{ club_name, website_url, instagram_handle }, ...] }
      clubs = body.clubs;
    } else if (body.club_name) {
      // Single club mode: { club_name, website_url, instagram_handle }
      clubs = [{
        club_name: body.club_name,
        website_url: body.website_url,
        instagram_handle: body.instagram_handle
      }];
    } else {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid request. Provide either a single club (club_name required) or bulk clubs array',
          example_single: { club_name: "Fitness Club", website_url: "https://example.com", instagram_handle: "@fitnessclub" },
          example_bulk: { clubs: [{ club_name: "Club 1", website_url: "https://club1.com" }] }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (clubs.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No clubs provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate inputs - each club needs at least club_name AND (website_url OR instagram_handle)
    const validationErrors: string[] = [];
    for (let i = 0; i < clubs.length; i++) {
      const club = clubs[i];
      if (!club.club_name) {
        validationErrors.push(`Club at index ${i}: missing club_name`);
      }
      if (!club.website_url && !club.instagram_handle) {
        validationErrors.push(`Club "${club.club_name || 'at index ' + i}": must have website_url or instagram_handle`);
      }
    }

    if (validationErrors.length > 0) {
      return new Response(
        JSON.stringify({ error: 'Validation failed', details: validationErrors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`api-create-enrichment-job: Creating job for ${clubs.length} clubs`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Generate job ID
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const jobId = `API_ENRICH_${timestamp}_${randomSuffix}`;
    const projectId = body.project_id || `api_project_${timestamp}`;

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
    const enrichmentRows = clubs.map(club => {
      // Normalize website URL
      let websiteUrl = club.website_url || '';
      if (websiteUrl && !websiteUrl.startsWith('http')) {
        websiteUrl = `https://${websiteUrl}`;
      }
      
      return {
        job_id: jobId,
        club_name: club.club_name,
        website_url: websiteUrl || 'https://placeholder.com', // Placeholder if only Instagram provided
        instagram_handle: club.instagram_handle || null,
        status: 'pending'
      };
    });

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

    // Trigger the enrichment worker for each row (with delay to avoid rate limits)
    const triggerWorkers = async () => {
      for (let i = 0; i < clubs.length; i++) {
        try {
          console.log(`Triggering enrichment worker for row ${i + 1}/${clubs.length}`);
          await fetch(`${supabaseUrl}/functions/v1/enrichment-worker`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ job_id: jobId })
          });
          
          // Small delay between worker calls to avoid rate limits
          if (i < clubs.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        } catch (err) {
          console.error(`Worker trigger error for row ${i + 1}:`, err);
        }
      }
      console.log(`Finished triggering all ${clubs.length} enrichment workers`);
    };

    // Run workers in background using globalThis for Deno compatibility
    (globalThis as any).EdgeRuntime?.waitUntil?.(triggerWorkers()) ?? triggerWorkers();

    return new Response(
      JSON.stringify({
        success: true,
        job_id: jobId,
        project_id: projectId,
        total_clubs: clubs.length,
        message: `Enrichment job created for ${clubs.length} club(s). Workers are processing in background.`,
        status_endpoint: `/api-get-enrichment-status?job_id=${jobId}`,
        results_endpoint: `/api-get-clubs?job_id=${jobId}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in api-create-enrichment-job:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
