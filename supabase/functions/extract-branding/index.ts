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
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    if (!FIRECRAWL_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Firecrawl API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Extracting branding for URL:', url);

    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        formats: ['branding'],
        waitFor: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Firecrawl API error:', response.status, errorText);
      
      let errorMessage = 'Failed to extract branding';
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error || errorMessage;
      } catch {
        // If can't parse, use default message
      }
      
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('Firecrawl branding response:', JSON.stringify(data, null, 2));

    const branding = data?.data?.branding;
    console.log('Extracted branding:', branding);

    if (!branding) {
      return new Response(
        JSON.stringify({ error: 'No branding data found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Download and upload images to storage
    const uploadedImages: Record<string, string> = {};
    
    if (branding.images) {
      for (const [key, imageUrl] of Object.entries(branding.images)) {
        if (imageUrl && typeof imageUrl === 'string') {
          try {
            console.log(`Downloading ${key} from:`, imageUrl);
            const imageResponse = await fetch(imageUrl);
            if (imageResponse.ok) {
              const imageBlob = await imageResponse.blob();
              const fileExt = imageUrl.split('.').pop()?.split('?')[0] || 'png';
              const fileName = `${new URL(url).hostname}-${key}-${Date.now()}.${fileExt}`;
              
              console.log(`Uploading ${key} as:`, fileName);
              const { data: uploadData, error: uploadError } = await supabase.storage
                .from('brand-images')
                .upload(fileName, imageBlob, {
                  contentType: imageResponse.headers.get('content-type') || 'image/png',
                  upsert: false
                });

              if (uploadError) {
                console.error(`Error uploading ${key}:`, uploadError);
              } else {
                const { data: { publicUrl } } = supabase.storage
                  .from('brand-images')
                  .getPublicUrl(fileName);
                uploadedImages[key] = publicUrl;
                console.log(`Uploaded ${key} to:`, publicUrl);
              }
            } else {
              console.error(`Failed to download ${key}, status:`, imageResponse.status);
            }
          } catch (err) {
            console.error(`Error processing ${key}:`, err);
          }
        }
      }
    }

    // Replace image URLs with uploaded ones
    const updatedBranding = {
      ...branding,
      images: Object.keys(uploadedImages).length > 0 ? uploadedImages : branding.images
    };

    // Save to database
    const { error: dbError } = await supabase
      .from('visual_identity')
      .upsert({
        url,
        branding_data: updatedBranding,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'url'
      });

    if (dbError) {
      console.error('Error saving to database:', dbError);
    } else {
      console.log('Successfully saved branding data to database');
    }

    return new Response(
      JSON.stringify({
        success: true,
        branding: updatedBranding,
        metadata: {
          url,
          timestamp: new Date().toISOString(),
          imagesUploaded: Object.keys(uploadedImages).length
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in extract-branding function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
