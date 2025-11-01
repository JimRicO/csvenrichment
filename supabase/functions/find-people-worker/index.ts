import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import FirecrawlApp from "https://esm.sh/@mendable/firecrawl-js@1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { row_id } = await req.json();
    console.log(`[Find People] Starting for row_id: ${row_id}`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the scraped row
    const { data: row, error } = await supabase
      .from('scraped_rows')
      .select('*')
      .eq('id', row_id)
      .single();

    if (error || !row) {
      console.error('[Find People] Row not found:', error);
      throw new Error('Row not found');
    }

    if (!row.scraped_content) {
      throw new Error('No scraped content available. Please scrape the homepage first.');
    }

    // Update status to processing
    await supabase
      .from('scraped_rows')
      .update({ people_search_status: 'processing' })
      .eq('id', row_id);

    console.log(`[Find People] Processing ${row.website_url}`);

    // Step 1: Parse homepage content to find team page URL
    const teamPageUrl = findTeamPageUrl(row.scraped_content, row.website_url);

    if (!teamPageUrl) {
      console.log('[Find People] No team page found in homepage content');
      await supabase
        .from('scraped_rows')
        .update({
          people_search_status: 'no_team_page_found',
          people_search_error: 'No team page link found on homepage',
          people_searched_at: new Date().toISOString()
        })
        .eq('id', row_id);

      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'No team page found on homepage' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Find People] Found team page: ${teamPageUrl}`);

    // Step 2: Scrape the team page
    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!firecrawlApiKey) {
      throw new Error('FIRECRAWL_API_KEY not configured');
    }

    const firecrawl = new FirecrawlApp({ apiKey: firecrawlApiKey });
    console.log(`[Find People] Scraping team page...`);

    const scrapeResult = await firecrawl.scrapeUrl(teamPageUrl, {
      formats: ['markdown'],
      onlyMainContent: false
    });

    if (!scrapeResult.success || !scrapeResult.markdown) {
      throw new Error('Failed to scrape team page');
    }

    console.log(`[Find People] Team page scraped, ${scrapeResult.markdown.length} characters`);

    // Step 3: Extract people with Claude
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicApiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    console.log('[Find People] Extracting team members with Claude...');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: `Extract all team members from this page. For each person, list their name and job title.

Format as a simple list, one person per line:
- Name (Title)
- Name (Title)

If no team members are found, respond with "No team members found on this page."

Page content:
${scrapeResult.markdown}

Extract team members:`
        }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Find People] Claude API error:', errorText);
      throw new Error(`Claude API error: ${response.status}`);
    }

    const claudeResult = await response.json();
    const detailedTeamMembers = claudeResult.content[0].text;

    console.log(`[Find People] Extracted team members: ${detailedTeamMembers.substring(0, 200)}...`);

    // Step 4: Update database
    await supabase
      .from('scraped_rows')
      .update({
        people_search_status: 'completed',
        team_page_url: teamPageUrl,
        detailed_team_members: detailedTeamMembers,
        people_searched_at: new Date().toISOString()
      })
      .eq('id', row_id);

    console.log(`[Find People] ✅ Success for ${row.website_url}`);

    return new Response(
      JSON.stringify({
        success: true,
        team_page_url: teamPageUrl,
        team_members: detailedTeamMembers
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Find People] Error:', error);
    
    // Try to update the database with error status
    try {
      const { row_id } = await req.json();
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      
      await supabase
        .from('scraped_rows')
        .update({
          people_search_status: 'failed',
          people_search_error: error instanceof Error ? error.message : 'Unknown error',
          people_searched_at: new Date().toISOString()
        })
        .eq('id', row_id);
    } catch (updateError) {
      console.error('[Find People] Failed to update error status:', updateError);
    }

    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    );
  }
});

// Helper function to find team page URL in scraped content
function findTeamPageUrl(scrapedContent: string, baseUrl: string): string | null {
  const teamPatterns = [
    // Markdown link patterns
    /\[.*?\]\((\/team[^)]*)\)/i,
    /\[.*?\]\((\/our-team[^)]*)\)/i,
    /\[.*?\]\((\/meet-the-team[^)]*)\)/i,
    /\[.*?\]\((\/people[^)]*)\)/i,
    /\[.*?\]\((\/staff[^)]*)\)/i,
    /\[.*?\]\((\/members[^)]*)\)/i,
    /\[.*?\]\((\/founders?[^)]*)\)/i,
    /\[.*?\]\((\/about[^)]*)\)/i,
    /\[.*?\]\((\/about-us[^)]*)\)/i,
    /\[.*?\]\((\/who-we-are[^)]*)\)/i,
    /\[.*?\]\((\/company[^)]*)\)/i,
    /\[.*?\]\((\/leadership[^)]*)\)/i,
    /\[.*?\]\((\/management[^)]*)\)/i,
    /\[.*?\]\((\/executive[^)]*)\)/i,
    /\[.*?\]\((\/contact[^)]*)\)/i,
    
    // HTML href patterns (in case HTML is in content)
    /href=["'](\/team[^"']*)["']/i,
    /href=["'](\/our-team[^"']*)["']/i,
    /href=["'](\/about[^"']*)["']/i,
    /href=["'](\/founders?[^"']*)["']/i,
    /href=["'](\/people[^"']*)["']/i,
    /href=["'](\/leadership[^"']*)["']/i,
  ];

  for (const pattern of teamPatterns) {
    const match = scrapedContent.match(pattern);
    if (match) {
      const path = match[1];
      try {
        const url = new URL(path, baseUrl);
        console.log(`[Find People] Found team page URL: ${url.href}`);
        return url.href;
      } catch (e) {
        console.error(`[Find People] Invalid URL construction: ${path}`, e);
        continue;
      }
    }
  }

  console.log('[Find People] No team page URL found in content');
  return null;
}
