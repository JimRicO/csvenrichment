import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import FirecrawlApp from "https://esm.sh/@mendable/firecrawl-js@1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Find one pending row to scrape
    const { data: row, error: queryError } = await supabase
      .from('scraped_rows')
      .select('*')
      .eq('scrape_status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (queryError) {
      console.error('Query error:', queryError);
      return new Response(
        JSON.stringify({ error: 'Database query failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // No pending work - exit gracefully
    if (!row) {
      console.log('No pending rows to scrape');
      return new Response(
        JSON.stringify({ message: 'No pending work' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Scraping row ${row.id} - ${row.website_url}`);

    // Scrape the website using Firecrawl
    const firecrawl = new FirecrawlApp({ apiKey: firecrawlApiKey });
    
    try {
      const scrapeResult = await firecrawl.scrapeUrl(row.website_url, {
        formats: ['markdown', 'html'],
        onlyMainContent: false,
      });

      if (!scrapeResult.success) {
        throw new Error(scrapeResult.error || 'Scraping failed');
      }

      // Store scraped content
      const content = scrapeResult.markdown || scrapeResult.html || '';
      const characterCount = content.length;

      // Update row with scraped content
      const { error: updateError } = await supabase
        .from('scraped_rows')
        .update({
          scraped_content: content,
          scrape_status: 'completed',
          scraped_at: new Date().toISOString(),
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
            total_pages_scraped: currentJob.total_pages_scraped + 1,
            total_characters_scraped: currentJob.total_characters_scraped + characterCount,
          })
          .eq('id', row.job_id);
      }

      console.log(`Successfully scraped ${row.website_url} (${characterCount} chars)`);

      return new Response(
        JSON.stringify({
          success: true,
          row_id: row.id,
          url: row.website_url,
          characters_scraped: characterCount,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (scrapeError) {
      console.error('Scraping error:', scrapeError);
      
      // Mark row as failed
      await supabase
        .from('scraped_rows')
        .update({
          scrape_status: 'failed',
          scrape_error_message: scrapeError instanceof Error ? scrapeError.message : 'Unknown error',
        })
        .eq('id', row.id);

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
