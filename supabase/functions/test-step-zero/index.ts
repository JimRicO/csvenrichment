import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DiscoveredSocialData {
  website_url: string | null;
  instagram_handle: string | null;
  facebook_url: string | null;
  twitter_handle: string | null;
  linkedin_url: string | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { club_name } = await req.json();

    if (!club_name) {
      return new Response(
        JSON.stringify({ error: 'club_name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
    if (!PERPLEXITY_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'PERPLEXITY_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`=== STEP 0 TEST: Discovering social media for: ${club_name} ===`);

    const result: DiscoveredSocialData = {
      website_url: null,
      instagram_handle: null,
      facebook_url: null,
      twitter_handle: null,
      linkedin_url: null
    };

    // First Perplexity call - main discovery
    console.log('Making first Perplexity call...');
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          { 
            role: 'system', 
            content: 'You are a research assistant. Find and return business social media profiles. Always return valid JSON.' 
          },
          { 
            role: 'user', 
            content: `What is the official website and social media profiles for "${club_name}"?

I need:
1. Their official website URL
2. Their Instagram page (handle or full URL)
3. Their Facebook page URL
4. Their Twitter/X profile (handle or URL)
5. Their LinkedIn company page URL

Return a JSON object with these exact keys: website_url, instagram, facebook, twitter, linkedin. Use null if not found.`
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Perplexity API error: ${response.status} - ${errorText}`);
      return new Response(
        JSON.stringify({ error: `Perplexity API error: ${response.status}`, details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const citations = data.citations || [];

    console.log(`=== RAW RESPONSE ===`);
    console.log(`Content: ${content}`);
    console.log(`Citations: ${JSON.stringify(citations)}`);

    // Try to parse JSON from response
    let parsed: any = null;
    try {
      parsed = JSON.parse(content);
    } catch {
      const jsonMatch = content.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch {
          console.log('Could not parse JSON from content');
        }
      }
    }

    if (parsed) {
      console.log(`=== PARSED JSON ===`);
      console.log(JSON.stringify(parsed, null, 2));
      
      result.website_url = parsed.website_url || null;
      
      // Normalize Instagram handle
      if (parsed.instagram) {
        const igMatch = String(parsed.instagram).match(/instagram\.com\/([^\/?]+)/);
        if (igMatch) {
          result.instagram_handle = `@${igMatch[1]}`;
        } else if (String(parsed.instagram).startsWith('@')) {
          result.instagram_handle = parsed.instagram;
        } else if (parsed.instagram && parsed.instagram !== 'null') {
          result.instagram_handle = `@${String(parsed.instagram).replace('@', '')}`;
        }
      }
      
      result.facebook_url = parsed.facebook || null;
      
      // Normalize Twitter handle
      if (parsed.twitter) {
        const twMatch = String(parsed.twitter).match(/(?:twitter\.com|x\.com)\/([^\/?]+)/);
        if (twMatch) {
          result.twitter_handle = `@${twMatch[1]}`;
        } else if (String(parsed.twitter).startsWith('@')) {
          result.twitter_handle = parsed.twitter;
        } else if (parsed.twitter && parsed.twitter !== 'null') {
          result.twitter_handle = `@${String(parsed.twitter).replace('@', '')}`;
        }
      }
      
      result.linkedin_url = parsed.linkedin || null;
    }

    // Extract from citations
    console.log(`=== EXTRACTING FROM ${citations.length} CITATIONS ===`);
    for (const citation of citations) {
      const citationStr = String(citation);
      console.log(`Checking citation: ${citationStr}`);
      
      if (!result.facebook_url && citationStr.includes('facebook.com/')) {
        result.facebook_url = citationStr;
        console.log(`>>> Found Facebook: ${citationStr}`);
      }
      if (!result.linkedin_url && citationStr.includes('linkedin.com/company/')) {
        result.linkedin_url = citationStr;
        console.log(`>>> Found LinkedIn: ${citationStr}`);
      }
      if (!result.instagram_handle && citationStr.includes('instagram.com/')) {
        const igMatch = citationStr.match(/instagram\.com\/([^\/?]+)/);
        if (igMatch && igMatch[1] !== 'p' && igMatch[1] !== 'reel') {
          result.instagram_handle = `@${igMatch[1]}`;
          console.log(`>>> Found Instagram: @${igMatch[1]}`);
        }
      }
      if (!result.twitter_handle && (citationStr.includes('twitter.com/') || citationStr.includes('x.com/'))) {
        const twMatch = citationStr.match(/(?:twitter\.com|x\.com)\/([^\/?]+)/);
        if (twMatch && twMatch[1] !== 'i' && twMatch[1] !== 'status') {
          result.twitter_handle = `@${twMatch[1]}`;
          console.log(`>>> Found Twitter: @${twMatch[1]}`);
        }
      }
      if (!result.website_url && 
          !citationStr.includes('facebook.com') && 
          !citationStr.includes('instagram.com') && 
          !citationStr.includes('twitter.com') && 
          !citationStr.includes('x.com') && 
          !citationStr.includes('linkedin.com') &&
          !citationStr.includes('yelp.com') &&
          !citationStr.includes('tripadvisor.com') &&
          !citationStr.includes('google.com') &&
          !citationStr.includes('wikipedia.org') &&
          citationStr.startsWith('https://')) {
        result.website_url = citationStr;
        console.log(`>>> Found website: ${citationStr}`);
      }
    }

    // Second search if no socials found
    if (!result.instagram_handle && !result.facebook_url && !result.twitter_handle) {
      console.log('=== NO SOCIALS FOUND - DOING SECOND TARGETED SEARCH ===');
      const socialResponse = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'sonar',
          messages: [
            { role: 'user', content: `"${club_name}" instagram facebook twitter linkedin social media profiles` }
          ],
        }),
      });

      if (socialResponse.ok) {
        const socialData = await socialResponse.json();
        const socialCitations = socialData.citations || [];
        console.log(`Second search found ${socialCitations.length} citations`);
        
        for (const citation of socialCitations) {
          const citationStr = String(citation);
          console.log(`2nd search citation: ${citationStr}`);
          
          if (!result.facebook_url && citationStr.includes('facebook.com/') && !citationStr.includes('facebook.com/sharer')) {
            result.facebook_url = citationStr;
            console.log(`>>> Found Facebook in 2nd search: ${citationStr}`);
          }
          if (!result.linkedin_url && citationStr.includes('linkedin.com/company/')) {
            result.linkedin_url = citationStr;
            console.log(`>>> Found LinkedIn in 2nd search: ${citationStr}`);
          }
          if (!result.instagram_handle && citationStr.includes('instagram.com/')) {
            const igMatch = citationStr.match(/instagram\.com\/([^\/?]+)/);
            if (igMatch && igMatch[1] !== 'p' && igMatch[1] !== 'reel') {
              result.instagram_handle = `@${igMatch[1]}`;
              console.log(`>>> Found Instagram in 2nd search: @${igMatch[1]}`);
            }
          }
          if (!result.twitter_handle && (citationStr.includes('twitter.com/') || citationStr.includes('x.com/'))) {
            const twMatch = citationStr.match(/(?:twitter\.com|x\.com)\/([^\/?]+)/);
            if (twMatch && twMatch[1] !== 'i' && twMatch[1] !== 'status') {
              result.twitter_handle = `@${twMatch[1]}`;
              console.log(`>>> Found Twitter in 2nd search: @${twMatch[1]}`);
            }
          }
        }
      }
    }

    console.log(`=== FINAL RESULTS ===`);
    console.log(JSON.stringify(result, null, 2));

    return new Response(
      JSON.stringify({
        club_name,
        raw_content: content,
        raw_citations: citations,
        parsed_json: parsed,
        final_result: result
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Step 0 test error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
