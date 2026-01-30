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
    const { url, logoOnly = false } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Extract branding request:', { url, logoOnly });

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

    // Helper function to download and upload an image
    const processImage = async (key: string, imageUrl: string): Promise<string> => {
      try {
        console.log(`[${key}] Attempting to download from:`, imageUrl);
        
        let imageResponse;
        try {
          imageResponse = await fetch(imageUrl, {
            headers: { 
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });
        } catch (sslError) {
          const errorMsg = sslError instanceof Error ? sslError.message : String(sslError);
          console.log(`[${key}] HTTPS failed, trying HTTP:`, errorMsg);
          const httpUrl = imageUrl.replace('https://', 'http://');
          imageResponse = await fetch(httpUrl, {
            headers: { 
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });
        }
        
        if (!imageResponse.ok) {
          console.error(`[${key}] Failed to download, status:`, imageResponse.status);
          return imageUrl;
        }

        const imageBlob = await imageResponse.blob();
        console.log(`[${key}] Downloaded blob size:`, imageBlob.size, 'bytes');
        
        const contentType = imageResponse.headers.get('content-type') || 'image/png';
        let fileExt = 'png';
        if (contentType.includes('svg')) fileExt = 'svg';
        else if (contentType.includes('jpeg') || contentType.includes('jpg')) fileExt = 'jpg';
        else if (contentType.includes('png')) fileExt = 'png';
        else if (contentType.includes('webp')) fileExt = 'webp';
        else if (contentType.includes('gif')) fileExt = 'gif';
        
        const hostname = new URL(url).hostname.replace(/\./g, '-');
        const fileName = `${hostname}/${key}-${Date.now()}.${fileExt}`;
        
        console.log(`[${key}] Uploading to storage as:`, fileName);
        const { error: uploadError } = await supabase.storage
          .from('brand-images')
          .upload(fileName, imageBlob, {
            contentType,
            upsert: true,
            cacheControl: '3600'
          });

        if (uploadError) {
          console.error(`[${key}] Storage upload error:`, uploadError);
          return imageUrl;
        }
        
        const { data: { publicUrl } } = supabase.storage
          .from('brand-images')
          .getPublicUrl(fileName);
        
        console.log(`[${key}] ✓ Successfully uploaded to:`, publicUrl);
        return publicUrl;
      } catch (err) {
        console.error(`[${key}] Error processing image:`, err);
        return imageUrl;
      }
    };

    // Logo-only mode: just extract and return the logo
    if (logoOnly) {
      const logoUrl = branding.images?.logo;
      if (!logoUrl) {
        return new Response(
          JSON.stringify({ error: 'No logo found on this website' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const persistedLogoUrl = await processImage('logo', logoUrl);
      console.log('Logo-only extraction complete:', persistedLogoUrl);

      return new Response(
        JSON.stringify({
          success: true,
          logo: persistedLogoUrl,
          metadata: {
            url,
            timestamp: new Date().toISOString(),
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Full branding extraction mode
    const finalImages: Record<string, string> = {};
    let uploadedCount = 0;
    
    if (branding.images && typeof branding.images === 'object') {
      for (const [key, imageUrl] of Object.entries(branding.images)) {
        if (imageUrl && typeof imageUrl === 'string') {
          const persistedUrl = await processImage(key, imageUrl);
          finalImages[key] = persistedUrl;
          if (persistedUrl !== imageUrl) {
            uploadedCount++;
          }
        }
      }
    }

    console.log(`Successfully uploaded ${uploadedCount}/${Object.keys(finalImages).length} images`);

    const updatedBranding = {
      ...branding,
      images: finalImages
    };

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
          imagesUploaded: uploadedCount
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
