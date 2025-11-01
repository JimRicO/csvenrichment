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
  console.log(`[Find People] Searching in ${scrapedContent.length} characters of content`);
  
  // Comprehensive list of keywords to search for
  const keywords = [
    'team', 'our-team', 'meet-the-team', 'meet-our-team',
    'people', 'our-people',
    'staff', 'our-staff',
    'members', 'our-members',
    'founder', 'founders', 'our-founders',
    'about', 'about-us', 'aboutus', 'who-we-are',
    'company', 'our-company',
    'leadership', 'our-leadership',
    'management', 'our-management',
    'executive', 'executives',
    'contact', 'contact-us', 'contactus'
  ];

  // Pattern 1: Markdown links [text](url)
  const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/gi;
  let match;
  
  while ((match = markdownLinkRegex.exec(scrapedContent)) !== null) {
    const linkText = match[1].toLowerCase();
    const linkUrl = match[2];
    
    // Check if link text or URL contains any of our keywords
    for (const keyword of keywords) {
      if (linkText.includes(keyword) || linkUrl.toLowerCase().includes(keyword)) {
        try {
          const url = new URL(linkUrl, baseUrl);
          console.log(`[Find People] Found via markdown link: ${url.href} (text: "${match[1]}")`);
          return url.href;
        } catch (e) {
          continue;
        }
      }
    }
  }

  // Pattern 2: HTML href attributes
  const hrefRegex = /href=["']([^"']+)["'][^>]*>([^<]*)</gi;
  
  while ((match = hrefRegex.exec(scrapedContent)) !== null) {
    const linkUrl = match[1];
    const linkText = match[2].toLowerCase();
    
    for (const keyword of keywords) {
      if (linkText.includes(keyword) || linkUrl.toLowerCase().includes(keyword)) {
        try {
          const url = new URL(linkUrl, baseUrl);
          console.log(`[Find People] Found via HTML href: ${url.href}`);
          return url.href;
        } catch (e) {
          continue;
        }
      }
    }
  }

  // Pattern 3: Look for URLs in plain text that contain keywords
  const urlRegex = /(https?:\/\/[^\s]+|\/[a-zA-Z0-9\-_\/]+)/gi;
  
  while ((match = urlRegex.exec(scrapedContent)) !== null) {
    const potentialUrl = match[1];
    
    for (const keyword of keywords) {
      if (potentialUrl.toLowerCase().includes(keyword)) {
        try {
          const url = new URL(potentialUrl, baseUrl);
          console.log(`[Find People] Found via plain text URL: ${url.href}`);
          return url.href;
        } catch (e) {
          continue;
        }
      }
    }
  }

  console.log('[Find People] No team/about page URL found after comprehensive search');
  console.log(`[Find People] Sample content: ${scrapedContent.substring(0, 500)}...`);
  return null;
}
