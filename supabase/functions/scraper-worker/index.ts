import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Patterns to identify relevant subpages for comprehensive scraping
const RELEVANT_PAGE_PATTERNS = [
  // Contact pages
  /\/(contact|kontakt|contacto|get-in-touch|reach-us|enquiry|enquiries)/i,
  // Location pages  
  /\/(locations?|find-a-club|clubs?|branches|stores|find-us|venues?|facilities|centers?|centres?)/i,
  // About pages
  /\/(about|about-us|who-we-are|our-story|company|info)/i,
  // Team pages
  /\/(team|our-team|staff|people|leadership|meet-the-team|coaches?|instructors?)/i,
  // Membership/pricing pages (often have contact info)
  /\/(membership|pricing|prices|rates|join|join-us)/i,
];

// Filter discovered URLs for relevant subpages
function filterRelevantUrls(urls: string[], baseUrl: string): string[] {
  try {
    const base = new URL(baseUrl);
    const relevantUrls: string[] = [];
    
    for (const url of urls) {
      try {
        const u = new URL(url);
        // Same domain only
        if (u.hostname !== base.hostname) continue;
        // Skip homepage (we scrape it separately)
        if (u.pathname === '/' || u.pathname === '') continue;
        // Skip file downloads
        if (/\.(pdf|doc|docx|xls|xlsx|zip|png|jpg|jpeg|gif|svg)$/i.test(u.pathname)) continue;
        // Match patterns
        if (RELEVANT_PAGE_PATTERNS.some(p => p.test(u.pathname))) {
          relevantUrls.push(url);
        }
      } catch { 
        continue; 
      }
    }
    
    // Deduplicate and limit to 8 subpages
    return [...new Set(relevantUrls)].slice(0, 8);
  } catch {
    return [];
  }
}

// Extract social media links from discovered links
function extractSocialLinks(links: string[]): string[] {
  const socialPatterns = [
    /instagram\.com/i,
    /facebook\.com/i,
    /linkedin\.com/i,
    /twitter\.com|x\.com/i,
    /youtube\.com/i,
    /tiktok\.com/i,
    /whatsapp\.com|wa\.me/i,
  ];
  
  return links.filter(link => 
    socialPatterns.some(pattern => pattern.test(link))
  );
}

