import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AgenticResearchResult {
  full_name: string | null;
  biography: string | null;
  job_title: string | null;
  company: string | null;
  previous_roles: Array<{ title: string; company: string; years: string }>;
  education: Array<{ degree: string; institution: string; year: string }>;
  notable_achievements: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  twitter_handle: string | null;
  other_socials: Record<string, string>;
  confidence: 'high' | 'medium' | 'low';
  sources: string[];
}

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

    const contextStr = company ? ` at ${company}` : '';
    
    const instructions = `You are a professional B2B contact researcher. Find comprehensive information about this person.

SEARCH: LinkedIn profile, company websites, news articles, professional directories, social media, public records.

RESPOND ONLY with this JSON, no other text:
{
  "full_name": "string or null",
  "biography": "2-3 sentence professional biography summarizing their background and significance",
  "job_title": "current job title or null",
  "company": "current company/employer or null",
  "previous_roles": [{"title": "Job Title", "company": "Company Name", "years": "2018-2022"}],
  "education": [{"degree": "Degree Name", "institution": "University Name", "year": "2010"}],
  "notable_achievements": "Key accomplishments, awards, or recognition in 1-2 sentences or null",
  "email": "work email address or null",
  "phone": "phone number or null",
  "linkedin_url": "LinkedIn profile URL or null",
  "twitter_handle": "@username or null",
  "other_socials": {"platform": "url"},
  "confidence": "high|medium|low",
  "sources": ["URLs used to gather this information"]
}

RULES:
- Only include verified information, use null for missing fields
- Biography should synthesize their professional identity and significance
- previous_roles and education should be empty arrays [] if not found
- Prioritize work email over personal email
- Never fabricate or guess data
- Confidence: "high" if multiple sources agree, "medium" if single source, "low" if uncertain`;

    console.log(`Enriching person: ${name}${contextStr}`);

    const response = await fetch('https://api.perplexity.ai/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "openai/gpt-5.2",
        input: `Research ${name}${contextStr}. Find their professional background, career history, contact information, and notable achievements.`,
        tools: [{ type: "web_search" }],
        instructions: instructions
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

    console.log(`Agentic response length: ${outputText.length} chars`);

    // Parse JSON from output
    let enrichedData: AgenticResearchResult;
    try {
      const cleanedText = outputText.replace(/```json\n?|\n?```/g, '').trim();
      enrichedData = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('Failed to parse response:', parseError);
      console.log('Raw response (first 500 chars):', outputText.substring(0, 500));
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to parse research results',
          raw_text: outputText.substring(0, 1000)
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully enriched: ${name}, confidence: ${enrichedData.confidence}`);

    return new Response(
      JSON.stringify({ success: true, data: enrichedData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in enrich-person:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
