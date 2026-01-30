import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, company } = await req.json();
    
    if (!name) {
      return new Response(
        JSON.stringify({ success: false, error: 'name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
    if (!PERPLEXITY_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'PERPLEXITY_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const companyStr = company ? ` at ${company}` : '';
    console.log(`Starting comprehensive intelligence research: ${name}${companyStr}`);

    const response = await fetch('https://api.perplexity.ai/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "openai/gpt-5.2",
        input: `Conduct comprehensive research on: ${name}${companyStr}. 
        
I need a complete intelligence profile on this person. Search extensively and gather everything you can find.`,
        tools: [
          { type: "web_search" },
          { type: "fetch_url" }
        ],
        instructions: `You are an elite competitive intelligence researcher. Your task is to build a COMPREHENSIVE DOSSIER on this person.

SEARCH EXTENSIVELY - Use multiple searches:
- "${name}" - general presence
- "${name} ${company || ''}" - current role
- "${name} LinkedIn" - professional profile  
- "${name} biography" - background info
- "${name} interview" - quotes, perspectives
- "${name} news" - recent mentions
- "${name} Twitter OR X" - social presence
- "${name} speaker OR conference" - public appearances
- "${name} education university" - academic background
- "${name} previous company" - career history

Use fetch_url to extract full content from promising pages.

BUILD A COMPLETE PROFILE:

1. IDENTITY
- Full legal name
- Also known as / nicknames
- Photo URL if available

2. CURRENT ROLE
- Job title
- Company
- Department/Division
- Reporting structure if known
- Time in role

3. PROFESSIONAL BIOGRAPHY
- Write a comprehensive 3-5 paragraph bio
- Career narrative and trajectory
- Key achievements and milestones
- Areas of expertise
- Industry reputation

4. CAREER HISTORY
- Previous positions (company, title, dates)
- Notable projects or deals
- Career pivots or transitions

5. EDUCATION
- Degrees, institutions, years
- Certifications
- Notable academic achievements

6. PUBLIC PRESENCE
- LinkedIn URL
- Twitter/X handle
- Other social profiles
- Personal website/blog
- Podcast appearances
- Conference talks
- Published articles or books

7. NEWS & MENTIONS
- Recent news articles mentioning them
- Press releases
- Industry coverage

8. CONTACT INFORMATION
- Work email (verified or pattern-based)
- Company email pattern
- Phone if publicly available
- Office location

9. INSIGHTS
- Communication style (based on interviews/posts)
- Topics they care about
- Potential conversation starters
- Connections or mutual interests

RESPOND with this JSON structure:
{
  "identity": {
    "full_name": "string",
    "aliases": ["array of other names"],
    "photo_url": "string or null"
  },
  "current_role": {
    "title": "string",
    "company": "string",
    "department": "string or null",
    "start_date": "string or null",
    "reports_to": "string or null"
  },
  "biography": "string - comprehensive 3-5 paragraph narrative bio",
  "career_history": [
    {
      "company": "string",
      "title": "string",
      "dates": "string",
      "highlights": ["notable achievements"]
    }
  ],
  "education": [
    {
      "institution": "string",
      "degree": "string",
      "field": "string",
      "year": "string or null"
    }
  ],
  "public_presence": {
    "linkedin_url": "string or null",
    "twitter_handle": "string or null",
    "other_profiles": {},
    "website": "string or null",
    "notable_content": ["podcasts, talks, articles"]
  },
  "recent_news": [
    {
      "headline": "string",
      "source": "string",
      "date": "string",
      "url": "string"
    }
  ],
  "contact": {
    "email": "string or null",
    "email_confidence": "verified|pattern_based|not_found",
    "email_pattern": "string - company email format",
    "phone": "string or null",
    "location": "string or null"
  },
  "insights": {
    "communication_style": "string",
    "key_interests": ["topics they discuss"],
    "conversation_starters": ["potential icebreakers"],
    "quotes": ["notable quotes from interviews"]
  },
  "sources": ["all URLs used"],
  "research_summary": "brief meta-summary of research quality and gaps"
}

CRITICAL RULES:
- SEARCH AGGRESSIVELY - use 5-10+ web searches minimum
- USE fetch_url on LinkedIn, company pages, news articles
- Write a REAL bio, not bullet points - narrative style
- Include QUOTES when found
- Be thorough - this is intelligence research, not a quick lookup
- If information is sparse, say so in research_summary`,
        reasoning: {
          effort: "high"
        },
        max_output_tokens: 4000
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Perplexity API error: ${response.status} - ${errorText}`);
      return new Response(
        JSON.stringify({ success: false, error: `Perplexity API error: ${response.status}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    
    // Extract output_text from the agentic response format
    let outputText = data.output_text || "";
    if (!outputText && data.output) {
      for (const item of data.output) {
        if (item.type === "message" && item.content) {
          for (const content of item.content) {
            if (content.type === "output_text") {
              outputText += content.text;
            }
          }
        }
      }
    }

    console.log(`Comprehensive research complete. Response length: ${outputText.length} chars`);

    let profileData;
    try {
      const cleanedText = outputText.replace(/```json\n?|\n?```/g, '').trim();
      profileData = JSON.parse(cleanedText);
    } catch {
      console.error('Failed to parse JSON response');
      profileData = { 
        raw_text: outputText, 
        parsing_error: true 
      };
    }

    return new Response(JSON.stringify({ 
      success: true, 
      data: profileData,
      usage: data.usage 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in enrich-person:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
