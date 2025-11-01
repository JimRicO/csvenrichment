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

    // Step 4: Parse team members and save to people table
    const peopleToInsert = [];
    const lines = detailedTeamMembers.split('\n').filter((line: string) => line.trim());
    
    for (const line of lines) {
      // Parse format: "- Name (Title)"
      const match = line.match(/^-?\s*(.+?)\s*\((.+?)\)\s*$/);
      if (match) {
        const [, name, title] = match;
        peopleToInsert.push({
          job_id: row.job_id,
          scraped_row_id: row_id,
          name: name.trim(),
          title: title.trim(),
          website_url: row.website_url,
          source: 'automated'
        });
      }
    }

    // Insert people into the database
    if (peopleToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('people')
        .insert(peopleToInsert);

      if (insertError) {
        console.error('[Find People] Error inserting people:', insertError);
        // Continue anyway, we'll still save the text version
      } else {
        console.log(`[Find People] Saved ${peopleToInsert.length} people to database`);
      }
    }

    // Step 5: Update scraped_rows with results
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
  
  // Prioritized list of keywords to search for (ordered by priority)
  const keywordGroups = [
    // High priority - most likely to have team info
    { keywords: ['about-us', 'about', 'team', 'our-team', 'meet-the-team', 'meet-our-team', 'story', 'our-story', 'ourstory'], priority: 1 },
    // Medium priority
    { keywords: ['people', 'our-people', 'staff', 'our-staff', 'leadership', 'our-leadership', 'who-we-are'], priority: 2 },
    // Lower priority
    { keywords: ['founder', 'founders', 'our-founders', 'management', 'our-management', 'executive', 'executives'], priority: 3 },
    // Lowest priority
    { keywords: ['company', 'our-company', 'contact', 'contact-us', 'contactus'], priority: 4 }
  ];
  
  const allMatches: Array<{ url: string; priority: number; keyword: string; context: string }> = [];

  // Helper function to check if a keyword matches in URL or text
  const matchesKeyword = (text: string, url: string, keyword: string): boolean => {
    const lowerText = text.toLowerCase();
    const lowerUrl = url.toLowerCase();
    
    // Check for exact segment match in URL path (e.g., "/about-us" or "/about-us/")
    const urlPath = lowerUrl.split('?')[0].split('#')[0];
    const segments = urlPath.split('/').filter(s => s.length > 0);
    if (segments.some(seg => seg === keyword || seg === keyword.replace(/-/g, ''))) {
      return true;
    }
    
    // Check for word boundary match in text
    const wordBoundaryRegex = new RegExp(`\\b${keyword.replace(/-/g, '[\\s-]?')}\\b`, 'i');
    if (wordBoundaryRegex.test(lowerText)) {
      return true;
    }
    
    return false;
  };

  // Pattern 1: Markdown links [text](url)
  const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/gi;
  let match;
  
  while ((match = markdownLinkRegex.exec(scrapedContent)) !== null) {
    const linkText = match[1];
    const linkUrl = match[2];
    
    // Check against all keyword groups
    for (const group of keywordGroups) {
      for (const keyword of group.keywords) {
        if (matchesKeyword(linkText, linkUrl, keyword)) {
          try {
            const url = new URL(linkUrl, baseUrl);
            allMatches.push({
              url: url.href,
              priority: group.priority,
              keyword,
              context: `markdown link: "${linkText}"`
            });
          } catch (e) {
            continue;
          }
        }
      }
    }
  }

  // Pattern 2: HTML href attributes
  const hrefRegex = /href=["']([^"']+)["'][^>]*>([^<]*)</gi;
  
  while ((match = hrefRegex.exec(scrapedContent)) !== null) {
    const linkUrl = match[1];
    const linkText = match[2];
    
    for (const group of keywordGroups) {
      for (const keyword of group.keywords) {
        if (matchesKeyword(linkText, linkUrl, keyword)) {
          try {
            const url = new URL(linkUrl, baseUrl);
            allMatches.push({
              url: url.href,
              priority: group.priority,
              keyword,
              context: `HTML href: "${linkText}"`
            });
          } catch (e) {
            continue;
          }
        }
      }
    }
  }

  // Pattern 3: Look for URLs in plain text that contain keywords
  const urlRegex = /(https?:\/\/[^\s]+|\/[a-zA-Z0-9\-_\/]+)/gi;
  
  while ((match = urlRegex.exec(scrapedContent)) !== null) {
    const potentialUrl = match[1];
    
    for (const group of keywordGroups) {
      for (const keyword of group.keywords) {
        if (matchesKeyword('', potentialUrl, keyword)) {
          try {
            const url = new URL(potentialUrl, baseUrl);
            allMatches.push({
              url: url.href,
              priority: group.priority,
              keyword,
              context: 'plain text URL'
            });
          } catch (e) {
            continue;
          }
        }
      }
    }
  }

  // If we found matches, return the highest priority one
  if (allMatches.length > 0) {
    // Sort by priority (lower number = higher priority), then by keyword specificity
    allMatches.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      // Prefer longer, more specific keywords
      return b.keyword.length - a.keyword.length;
    });

    const bestMatch = allMatches[0];
    console.log(`[Find People] Found ${allMatches.length} potential matches, selecting best:`);
    console.log(`[Find People] → ${bestMatch.url} (priority: ${bestMatch.priority}, keyword: "${bestMatch.keyword}", ${bestMatch.context})`);
    
    // Log other matches for debugging
    if (allMatches.length > 1) {
      console.log(`[Find People] Other matches found:`);
      allMatches.slice(1, 5).forEach(m => {
        console.log(`[Find People]   - ${m.url} (priority: ${m.priority}, keyword: "${m.keyword}")`);
      });
    }
    
    return bestMatch.url;
  }

  console.log('[Find People] No team/about page URL found after comprehensive search');
  console.log(`[Find People] Sample content: ${scrapedContent.substring(0, 500)}...`);
  return null;
}
