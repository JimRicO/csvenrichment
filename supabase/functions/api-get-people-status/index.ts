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
      console.log('Unauthorized access attempt to api-get-people-status');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse query parameters
    const url = new URL(req.url);
    const jobId = url.searchParams.get('job_id');

    if (!jobId) {
      return new Response(
        JSON.stringify({ error: 'job_id query parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`api-get-people-status: Fetching status for job ${jobId}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch job details
    const { data: job, error: jobError } = await supabase
      .from('people_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return new Response(
        JSON.stringify({ error: 'Job not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch row-level status counts
    const { data: rowStats, error: statsError } = await supabase
      .from('people_rows')
      .select('status')
      .eq('job_id', jobId);

    if (statsError) {
      console.error('Failed to fetch row stats:', statsError);
    }

    // Calculate status breakdown
    const stats = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0
    };

    if (rowStats) {
      for (const row of rowStats) {
        if (row.status in stats) {
          stats[row.status as keyof typeof stats]++;
        }
      }
    }

    // Calculate progress percentage
    const progressPercent = job.total_rows > 0 
      ? Math.round((job.processed_rows / job.total_rows) * 100) 
      : 0;

    return new Response(
      JSON.stringify({
        job_id: job.id,
        project_id: job.project_id,
        status: job.status,
        total_rows: job.total_rows,
        processed_rows: job.processed_rows,
        progress_percent: progressPercent,
        estimated_cost_usd: job.estimated_cost_usd,
        created_at: job.created_at,
        updated_at: job.updated_at,
        row_stats: stats,
        is_complete: job.status === 'completed',
        results_endpoint: job.status === 'completed' ? `/api-get-people?job_id=${jobId}` : null
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in api-get-people-status:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
