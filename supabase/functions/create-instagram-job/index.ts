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
    const { csv_rows, existing_job_id } = await req.json();

    if (!csv_rows || !Array.isArray(csv_rows) || csv_rows.length === 0) {
      return new Response(
        JSON.stringify({ error: 'csv_rows must be a non-empty array' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Normalize Instagram URL from row data
    const normalizeInstagramUrl = (row: any): string | null => {
      const url = row.instagram_url || row.instagram || row.Instagram || row.INSTAGRAM;
      if (!url) return null;
      
      let username = url.trim();
      if (username.includes('instagram.com/')) {
        const match = username.match(/instagram\.com\/([^\/\?]+)/);
        username = match ? match[1] : username;
      } else if (username.startsWith('@')) {
        username = username.slice(1);
      }
      
      return `https://instagram.com/${username}`;
    };

    let jobId: string;
    let projectId: string;
    let existingUrls = new Set<string>();

    if (existing_job_id) {
      // Validate it's an Instagram job (IG prefix)
      if (!existing_job_id.startsWith('IG')) {
        return new Response(
          JSON.stringify({ error: 'Invalid job ID: must be an Instagram job (IG prefix)' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate existing job
      const { data: existingJob, error: jobError } = await supabase
        .from('instagram_jobs')
        .select('id, project_id, total_rows')
        .eq('id', existing_job_id)
        .single();

      if (jobError || !existingJob) {
        return new Response(
          JSON.stringify({ error: 'Job not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      jobId = existingJob.id;
      projectId = existingJob.project_id;

      // Get existing Instagram URLs to avoid duplicates
      const { data: existingRows } = await supabase
        .from('instagram_rows')
        .select('instagram_url')
        .eq('job_id', jobId);

      if (existingRows) {
        existingUrls = new Set(existingRows.map((r: any) => r.instagram_url));
      }

      console.log(`Appending to existing job: ${jobId}, existing URLs: ${existingUrls.size}`);
    } else {
      // Create new Instagram job with IG prefix
      projectId = `instagram_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      jobId = `IG${Date.now()}${Math.random().toString(36).substring(2, 9)}`;
      
      const { data: jobData, error: jobError } = await supabase
        .from('instagram_jobs')
        .insert({
          id: jobId,
          project_id: projectId,
          status: 'pending',
          total_rows: 0,
          processed_rows: 0,
          estimated_cost_usd: 0,
        })
        .select()
        .single();

      if (jobError) {
        console.error('Job creation error:', jobError);
        return new Response(
          JSON.stringify({ error: 'Failed to create job', details: jobError }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Created new Instagram job: ${jobId}`);
    }

    // Process CSV rows
    const rowsToInsert = [];
    let duplicateCount = 0;

    for (const row of csv_rows) {
      const instagramUrl = normalizeInstagramUrl(row);
      
      if (!instagramUrl) {
        console.warn('Row missing Instagram URL, skipping:', row);
        continue;
      }

      // Check for duplicates
      if (existingUrls.has(instagramUrl)) {
        duplicateCount++;
        console.log(`Duplicate URL skipped: ${instagramUrl}`);
        continue;
      }

      rowsToInsert.push({
        job_id: jobId,
        instagram_url: instagramUrl,
        scrape_status: 'pending',
        original_row_data: row,
      });
    }

    if (rowsToInsert.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'No valid Instagram URLs found in CSV',
          duplicates: duplicateCount 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert rows
    const { error: rowsError } = await supabase
      .from('instagram_rows')
      .insert(rowsToInsert);

    if (rowsError) {
      console.error('Rows insertion error:', rowsError);
      
      // If appending failed and it's a new job, clean up
      if (!existing_job_id) {
        await supabase.from('instagram_jobs').delete().eq('id', jobId);
      }
      
      return new Response(
        JSON.stringify({ error: 'Failed to create rows', details: rowsError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update job total_rows
    const { data: currentJob } = await supabase
      .from('instagram_jobs')
      .select('total_rows')
      .eq('id', jobId)
      .single();

    const newTotalRows = (currentJob?.total_rows || 0) + rowsToInsert.length;

    await supabase
      .from('instagram_jobs')
      .update({ 
        total_rows: newTotalRows,
        status: 'processing' 
      })
      .eq('id', jobId);

    console.log(`Job ${jobId}: Added ${rowsToInsert.length} rows (${duplicateCount} duplicates skipped)`);

    return new Response(
      JSON.stringify({
        success: true,
        job_id: jobId,
        project_id: projectId,
        rows_added: rowsToInsert.length,
        duplicates_skipped: duplicateCount,
        total_rows: newTotalRows,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in create-instagram-job:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
