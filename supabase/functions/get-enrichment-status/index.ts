import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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
        JSON.stringify({ error: 'job_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch job details
    const { data: job, error: jobError } = await supabase
      .from('enrichment_jobs')
      .select('*')
      .eq('id', job_id)
      .single();

    if (jobError || !job) {
      return new Response(
        JSON.stringify({ error: 'Job not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch row-level status counts
    const { data: rowStats, error: statsError } = await supabase
      .from('enrichment_rows')
      .select('status')
      .eq('job_id', job_id);

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

    // Fetch recently completed enriched clubs for display
    const { data: recentClubs, error: clubsError } = await supabase
      .from('enriched_clubs')
      .select('id, club_name, logo_storage_url, instagram_handle, instagram_followers, created_at')
      .eq('job_id', job_id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (clubsError) {
      console.error('Failed to fetch recent clubs:', clubsError);
    }

    return new Response(
      JSON.stringify({
        job_id: job.id,
        project_id: job.project_id,
        status: job.status,
        total_rows: job.total_rows,
        processed_rows: job.processed_rows,
        estimated_cost_usd: job.estimated_cost_usd,
        created_at: job.created_at,
        updated_at: job.updated_at,
        stats,
        recent_clubs: recentClubs || []
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-enrichment-status:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