// Download and persist logo to storage
async function downloadAndPersistLogo(
  logoUrl: string,
  websiteUrl: string,
  supabase: any
): Promise<string | null> {
  try {
    console.log(`Downloading logo from: ${logoUrl}`);
    
    // Try HTTPS first, fallback to HTTP for SSL issues
    let response: Response | null = null;
    let finalUrl = logoUrl;
    
    try {
      response = await fetch(logoUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'image/*,*/*;q=0.8',
        },
      });
    } catch (httpsError) {
      console.log(`HTTPS failed for logo, trying HTTP: ${httpsError}`);
      if (logoUrl.startsWith('https://')) {
        finalUrl = logoUrl.replace('https://', 'http://');
        response = await fetch(finalUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'image/*,*/*;q=0.8',
          },
        });
      }
    }
    
    if (!response || !response.ok) {
      console.log(`Failed to download logo: ${response?.status || 'no response'}`);
      return null;
    }
    
    const contentType = response.headers.get('content-type') || 'image/png';
    const imageData = await response.arrayBuffer();
    
    // Determine file extension
    let ext = 'png';
    if (contentType.includes('jpeg') || contentType.includes('jpg')) ext = 'jpg';
    else if (contentType.includes('svg')) ext = 'svg';
    else if (contentType.includes('webp')) ext = 'webp';
    else if (contentType.includes('gif')) ext = 'gif';
    else if (contentType.includes('ico')) ext = 'ico';
    
    // Create storage path
    const hostname = new URL(websiteUrl).hostname.replace(/^www\./, '');
    const timestamp = Date.now();
    const storagePath = `${hostname}/logo-${timestamp}.${ext}`;
    
    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('brand-images')
      .upload(storagePath, imageData, {
        contentType,
        upsert: true,
      });
    
    if (uploadError) {
      console.error('Failed to upload logo to storage:', uploadError);
      return null;
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('brand-images')
      .getPublicUrl(storagePath);
    
    console.log(`Logo persisted to: ${urlData.publicUrl}`);
    return urlData.publicUrl;
  } catch (error) {
    console.error('Error persisting logo:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!firecrawlApiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Firecrawl API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find and lock one pending row to scrape (EXCLUDE Instagram jobs - they use instagram-worker)
    const { data: rows, error: queryError } = await supabase
      .from('scraped_rows')
      .select('*')
      .eq('scrape_status', 'pending')
      .not('job_id', 'like', 'IG%')
      .order('created_at', { ascending: true })
      .limit(1);
    
    if (queryError) {
      console.error('Query error:', queryError);
      return new Response(
        JSON.stringify({ error: 'Database query failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!rows || rows.length === 0) {
      console.log('No pending rows to scrape');
      return new Response(
        JSON.stringify({ message: 'No pending work' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const row = rows[0];
    
    // Immediately mark as processing to prevent other workers from picking it up
    const { error: lockError } = await supabase
      .from('scraped_rows')
      .update({ scrape_status: 'processing' })
      .eq('id', row.id)
      .eq('scrape_status', 'pending'); // Only update if still pending
    
    if (lockError) {
      console.error('Failed to lock row:', lockError);
      return new Response(
        JSON.stringify({ error: 'Failed to lock row' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting multi-page scrape for row ${row.id} - ${row.website_url}`);

    try {
      // Format URL
      let formattedUrl = row.website_url.trim();
      if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
        formattedUrl = `https://${formattedUrl}`;
      }

      // STEP 1: Map the website to discover all URLs
      console.log(`Mapping website: ${formattedUrl}`);
      const mapResponse = await fetch('https://api.firecrawl.dev/v1/map', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${firecrawlApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: formattedUrl,
          limit: 100, // Get up to 100 URLs for filtering
          includeSubdomains: false,
        }),
      });

      let discoveredUrls: string[] = [];
      let relevantSubpages: string[] = [];

      if (mapResponse.ok) {
        const mapData = await mapResponse.json();
        discoveredUrls = mapData.links || [];
        console.log(`Discovered ${discoveredUrls.length} URLs from map`);
        
        // STEP 2: Filter for relevant subpages
        relevantSubpages = filterRelevantUrls(discoveredUrls, formattedUrl);
        console.log(`Selected ${relevantSubpages.length} relevant subpages: ${relevantSubpages.join(', ')}`);
      } else {
        console.warn(`Map failed (${mapResponse.status}), proceeding with homepage only`);
      }

      // STEP 3: Scrape homepage + relevant subpages
      const pagesToScrape = [formattedUrl, ...relevantSubpages];
      const allContent: string[] = [];
      const allLinks: string[] = [];
      let totalCharacters = 0;

      for (const pageUrl of pagesToScrape) {
        console.log(`Scraping: ${pageUrl}`);
        
        const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${firecrawlApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: pageUrl,
            formats: ['markdown', 'links'],
            onlyMainContent: false, // Get full page to capture footer links
          }),
        });

        if (scrapeResponse.ok) {
          const scrapeData = await scrapeResponse.json();
          const pageContent = scrapeData.data?.markdown || scrapeData.markdown || '';
          const pageLinks = scrapeData.data?.links || scrapeData.links || [];
          
          // Add page marker and content
          const pagePath = new URL(pageUrl).pathname || '/';
          allContent.push(`\n\n## PAGE: ${pagePath} (${pageUrl})\n\n${pageContent}`);
          allLinks.push(...pageLinks);
          totalCharacters += pageContent.length;
          
          console.log(`Scraped ${pageUrl}: ${pageContent.length} chars, ${pageLinks.length} links`);
        } else {
          console.warn(`Failed to scrape ${pageUrl}: ${scrapeResponse.status}`);
        }
      }

      // STEP 4: Combine all content
      const combinedContent = allContent.join('\n\n---\n');
      const uniqueLinks = [...new Set(allLinks)];
      const socialLinks = extractSocialLinks(uniqueLinks);

      console.log(`Total content: ${combinedContent.length} chars from ${pagesToScrape.length} pages`);
      console.log(`Found ${socialLinks.length} social media links`);

      // STEP 5: Extract branding (logo) from homepage
      let logoUrl: string | null = null;
      let logoStorageUrl: string | null = null;

      try {
        console.log(`Extracting branding from: ${formattedUrl}`);
        const brandingResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${firecrawlApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: formattedUrl,
            formats: ['branding'],
          }),
        });

        if (brandingResponse.ok) {
          const brandingData = await brandingResponse.json();
          const branding = brandingData.data?.branding || brandingData.branding || {};
          
          // Extract logo URL from branding response
          logoUrl = branding.images?.logo || branding.logo || null;
          
          console.log(`Branding extracted, logo URL: ${logoUrl || 'not found'}`);
          
          // Persist logo to storage if found
          if (logoUrl) {
            logoStorageUrl = await downloadAndPersistLogo(logoUrl, formattedUrl, supabase);
          }
        } else {
          console.warn(`Branding extraction failed: ${brandingResponse.status}`);
        }
      } catch (brandingError) {
        console.error('Branding extraction error:', brandingError);
        // Continue without logo - non-critical failure
      }

      // Update row with scraped content and logo
      const { error: updateError } = await supabase
        .from('scraped_rows')
        .update({
          scraped_content: combinedContent,
          scrape_status: 'completed',
          scraped_at: new Date().toISOString(),
          pages_scraped: pagesToScrape.length,
          discovered_links: uniqueLinks,
          logo_url: logoUrl,
          logo_storage_url: logoStorageUrl,
        })
        .eq('id', row.id);

      if (updateError) {
        console.error('Failed to update row:', updateError);
        throw updateError;
      }

      // Update job statistics
      const { data: currentJob } = await supabase
        .from('scraping_jobs')
        .select('total_pages_scraped, total_characters_scraped')
        .eq('id', row.job_id)
        .single();

      if (currentJob) {
        await supabase
          .from('scraping_jobs')
          .update({
            total_pages_scraped: currentJob.total_pages_scraped + pagesToScrape.length,
            total_characters_scraped: currentJob.total_characters_scraped + totalCharacters,
          })
          .eq('id', row.job_id);
      }

      console.log(`Successfully completed multi-page scrape for ${row.website_url}`);

      return new Response(
        JSON.stringify({
          success: true,
          row_id: row.id,
          url: row.website_url,
          pages_scraped: pagesToScrape.length,
          characters_scraped: totalCharacters,
          social_links_found: socialLinks.length,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (scrapeError) {
      console.error('Scraping error:', scrapeError);
      
      // Mark row as failed (both scrape and extraction since we can't extract without content)
      await supabase
        .from('scraped_rows')
        .update({
          scrape_status: 'failed',
          scrape_error_message: scrapeError instanceof Error ? scrapeError.message : 'Unknown error',
          extraction_status: 'failed',
          extraction_error_message: 'Cannot extract - scraping failed',
        })
        .eq('id', row.id);
      
      // Update job to mark this row as processed (even though failed)
      const { data: currentJob } = await supabase
        .from('scraping_jobs')
        .select('processed_rows, total_rows')
        .eq('id', row.job_id)
        .single();
      
      if (currentJob) {
        const newProcessedRows = currentJob.processed_rows + 1;
        const isComplete = newProcessedRows >= currentJob.total_rows;
        
        await supabase
          .from('scraping_jobs')
          .update({
            processed_rows: newProcessedRows,
            status: isComplete ? 'completed' : 'processing',
          })
          .eq('id', row.job_id);
      }

      return new Response(
        JSON.stringify({
          success: false,
          row_id: row.id,
          error: scrapeError instanceof Error ? scrapeError.message : 'Scraping failed',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Worker error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
