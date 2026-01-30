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

    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('API extract-logo request:', { url });

    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    if (!FIRECRAWL_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format URL
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log('Extracting logo for URL:', formattedUrl);

    // Call Firecrawl with branding format
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: formattedUrl,
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
        JSON.stringify({ success: false, error: errorMessage }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('Firecrawl branding response received');

    const branding = data?.data?.branding;
    const logoUrl = branding?.images?.logo;

    if (!logoUrl) {
      return new Response(
        JSON.stringify({ success: false, error: 'No logo found on this website' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Logo URL found:', logoUrl);

    // Initialize Supabase client for storage
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Download and persist the logo
    let persistedLogoUrl = logoUrl;
    
    try {
      console.log('Downloading logo from:', logoUrl);
      
      let imageResponse;
      try {
        imageResponse = await fetch(logoUrl, {
          headers: { 
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
      } catch (sslError) {
        const errorMsg = sslError instanceof Error ? sslError.message : String(sslError);
        console.log('HTTPS failed, trying HTTP:', errorMsg);
        const httpUrl = logoUrl.replace('https://', 'http://');
        imageResponse = await fetch(httpUrl, {
          headers: { 
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
      }
      
      if (imageResponse.ok) {
        const imageBlob = await imageResponse.blob();
        console.log('Downloaded blob size:', imageBlob.size, 'bytes');
        
        const contentType = imageResponse.headers.get('content-type') || 'image/png';
        let fileExt = 'png';
        if (contentType.includes('svg')) fileExt = 'svg';
        else if (contentType.includes('jpeg') || contentType.includes('jpg')) fileExt = 'jpg';
        else if (contentType.includes('png')) fileExt = 'png';
        else if (contentType.includes('webp')) fileExt = 'webp';
        else if (contentType.includes('gif')) fileExt = 'gif';
        
        const hostname = new URL(formattedUrl).hostname.replace(/\./g, '-');
        const fileName = `${hostname}/logo-${Date.now()}.${fileExt}`;
        
        console.log('Uploading to storage as:', fileName);
        const { error: uploadError } = await supabase.storage
          .from('brand-images')
          .upload(fileName, imageBlob, {
            contentType,
            upsert: true,
            cacheControl: '3600'
          });

        if (uploadError) {
          console.error('Storage upload error:', uploadError);
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('brand-images')
            .getPublicUrl(fileName);
          
          persistedLogoUrl = publicUrl;
          console.log('Logo successfully uploaded to:', persistedLogoUrl);
        }
      } else {
        console.error('Failed to download logo, status:', imageResponse.status);
      }
    } catch (err) {
      console.error('Error persisting logo:', err);
      // Continue with original URL if persistence fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        logo_url: persistedLogoUrl,
        source_url: formattedUrl,
        extracted_at: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in api-extract-logo function:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
