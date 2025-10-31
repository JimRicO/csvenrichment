import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { job_id } = await req.json();

    if (!job_id) {
      return new Response(
        JSON.stringify({ error: 'job_id parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get job status
    const { data: job, error: jobError } = await supabase
      .from('scraping_jobs')
      .select('*')
      .eq('id', job_id)
      .single();

    if (jobError || !job) {
      return new Response(
        JSON.stringify({ error: 'Job not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get row-level statistics
    const { data: rows } = await supabase
      .from('scraped_rows')
      .select('scrape_status, extraction_status')
      .eq('job_id', job_id);

    const stats = {
      pending_scrape: rows?.filter(r => r.scrape_status === 'pending').length || 0,
      completed_scrape: rows?.filter(r => r.scrape_status === 'completed').length || 0,
      failed_scrape: rows?.filter(r => r.scrape_status === 'failed').length || 0,
      pending_extraction: rows?.filter(r => r.extraction_status === 'pending').length || 0,
      completed_extraction: rows?.filter(r => r.extraction_status === 'completed').length || 0,
      failed_extraction: rows?.filter(r => r.extraction_status === 'failed').length || 0,
    };

    return new Response(
      JSON.stringify({
        job_id: job.id,
        project_id: job.project_id,
        status: job.status,
        total_rows: job.total_rows,
        processed_rows: job.processed_rows,
        total_pages_scraped: job.total_pages_scraped,
        total_characters_scraped: job.total_characters_scraped,
        total_input_tokens: job.total_input_tokens,
        total_output_tokens: job.total_output_tokens,
        estimated_cost_usd: parseFloat(job.estimated_cost_usd),
        created_at: job.created_at,
        updated_at: job.updated_at,
        stats,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-job-status:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
