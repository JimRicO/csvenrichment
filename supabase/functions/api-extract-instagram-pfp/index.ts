import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate API key
    const apiKey = req.headers.get('x-api-key');
    const expectedApiKey = Deno.env.get('CRM_API_KEY');

    if (!apiKey || apiKey !== expectedApiKey) {
      console.error('Invalid or missing API key');
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized: Invalid API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { instagram_url, username } = await req.json();

    if (!instagram_url && !username) {
      return new Response(
        JSON.stringify({ success: false, error: 'Either instagram_url or username is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build Instagram URL from username if only username provided
    let instagramUrl = instagram_url;
    let extractedUsername = username;
    
    if (!instagramUrl && username) {
      instagramUrl = `https://www.instagram.com/${username}`;
    }
    
    // Extract username from URL if provided
    if (instagramUrl && !extractedUsername) {
      const match = instagramUrl.match(/instagram\.com\/([^\/\?]+)/);
      if (match) {
        extractedUsername = match[1];
      }
    }

    console.log('API extract-instagram-pfp request:', { instagramUrl, extractedUsername });

    const APIFY_API_TOKEN = Deno.env.get('APIFY_API_TOKEN');
    if (!APIFY_API_TOKEN) {
      return new Response(
        JSON.stringify({ success: false, error: 'Apify API token not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Starting Instagram scrape for username:', extractedUsername);

    // Start Apify actor run
    const runResponse = await fetch(
      `https://api.apify.com/v2/acts/apify~instagram-profile-scraper/runs?token=${APIFY_API_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usernames: [extractedUsername],
          resultsLimit: 1, // Only need profile data for PFP
        }),
      }
    );

    if (!runResponse.ok) {
      const errorText = await runResponse.text();
      console.error('Apify run start failed:', runResponse.status, errorText);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to start Instagram scraping' }),
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
        JSON.stringify({ success: false, error: `Scraping ${status.toLowerCase()}` }),
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
        JSON.stringify({ success: false, error: 'Failed to fetch results' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = await resultsResponse.json();
    console.log('Results fetched:', results.length, 'profiles');
    
    if (results.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No profile data found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const profileData = results[0];
    const profilePicUrl = profileData.profilePicUrlHD || profileData.profilePicUrl;

    if (!profilePicUrl) {
      return new Response(
        JSON.stringify({ success: false, error: 'No profile picture found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Profile picture URL found:', profilePicUrl);

    // Initialize Supabase client for storage
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Download and persist the profile picture
    let persistedProfilePicUrl = profilePicUrl;
    
    try {
      console.log('Downloading profile picture from:', profilePicUrl);
      
      const imageResponse = await fetch(profilePicUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
          'Referer': 'https://www.instagram.com/'
        }
      });
      
      if (imageResponse.ok) {
        const imageBuffer = await imageResponse.arrayBuffer();
        const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
        const extension = contentType.includes('png') ? 'png' : 'jpg';
        const timestamp = Date.now();
        const fileName = `${profileData.username}_${timestamp}.${extension}`;
        
        console.log('Uploading profile picture to storage:', fileName, 'Size:', imageBuffer.byteLength);
        
        const { error: uploadError } = await supabase.storage
          .from('instagram-profile-pics')
          .upload(fileName, imageBuffer, {
            contentType,
            upsert: true
          });
        
        if (uploadError) {
          console.error('Failed to upload profile picture:', uploadError);
        } else {
          const { data: publicUrlData } = supabase.storage
            .from('instagram-profile-pics')
            .getPublicUrl(fileName);
          
          persistedProfilePicUrl = publicUrlData.publicUrl;
          console.log('Profile picture stored at:', persistedProfilePicUrl);
        }
      } else {
        console.error('Failed to download profile picture, status:', imageResponse.status);
      }
    } catch (err) {
      console.error('Error persisting profile picture:', err);
      // Continue with original URL if persistence fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        profile_pic_url: persistedProfilePicUrl,
        username: profileData.username,
        extracted_at: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in api-extract-instagram-pfp function:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
