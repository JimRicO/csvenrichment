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

    // First, handle stuck rows (processing for more than 2 minutes)
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const maxRetries = 3;

    const { data: stuckRows } = await supabase
      .from('instagram_rows')
      .select('id, retry_count, instagram_url')
      .eq('scrape_status', 'processing')
      .lt('last_processing_at', twoMinutesAgo)
      .lt('retry_count', maxRetries);

    if (stuckRows && stuckRows.length > 0) {
      console.log(`Found ${stuckRows.length} stuck rows, resetting to pending...`);
      
      for (const row of stuckRows) {
        await supabase
          .from('instagram_rows')
          .update({ 
            scrape_status: 'pending',
            retry_count: row.retry_count + 1,
            scrape_error_message: `Timeout after 2 minutes (retry ${row.retry_count + 1}/${maxRetries})`
          })
          .eq('id', row.id);
        
        console.log(`Reset stuck row ${row.id} (${row.instagram_url}) - retry ${row.retry_count + 1}`);
      }
    }

    // Mark rows that exceeded max retries as failed
    const { data: maxRetriedRows } = await supabase
      .from('instagram_rows')
      .select('id, instagram_url')
      .eq('scrape_status', 'processing')
      .gte('retry_count', maxRetries);

    if (maxRetriedRows && maxRetriedRows.length > 0) {
      console.log(`Found ${maxRetriedRows.length} rows that exceeded max retries, marking as failed...`);
      
      for (const row of maxRetriedRows) {
        await supabase
          .from('instagram_rows')
          .update({ 
            scrape_status: 'failed',
            scrape_error_message: `Failed after ${maxRetries} retry attempts - exceeded timeout limit`
          })
          .eq('id', row.id);
        
        console.log(`Marked row ${row.id} (${row.instagram_url}) as failed after ${maxRetries} retries`);
      }
    }

    // Find Instagram jobs (new dedicated table)
    const { data: instagramJobs } = await supabase
      .from('instagram_jobs')
      .select('id, processed_rows, total_rows')
      .in('status', ['pending', 'processing']);

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
            .from('instagram_jobs')
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
      .from('instagram_rows')
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
    console.log('Processing Instagram row:', row.id, row.instagram_url);

    // Lock the row by updating status to 'processing' and set timestamp
    const { error: lockError, count: lockCount } = await supabase
      .from('instagram_rows')
      .update({ 
        scrape_status: 'processing',
        last_processing_at: new Date().toISOString()
      })
      .eq('id', row.id)
      .eq('scrape_status', 'pending'); // Only update if still pending (avoid race condition)

    if (lockError) {
      console.error('Lock error:', lockError);
      return new Response(
        JSON.stringify({ error: 'Failed to lock row' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If no rows were updated, it means another worker already took it or it's not pending
    if (lockCount === 0) {
      console.log('Row already locked or not pending, skipping');
      return new Response(
        JSON.stringify({ message: 'Row already processed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
        instagram_url: row.instagram_url,
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
