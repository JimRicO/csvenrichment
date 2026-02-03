import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EnrichmentRow {
  id: string;
  job_id: string;
  club_name: string;
  website_url: string;
  instagram_handle: string | null;
  status: string;
}

interface PerplexityResult {
  content: string;
  citations: string[];
}

interface DiscoveredSocialData {
  website_url: string | null;
  instagram_handle: string | null;
  facebook_url: string | null;
  twitter_handle: string | null;
  linkedin_url: string | null;
}

async function searchPerplexity(query: string, apiKey: string): Promise<PerplexityResult> {
  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          { role: 'system', content: 'Be precise and concise. Provide factual information only.' },
          { role: 'user', content: query }
        ],
      }),
    });

    if (!response.ok) {
      console.error(`Perplexity API error: ${response.status}`);
      return { content: '', citations: [] };
    }

    const data = await response.json();
    return {
      content: data.choices?.[0]?.message?.content || '',
      citations: data.citations || []
    };
  } catch (error) {
    console.error('Perplexity search error:', error);
    return { content: '', citations: [] };
  }
}

// ========== SOCIAL MEDIA DISCOVERY FUNCTION ==========
async function discoverSocialMedia(clubName: string, apiKey: string): Promise<DiscoveredSocialData> {
  console.log(`Discovering social media for: ${clubName}`);
  
  const result: DiscoveredSocialData = {
    website_url: null,
    instagram_handle: null,
    facebook_url: null,
    twitter_handle: null,
    linkedin_url: null
  };

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          { 
            role: 'system', 
            content: 'You are a research assistant that finds official websites and social media profiles for businesses. Return ONLY valid JSON, no other text.' 
          },
          { 
            role: 'user', 
            content: `Find the official website and social media accounts for "${clubName}". 
            
Search for their:
- Official website URL
- Instagram handle or URL
- Facebook page URL
- Twitter/X handle or URL
- LinkedIn company page URL

Return ONLY this JSON format:
{
  "website_url": "https://example.com" or null,
  "instagram": "@handle" or "https://instagram.com/handle" or null,
  "facebook": "https://facebook.com/pagename" or null,
  "twitter": "@handle" or "https://x.com/handle" or null,
  "linkedin": "https://linkedin.com/company/name" or null
}`
          }
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'social_discovery',
            schema: {
              type: 'object',
              properties: {
                website_url: { type: ['string', 'null'] },
                instagram: { type: ['string', 'null'] },
                facebook: { type: ['string', 'null'] },
                twitter: { type: ['string', 'null'] },
                linkedin: { type: ['string', 'null'] }
              }
            }
          }
        }
      }),
    });

    if (!response.ok) {
      console.error(`Social discovery API error: ${response.status}`);
      return result;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const citations = data.citations || [];

    // Try to parse JSON response
    let parsed: any = null;
    try {
      parsed = JSON.parse(content);
    } catch {
      // Try to extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch {
          console.log('Could not parse social discovery JSON');
        }
      }
    }

    if (parsed) {
      result.website_url = parsed.website_url || null;
      
      // Normalize Instagram handle
      if (parsed.instagram) {
        const igMatch = parsed.instagram.match(/instagram\.com\/([^\/?]+)/);
        if (igMatch) {
          result.instagram_handle = `@${igMatch[1]}`;
        } else if (parsed.instagram.startsWith('@')) {
          result.instagram_handle = parsed.instagram;
        } else {
          result.instagram_handle = `@${parsed.instagram}`;
        }
      }
      
      result.facebook_url = parsed.facebook || null;
      
      // Normalize Twitter handle
      if (parsed.twitter) {
        const twMatch = parsed.twitter.match(/(?:twitter\.com|x\.com)\/([^\/?]+)/);
        if (twMatch) {
          result.twitter_handle = `@${twMatch[1]}`;
        } else if (parsed.twitter.startsWith('@')) {
          result.twitter_handle = parsed.twitter;
        } else {
          result.twitter_handle = `@${parsed.twitter}`;
        }
      }
      
      result.linkedin_url = parsed.linkedin || null;
    }

    // Fallback: Extract URLs directly from citations
    if (citations.length > 0) {
      for (const citation of citations) {
        if (!result.facebook_url && citation.includes('facebook.com/')) {
          result.facebook_url = citation;
        }
        if (!result.linkedin_url && citation.includes('linkedin.com/company/')) {
          result.linkedin_url = citation;
        }
        if (!result.instagram_handle && citation.includes('instagram.com/')) {
          const igMatch = citation.match(/instagram\.com\/([^\/?]+)/);
          if (igMatch) {
            result.instagram_handle = `@${igMatch[1]}`;
          }
        }
        if (!result.twitter_handle && (citation.includes('twitter.com/') || citation.includes('x.com/'))) {
          const twMatch = citation.match(/(?:twitter\.com|x\.com)\/([^\/?]+)/);
          if (twMatch) {
            result.twitter_handle = `@${twMatch[1]}`;
          }
        }
        // Try to get website from non-social citations
        if (!result.website_url && 
            !citation.includes('facebook.com') && 
            !citation.includes('instagram.com') && 
            !citation.includes('twitter.com') && 
            !citation.includes('x.com') && 
            !citation.includes('linkedin.com') &&
            !citation.includes('yelp.com') &&
            !citation.includes('tripadvisor.com') &&
            citation.startsWith('https://')) {
          result.website_url = citation;
        }
      }
    }

    console.log(`Social discovery results: website=${result.website_url}, instagram=${result.instagram_handle}, facebook=${result.facebook_url}, twitter=${result.twitter_handle}, linkedin=${result.linkedin_url}`);
    return result;

  } catch (error) {
    console.error('Social discovery error:', error);
    return result;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { job_id } = await req.json();

    if (!job_id) {
      return new Response(
        JSON.stringify({ error: 'job_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Enrichment worker starting for job: ${job_id}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get API keys
    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    const APIFY_API_TOKEN = Deno.env.get('APIFY_API_TOKEN');
    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');

    if (!FIRECRAWL_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'FIRECRAWL_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find a pending row to process
    const { data: pendingRow, error: rowError } = await supabase
      .from('enrichment_rows')
      .select('*')
      .eq('job_id', job_id)
      .eq('status', 'pending')
      .limit(1)
      .single();

    if (rowError || !pendingRow) {
      console.log('No pending rows found for job:', job_id);
      return new Response(
        JSON.stringify({ message: 'No pending rows to process', job_id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const row = pendingRow as EnrichmentRow;
    console.log(`Processing row: ${row.id}, club: ${row.club_name}`);

    // Lock the row by setting status to processing
    await supabase
      .from('enrichment_rows')
      .update({ status: 'processing' })
      .eq('id', row.id);

    let totalCost = 0;
    let scrapedContent = '';
    let brandingData: any = null;
    let instagramData: any = null;
    let aiAnalysis: any = null;
    let perplexityData: { description: PerplexityResult; founder: PerplexityResult; news: PerplexityResult; leadership: PerplexityResult } | null = null;
    
    // Initialize discovered social data
    let discoveredSocial: DiscoveredSocialData = {
      website_url: null,
      instagram_handle: null,
      facebook_url: null,
      twitter_handle: null,
      linkedin_url: null
    };

    try {
      // ========== STEP 0: Social Media Discovery ==========
      console.log('Step 0: Discovering social media presence...');
      if (PERPLEXITY_API_KEY) {
        discoveredSocial = await discoverSocialMedia(row.club_name, PERPLEXITY_API_KEY);
        totalCost += 0.005; // Perplexity sonar query
        
        // Enhance input data with discovered values
        if (!row.website_url || row.website_url === 'https://placeholder.com' || row.website_url === '') {
          if (discoveredSocial.website_url) {
            console.log(`Using discovered website URL: ${discoveredSocial.website_url}`);
            row.website_url = discoveredSocial.website_url;
          }
        }
        if (!row.instagram_handle && discoveredSocial.instagram_handle) {
          console.log(`Using discovered Instagram handle: ${discoveredSocial.instagram_handle}`);
          row.instagram_handle = discoveredSocial.instagram_handle;
        }
      } else {
        console.log('Step 0: Skipping social discovery (no Perplexity API key)');
      }
      // ========== STEP 1: Website Scrape (Firecrawl markdown) ==========
      console.log('Step 1: Scraping website content...');
      try {
        const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: row.website_url,
            formats: ['markdown'],
            onlyMainContent: true,
            waitFor: 2000
          }),
        });

        if (scrapeResponse.ok) {
          const scrapeData = await scrapeResponse.json();
          scrapedContent = scrapeData?.data?.markdown || '';
          console.log(`Scraped ${scrapedContent.length} characters of content`);
          totalCost += 0.001; // Firecrawl credit
        } else {
          console.error('Website scrape failed:', scrapeResponse.status);
        }
      } catch (scrapeError) {
        console.error('Website scrape error:', scrapeError);
      }

      // ========== STEP 2: Branding Extraction (Firecrawl branding) ==========
      console.log('Step 2: Extracting branding...');
      let logoStorageUrl: string | null = null;
      try {
        const brandingResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: row.website_url,
            formats: ['branding'],
            waitFor: 2000
          }),
        });

        if (brandingResponse.ok) {
          const brandingResult = await brandingResponse.json();
          brandingData = brandingResult?.data?.branding || null;
          console.log('Branding data extracted:', brandingData ? 'yes' : 'no');
          totalCost += 0.001; // Firecrawl credit

          // Download and persist logo
          if (brandingData?.images?.logo) {
            try {
              const logoUrl = brandingData.images.logo;
              console.log('Downloading logo from:', logoUrl);
              
              let imageResponse;
              try {
                imageResponse = await fetch(logoUrl, {
                  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
                });
              } catch {
                // Try HTTP if HTTPS fails
                const httpUrl = logoUrl.replace('https://', 'http://');
                imageResponse = await fetch(httpUrl, {
                  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
                });
              }

              if (imageResponse.ok) {
                const imageBlob = await imageResponse.blob();
                const contentType = imageResponse.headers.get('content-type') || 'image/png';
                let fileExt = 'png';
                if (contentType.includes('svg')) fileExt = 'svg';
                else if (contentType.includes('jpeg') || contentType.includes('jpg')) fileExt = 'jpg';
                else if (contentType.includes('webp')) fileExt = 'webp';

                const hostname = new URL(row.website_url).hostname.replace(/\./g, '-');
                const fileName = `${hostname}/logo-${Date.now()}.${fileExt}`;

                const { error: uploadError } = await supabase.storage
                  .from('brand-images')
                  .upload(fileName, imageBlob, { contentType, upsert: true });

                if (!uploadError) {
                  const { data: { publicUrl } } = supabase.storage
                    .from('brand-images')
                    .getPublicUrl(fileName);
                  logoStorageUrl = publicUrl;
                  console.log('Logo stored at:', logoStorageUrl);
                }
              }
            } catch (logoError) {
              console.error('Logo download error:', logoError);
            }
          }
        } else {
          console.error('Branding extraction failed:', brandingResponse.status);
        }
      } catch (brandingError) {
        console.error('Branding extraction error:', brandingError);
      }

      // ========== STEP 3: Instagram Scrape (Apify) ==========
      let instagramProfilePicUrl: string | null = null;
      let instagramFollowers: number | null = null;
      let instagramBio: string | null = null;
      let instagramHandle: string | null = row.instagram_handle;

      if (row.instagram_handle && APIFY_API_TOKEN) {
        console.log('Step 3: Scraping Instagram...');
        try {
          // Extract username from handle
          let username = row.instagram_handle;
          if (username.startsWith('@')) {
            username = username.substring(1);
          }
          if (username.includes('instagram.com/')) {
            const match = username.match(/instagram\.com\/([^\/\?]+)/);
            if (match) username = match[1];
          }
          instagramHandle = `@${username}`;

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

          if (runResponse.ok) {
            const runData = await runResponse.json();
            const runId = runData.data.id;
            const datasetId = runData.data.defaultDatasetId;

            // Poll for completion
            let status = 'RUNNING';
            let attempts = 0;
            await new Promise(resolve => setTimeout(resolve, 3000));

            while (status === 'RUNNING' && attempts < 20) {
              const statusResponse = await fetch(
                `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_API_TOKEN}`
              );
              if (statusResponse.ok) {
                const statusData = await statusResponse.json();
                status = statusData.data.status;
              }
              if (status === 'RUNNING') {
                await new Promise(resolve => setTimeout(resolve, 3000));
                attempts++;
              }
            }

            if (status === 'SUCCEEDED') {
              const resultsResponse = await fetch(
                `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_API_TOKEN}`
              );
              if (resultsResponse.ok) {
                const results = await resultsResponse.json();
                if (results.length > 0) {
                  instagramData = results[0];
                  instagramFollowers = instagramData.followersCount;
                  instagramBio = instagramData.biography;
                  console.log('Instagram data fetched for:', instagramData.username);

                  // Download and persist profile picture
                  const profilePicUrl = instagramData.profilePicUrlHD || instagramData.profilePicUrl;
                  if (profilePicUrl) {
                    try {
                      const picResponse = await fetch(profilePicUrl, {
                        headers: {
                          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                          'Referer': 'https://www.instagram.com/'
                        }
                      });
                      if (picResponse.ok) {
                        const picBuffer = await picResponse.arrayBuffer();
                        const picContentType = picResponse.headers.get('content-type') || 'image/jpeg';
                        const picExt = picContentType.includes('png') ? 'png' : 'jpg';
                        const picFileName = `${username}_${Date.now()}.${picExt}`;

                        const { error: picUploadError } = await supabase.storage
                          .from('instagram-profile-pics')
                          .upload(picFileName, picBuffer, { contentType: picContentType, upsert: true });

                        if (!picUploadError) {
                          const { data: picPublicUrl } = supabase.storage
                            .from('instagram-profile-pics')
                            .getPublicUrl(picFileName);
                          instagramProfilePicUrl = picPublicUrl.publicUrl;
                          console.log('Instagram profile pic stored');
                        }
                      }
                    } catch (picError) {
                      console.error('Instagram profile pic error:', picError);
                    }
                  }
                  totalCost += 0.003; // Apify cost
                }
              }
            }
          }
        } catch (igError) {
          console.error('Instagram scrape error:', igError);
        }
      } else {
        console.log('Step 3: Skipping Instagram (no handle provided or no API token)');
      }

      // ========== STEP 4: Perplexity Web Search ==========
      let allCitations: string[] = [];
      
      if (PERPLEXITY_API_KEY) {
        console.log('Step 4: Running Perplexity web searches...');
        try {
          // Run 4 parallel searches for speed
          const [descriptionResult, founderResult, newsResult, leadershipResult] = await Promise.all([
            searchPerplexity(`What is ${row.club_name}? Provide a brief description of this business/club.`, PERPLEXITY_API_KEY),
            searchPerplexity(`${row.club_name} founder history background origin story. Who founded it and when?`, PERPLEXITY_API_KEY),
            searchPerplexity(`${row.club_name} recent news events activities 2025 2024. What have they done recently?`, PERPLEXITY_API_KEY),
            searchPerplexity(`${row.club_name} owner CEO management team leadership key people principal director. Who runs or owns it?`, PERPLEXITY_API_KEY)
          ]);

          perplexityData = {
            description: descriptionResult,
            founder: founderResult,
            news: newsResult,
            leadership: leadershipResult
          };

          // Collect all unique citations
          allCitations = [...new Set([
            ...descriptionResult.citations,
            ...founderResult.citations,
            ...newsResult.citations,
            ...leadershipResult.citations
          ])];

          console.log(`Perplexity searches completed. Found ${allCitations.length} citations.`);
          totalCost += 0.025; // ~$0.005-0.01 per search x 4
        } catch (perplexityError) {
          console.error('Perplexity search error:', perplexityError);
        }
      } else {
        console.log('Step 4: Skipping Perplexity (no API key configured)');
      }

      // ========== STEP 5: AI Analysis (Claude Sonnet 4.5) ==========
      console.log('Step 5: Running AI analysis...');
      try {
        const colorPalette = brandingData?.colors || {};
        const fonts = brandingData?.fonts || [];

        const instagramCaptions = instagramData?.latestPosts
          ?.slice(0, 5)
          ?.map((p: any) => p.caption)
          ?.filter(Boolean)
          ?.join('\n---\n') || 'No Instagram posts available';

        // Build Perplexity context if available
        let perplexityContext = '';
        if (perplexityData) {
          perplexityContext = `
PERPLEXITY WEB RESEARCH:

Business Description (from web search):
${perplexityData.description.content || 'No description found'}

Founder & History (from web search):
${perplexityData.founder.content || 'No founder information found'}

Recent News & Activities (from web search):
${perplexityData.news.content || 'No recent news found'}

Leadership & Key People (from web search):
${perplexityData.leadership?.content || 'No leadership information found'}
`;
        }

        const aiPrompt = `Analyze this club/fitness business based on their website content, Instagram presence, and web research.

WEBSITE CONTENT:
${scrapedContent.substring(0, 8000) || 'No website content available'}

INSTAGRAM DATA:
- Username: ${instagramHandle || 'N/A'}
- Bio: ${instagramBio || 'N/A'}
- Followers: ${instagramFollowers || 'N/A'}
- Recent post captions:
${instagramCaptions}

BRANDING:
- Color scheme: ${brandingData?.colorScheme || 'unknown'}
- Primary color: ${colorPalette.primary || 'unknown'}
- Fonts: ${fonts.map((f: any) => f.family).join(', ') || 'unknown'}
${perplexityContext}

Generate the following in JSON format:

1. DESCRIPTION (2-3 sentences): A concise description of what this club offers and who it serves.

2. ATTITUDE (2-3 sentences): The brand's personality and voice. Consider tone, values, communication style, and positioning.

3. AESTHETICS (2-3 sentences): Their visual style. Consider color mood, design style, and overall visual impression.

4. PERPLEXITY_DESCRIPTION (2-3 sentences): A factual business description synthesized from the web research. If no web research is available, return null.

5. FOUNDER_INFO (2-4 sentences): Information about the founder(s), their background, and how/why they started the business. If unknown, return null.

6. FOUNDING_YEAR (string): The year the business was founded. Just the year like "2015" or a range like "2014-2015". If unknown, return null.

7. RECENT_ACTIVITIES (array): Up to 5 recent activities, events, or news items. Each should have a "title" (brief description) and optional "date" (if mentioned). If none found, return empty array.

8. KEY_PEOPLE (array): Key individuals associated with the business - owners, principals, co-owners, CEO, directors, general managers, head coaches, or other leadership. For each person include:
   - "name": Full name
   - "role": Their position/title (e.g., "Owner", "CEO", "Co-Founder", "General Manager", "Head Coach")
   - "context": Brief context about them (1-2 sentences, e.g., background, how long they've been there, relevant experience)
   If no key people found, return empty array.

9. SOCIAL_MEDIA (object): Extract any social media links found. Include:
   - "facebook_url": Full Facebook page URL (e.g., "https://facebook.com/clubname") or null
   - "twitter_handle": Twitter/X handle with @ (e.g., "@clubname") or full URL, or null
   - "linkedin_url": Full LinkedIn company page URL or null
   If none found, return object with null values.

Return ONLY valid JSON in this exact format:
{
  "description": "...",
  "attitude": "...",
  "aesthetics": "...",
  "perplexity_description": "..." or null,
  "founder_info": "..." or null,
  "founding_year": "..." or null,
  "recent_activities": [{"title": "...", "date": "..."}] or [],
  "key_people": [{"name": "...", "role": "...", "context": "..."}] or [],
  "social_media": {"facebook_url": null, "twitter_handle": null, "linkedin_url": null}
}`;

        const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-5',
            max_tokens: 2048,
            messages: [{ role: 'user', content: aiPrompt }]
          })
        });

        if (claudeResponse.ok) {
          const claudeResult = await claudeResponse.json();
          const responseText = claudeResult.content[0].text;
          
          // Parse JSON from response
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            aiAnalysis = JSON.parse(jsonMatch[0]);
            console.log('AI analysis completed');
          }
          totalCost += 0.004; // Estimated Claude cost (slightly higher due to more output)
        } else {
          console.error('Claude API error:', claudeResponse.status);
        }
      } catch (aiError) {
        console.error('AI analysis error:', aiError);
      }

      // ========== STEP 6: Store Results ==========
      console.log('Step 6: Storing enriched data...');

      // Extract address, phone, email from scraped content or branding
      let address: string | null = null;
      let phone: string | null = null;
      let email: string | null = null;

      // Simple extraction patterns
      const emailMatch = scrapedContent.match(/[\w.-]+@[\w.-]+\.\w+/);
      if (emailMatch) email = emailMatch[0];

      const phoneMatch = scrapedContent.match(/\+?[\d\s()-]{10,}/);
      if (phoneMatch) phone = phoneMatch[0].trim();

      // Build Instagram URL from handle
      let instagramUrl: string | null = null;
      if (instagramHandle) {
        const cleanHandle = instagramHandle.replace('@', '');
        instagramUrl = `https://instagram.com/${cleanHandle}`;
      }

      // Extract social media from AI analysis
      const socialMedia = aiAnalysis?.social_media || {};

      const { error: insertError } = await supabase
        .from('enriched_clubs')
        .insert({
          job_id: row.job_id,
          enrichment_row_id: row.id,
          club_name: row.club_name,
          website_url: row.website_url,
          instagram_handle: instagramHandle,
          instagram_url: instagramUrl,
          logo_storage_url: logoStorageUrl,
          instagram_followers: instagramFollowers,
          instagram_bio: instagramBio,
          instagram_profile_pic_url: instagramProfilePicUrl,
          address,
          phone,
          email,
          facebook_url: discoveredSocial.facebook_url || socialMedia.facebook_url || null,
          twitter_handle: discoveredSocial.twitter_handle || socialMedia.twitter_handle || null,
          linkedin_url: discoveredSocial.linkedin_url || socialMedia.linkedin_url || null,
          color_palette: brandingData?.colors || {},
          fonts: {
            primary: brandingData?.typography?.fontFamilies?.primary || null,
            heading: brandingData?.typography?.fontFamilies?.heading || null,
            list: brandingData?.fonts?.map((f: any) => f.family) || []
          },
          description: aiAnalysis?.description || null,
          attitude: aiAnalysis?.attitude || null,
          aesthetics: aiAnalysis?.aesthetics || null,
          perplexity_description: aiAnalysis?.perplexity_description || null,
          founder_info: aiAnalysis?.founder_info || null,
          founding_year: aiAnalysis?.founding_year || null,
          recent_activities: aiAnalysis?.recent_activities || [],
          key_people: aiAnalysis?.key_people || [],
          perplexity_citations: allCitations,
          raw_branding_data: brandingData || {},
          raw_instagram_data: instagramData || {},
          scraped_content: scrapedContent.substring(0, 50000) // Limit storage
        });

      if (insertError) {
        console.error('Failed to insert enriched club:', insertError);
        throw insertError;
      }

      // Mark row as completed
      await supabase
        .from('enrichment_rows')
        .update({ status: 'completed' })
        .eq('id', row.id);

      // Update job progress
      const { data: updatedJob } = await supabase
        .rpc('increment_enrichment_job_processed', {
          job_id_param: row.job_id,
          cost_increment: totalCost
        });

      console.log(`Enrichment completed for ${row.club_name}, cost: $${totalCost.toFixed(4)}`);

      return new Response(
        JSON.stringify({
          success: true,
          row_id: row.id,
          club_name: row.club_name,
          cost: totalCost,
          job_status: updatedJob?.[0] || null
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (processingError) {
      console.error('Processing error:', processingError);

      // Mark row as failed
      await supabase
        .from('enrichment_rows')
        .update({
          status: 'failed',
          error_message: processingError instanceof Error ? processingError.message : 'Unknown error'
        })
        .eq('id', row.id);

      // Still increment job progress for failed rows
      await supabase
        .rpc('increment_enrichment_job_processed', {
          job_id_param: row.job_id,
          cost_increment: totalCost
        });

      throw processingError;
    }

  } catch (error) {
    console.error('Error in enrichment-worker:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
