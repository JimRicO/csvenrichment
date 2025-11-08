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
    const { csv_rows, extraction_config } = await req.json();

    if (!csv_rows || !Array.isArray(csv_rows) || csv_rows.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid CSV data. Must provide array of rows.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate CSV has website URLs
    const websiteUrls = csv_rows
      .map(row => row.website || row.url || row.Website || row.URL)
      .filter(Boolean);

    if (websiteUrls.length === 0) {
      return new Response(
        JSON.stringify({ error: 'CSV must contain a "website" or "url" column with valid URLs' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Generate unique project ID and job ID with RICH prefix
    const project_id = `project_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const job_id = `RICH${Date.now()}${Math.random().toString(36).substring(2, 9)}`;

    // Create scraping job
    const { data: job, error: jobError } = await supabase
      .from('scraping_jobs')
      .insert({
        id: job_id,
        project_id,
        status: 'pending',
        total_rows: websiteUrls.length,
        processed_rows: 0,
        extraction_config: extraction_config || {},
      })
      .select()
      .single();

    if (jobError) {
      console.error('Error creating job:', jobError);
      return new Response(
        JSON.stringify({ error: 'Failed to create job', details: jobError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create scraped_rows entries with original CSV data preserved
    const rows = csv_rows
      .map((row, index) => {
        const url = row.website || row.url || row.Website || row.URL;
        if (!url) return null;
        
        return {
          job_id: job.id,
          project_id: job.project_id,
          website_url: url,
          scrape_status: 'pending',
          extraction_status: 'pending',
          original_row_data: row, // Store entire original CSV row
        };
      })
      .filter(Boolean);

    const { error: rowsError } = await supabase
      .from('scraped_rows')
      .insert(rows);

    if (rowsError) {
      console.error('Error creating rows:', rowsError);
      // Cleanup job if rows failed
      await supabase.from('scraping_jobs').delete().eq('id', job.id);
      return new Response(
        JSON.stringify({ error: 'Failed to create row entries', details: rowsError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update job status to processing
    await supabase
      .from('scraping_jobs')
      .update({ status: 'processing' })
      .eq('id', job.id);

    console.log(`Created job ${job.id} with ${websiteUrls.length} rows`);

    return new Response(
      JSON.stringify({
        success: true,
        job_id: job.id,
        project_id: job.project_id,
        total_rows: websiteUrls.length,
        message: 'Job created successfully. Workers will begin processing automatically.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in create-scraping-job:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
