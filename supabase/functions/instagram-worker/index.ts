import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Instagram worker checking for pending rows...');

    // Find Instagram jobs (project_id starts with 'instagram_')
    const { data: instagramJobs } = await supabase
      .from('scraping_jobs')
      .select('id')
      .like('project_id', 'instagram_%')
      .in('status', ['pending', 'processing']);

    if (!instagramJobs || instagramJobs.length === 0) {
      console.log('No active Instagram jobs found');
      return new Response(
        JSON.stringify({ message: 'No active Instagram jobs' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const jobIds = instagramJobs.map(j => j.id);

    // Atomically get and lock ONE pending row using raw SQL to prevent race conditions
    const { data: pendingRows, error: queryError } = await supabase.rpc('get_and_lock_instagram_row', {
      p_job_ids: jobIds
    });

    if (queryError) {
      console.error('Query error:', queryError);
      return new Response(
        JSON.stringify({ error: 'Failed to query rows' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!pendingRows || pendingRows.length === 0) {
      console.log('No pending Instagram rows to process');
      return new Response(
        JSON.stringify({ message: 'No pending work' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const row = pendingRows[0];
    console.log('Processing Instagram row:', row.id, row.website_url);

    // Call instagram-scraper edge function
    console.log('Invoking instagram-scraper for row:', row.id);
    
    const { data: scraperData, error: scraperError } = await supabase.functions.invoke(
      'instagram-scraper',
      {
        body: { scraped_row_id: row.id }
      }
    );

    if (scraperError) {
      console.error('Scraper invocation error:', scraperError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Scraper invocation failed',
          details: scraperError 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Instagram scraper completed for row:', row.id);

    return new Response(
      JSON.stringify({
        success: true,
        row_id: row.id,
        instagram_url: row.website_url,
        scraper_response: scraperData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Instagram worker error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
