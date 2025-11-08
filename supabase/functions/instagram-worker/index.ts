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
    
    // HARD BLOCK: Prevent processing of completed jobs
    const BLOCKED_JOBS = ['IG1762585877028fqeh107', 'IG1762588230856ldsxkt2'];

    // Find Instagram jobs (project_id starts with 'instagram_')
    const { data: instagramJobs } = await supabase
      .from('scraping_jobs')
      .select('id, processed_rows, total_rows')
      .like('project_id', 'instagram_%')
      .in('status', ['pending', 'processing'])
      .not('id', 'in', `(${BLOCKED_JOBS.map(id => `'${id}'`).join(',')})`);

    if (!instagramJobs || instagramJobs.length === 0) {
      console.log('No active Instagram jobs found');
      return new Response(
        JSON.stringify({ message: 'No active Instagram jobs' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Filter out jobs that have already processed all rows
    const activeJobs = instagramJobs.filter(job => job.processed_rows < job.total_rows);
    
    if (activeJobs.length === 0) {
      console.log('All Instagram jobs are complete');
      
      // Mark any jobs that are processing but done as completed
      for (const job of instagramJobs) {
        if (job.processed_rows >= job.total_rows) {
          await supabase
            .from('scraping_jobs')
            .update({ status: 'completed' })
            .eq('id', job.id);
        }
      }
      
      return new Response(
        JSON.stringify({ message: 'All jobs complete' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const jobIds = activeJobs.map(j => j.id);

    // Get ONE pending row from Instagram jobs
    const { data: pendingRows, error: queryError } = await supabase
      .from('scraped_rows')
      .select('*')
      .in('job_id', jobIds)
      .eq('scrape_status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1);

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

    // Lock the row by updating status to 'processing'
    const { error: lockError } = await supabase
      .from('scraped_rows')
      .update({ scrape_status: 'processing' })
      .eq('id', row.id)
      .eq('scrape_status', 'pending'); // Only update if still pending (avoid race condition)

    if (lockError) {
      console.error('Lock error:', lockError);
      return new Response(
        JSON.stringify({ error: 'Failed to lock row' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
