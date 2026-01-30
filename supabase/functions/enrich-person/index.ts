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
        preset: "deep-research",
        input: `Build a comprehensive intelligence dossier on: ${name}${companyStr}.

Research their professional background, career history, education, public presence, recent news mentions, contact information, and insights for sales outreach.

I need:
- Full biography (3-5 paragraphs, narrative style)
- Career history with dates and highlights
- Education and certifications
- LinkedIn, Twitter, website URLs
- Recent news articles mentioning them
- Work email (verified or pattern-based)
- Communication style and conversation starters`,
        instructions: `You are building a premium competitive intelligence dossier. Research exhaustively using multiple searches and fetch_url to get full page content.

OUTPUT FORMAT - Respond with this JSON structure only:
{
  "identity": { "full_name": "...", "aliases": [], "photo_url": null },
  "current_role": { "title": "...", "company": "...", "department": null, "start_date": null, "reports_to": null },
  "biography": "3-5 paragraph narrative biography...",
  "career_history": [{ "company": "...", "title": "...", "dates": "...", "highlights": [] }],
  "education": [{ "institution": "...", "degree": "...", "field": "...", "year": null }],
  "public_presence": { "linkedin_url": null, "twitter_handle": null, "other_profiles": {}, "website": null, "notable_content": [] },
  "recent_news": [{ "headline": "...", "source": "...", "date": "...", "url": "..." }],
  "contact": { "email": null, "email_confidence": "verified|pattern_based|not_found", "email_pattern": null, "phone": null, "location": null },
  "insights": { "communication_style": "...", "key_interests": [], "conversation_starters": [], "quotes": [] },
  "sources": ["all URLs used"],
  "research_summary": "Brief summary of research quality and any gaps"
}`,
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
