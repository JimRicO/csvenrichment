import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { scraped_row_id, url } = await req.json();
    
    // If scraped_row_id is provided, fetch from database (worker mode)
    // If url is provided, direct scrape mode (legacy)
    if (!scraped_row_id && !url) {
      return new Response(
        JSON.stringify({ error: 'Either scraped_row_id or url is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    let instagramUrl = url;
    let jobId = null;
    let rowId = scraped_row_id;

    // If using scraped_row_id, fetch the row data
    if (scraped_row_id) {
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data: rowData, error: rowError } = await supabase
        .from('scraped_rows')
        .select('website_url, job_id')
        .eq('id', scraped_row_id)
        .single();

      if (rowError || !rowData) {
        console.error('Failed to fetch scraped row:', rowError);
        return new Response(
          JSON.stringify({ error: 'Scraped row not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      instagramUrl = rowData.website_url;
      jobId = rowData.job_id;
      console.log('Processing row:', scraped_row_id, 'URL:', instagramUrl, 'Job:', jobId);
    }
    
    if (!instagramUrl) {
      return new Response(
        JSON.stringify({ error: 'Instagram URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const APIFY_API_TOKEN = Deno.env.get('APIFY_API_TOKEN');
    if (!APIFY_API_TOKEN) {
      console.error('APIFY_API_TOKEN is not configured');
      return new Response(
        JSON.stringify({ error: 'API token not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract username from Instagram URL
    let username = instagramUrl;
    if (instagramUrl.includes('instagram.com/')) {
      const match = instagramUrl.match(/instagram\.com\/([^\/\?]+)/);
      if (match) {
        username = match[1];
      }
    }
    
    console.log('Starting Instagram scrape for username:', username);

    // Start Apify actor run
    const runResponse = await fetch(
      `https://api.apify.com/v2/acts/apify~instagram-profile-scraper/runs?token=${APIFY_API_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usernames: [username],
          resultsLimit: 12,
        }),
      }
    );

    if (!runResponse.ok) {
      const errorText = await runResponse.text();
      console.error('Apify run start failed:', runResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to start scraping' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const runData = await runResponse.json();
    const runId = runData.data.id;
    const datasetId = runData.data.defaultDatasetId;
    
    console.log('Run started:', runId, 'Dataset:', datasetId);

    // Poll for completion
    let status = 'RUNNING';
    let attempts = 0;
    const maxAttempts = 20; // 60 seconds max wait

    await new Promise(resolve => setTimeout(resolve, 3000)); // Initial delay

    while (status === 'RUNNING' && attempts < maxAttempts) {
      const statusResponse = await fetch(
        `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_API_TOKEN}`
      );

      if (!statusResponse.ok) {
        console.error('Status check failed:', statusResponse.status);
        break;
      }

      const statusData = await statusResponse.json();
      status = statusData.data.status;
      
      console.log('Run status:', status, 'Attempt:', attempts + 1);

      if (status === 'RUNNING') {
        await new Promise(resolve => setTimeout(resolve, 3000));
        attempts++;
      }
    }

    if (status !== 'SUCCEEDED') {
      console.error('Run did not succeed:', status);
      return new Response(
        JSON.stringify({ error: `Scraping ${status.toLowerCase()}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch results from dataset
    const resultsResponse = await fetch(
      `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_API_TOKEN}`
    );

    if (!resultsResponse.ok) {
      const errorText = await resultsResponse.text();
      console.error('Failed to fetch results:', resultsResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch results' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = await resultsResponse.json();
    console.log('Results fetched:', results.length, 'profiles');
    
    if (results.length === 0) {
      console.error('No results returned from Apify');
      
      // If in worker mode, mark row as failed
      if (scraped_row_id) {
        const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        await supabase
          .from('scraped_rows')
          .update({
            scrape_status: 'failed',
            scrape_error_message: 'No profile data returned',
            scraped_at: new Date().toISOString()
          })
          .eq('id', scraped_row_id);

        // Update job stats
        if (jobId) {
          const { data: currentJob } = await supabase
            .from('scraping_jobs')
            .select('processed_rows, total_rows')
            .eq('id', jobId)
            .single();

          if (currentJob) {
            await supabase
              .from('scraping_jobs')
              .update({
                processed_rows: currentJob.processed_rows + 1,
                status: currentJob.processed_rows + 1 >= currentJob.total_rows ? 'completed' : 'processing'
              })
              .eq('id', jobId);
          }
        }
      }
      
      return new Response(
        JSON.stringify({ error: 'No profile data found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const profileData = results[0];
    console.log('Profile data received:', profileData.username);

    // If in worker mode, store data in instagram_company_data table
    if (scraped_row_id && jobId) {
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
      const supabase = createClient(supabaseUrl, supabaseKey);

      try {
        // Extract profile header fields (8 fields)
        const instagramCompanyData = {
          job_id: jobId,
          scraped_row_id: scraped_row_id,
          instagram_url: instagramUrl,
          username: profileData.username || '',
          full_name: profileData.fullName || null,
          biography: profileData.biography || null,
          external_url: profileData.externalUrl || null,
          followers_count: profileData.followersCount || 0,
          posts_count: profileData.postsCount || 0,
          is_business_account: profileData.isBusinessAccount || false,
          verified: profileData.verified || false,
          related_profiles: profileData.relatedProfiles ? 
            profileData.relatedProfiles.slice(0, 10).map((p: any) => ({
              username: p.username,
              full_name: p.fullName
            })) : [],
          latest_posts: profileData.latestPosts ?
            profileData.latestPosts.slice(0, 5).map((post: any) => ({
              id: post.id,
              type: post.type,
              timestamp: post.timestamp,
              caption: post.caption,
              likesCount: post.likesCount,
              commentsCount: post.commentsCount,
              videoViewCount: post.videoViewCount,
              alt: post.alt,
              locationName: post.locationName
            })) : [],
          scraped_at: new Date().toISOString()
        };

        // Upsert into instagram_company_data
        const { error: upsertError } = await supabase
          .from('instagram_company_data')
          .upsert(instagramCompanyData, { 
            onConflict: 'scraped_row_id',
            ignoreDuplicates: false 
          });

        if (upsertError) {
          console.error('Failed to upsert instagram_company_data:', upsertError);
          throw upsertError;
        }

        console.log('Stored Instagram data for:', profileData.username);

        // Update scraped_rows status
        await supabase
          .from('scraped_rows')
          .update({
            scrape_status: 'completed',
            scraped_at: new Date().toISOString()
          })
          .eq('id', scraped_row_id);

        // Update job stats (add $0.0027 per request)
        const { data: currentJob } = await supabase
          .from('scraping_jobs')
          .select('*')
          .eq('id', jobId)
          .single();

        if (currentJob) {
          const newProcessedRows = currentJob.processed_rows + 1;
          const newCost = parseFloat(currentJob.estimated_cost_usd) + 0.0027;
          
          await supabase
            .from('scraping_jobs')
            .update({
              processed_rows: newProcessedRows,
              total_pages_scraped: currentJob.total_pages_scraped + 1,
              estimated_cost_usd: newCost,
              status: newProcessedRows >= currentJob.total_rows ? 'completed' : 'processing'
            })
            .eq('id', jobId);

          console.log(`Job ${jobId}: ${newProcessedRows}/${currentJob.total_rows}, cost: $${newCost.toFixed(4)}`);
        }

      } catch (dbError) {
        console.error('Database operation failed:', dbError);
        
        // Mark row as failed
        await supabase
          .from('scraped_rows')
          .update({
            scrape_status: 'failed',
            scrape_error_message: dbError instanceof Error ? dbError.message : 'Database error',
            scraped_at: new Date().toISOString()
          })
          .eq('id', scraped_row_id);

        return new Response(
          JSON.stringify({ error: 'Failed to store data', details: dbError }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true,
        data: profileData 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Instagram scraper error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
