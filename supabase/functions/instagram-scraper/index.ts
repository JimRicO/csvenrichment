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
    const { url } = await req.json();
    
    if (!url) {
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

    // Extract username from URL
    let username = url;
    if (url.includes('instagram.com/')) {
      const match = url.match(/instagram\.com\/([^\/\?]+)/);
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
    if (results.length > 0) {
      console.log('Full profile data:', JSON.stringify(results[0], null, 2));
    }

    return new Response(
      JSON.stringify({ data: results[0] || null }),
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
