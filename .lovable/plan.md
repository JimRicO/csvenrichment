

# Upgrade People Intelligence to Perplexity Agentic Research API

## Overview

Replace the current two-step approach (Perplexity sonar-pro + Claude synthesis) with Perplexity's new Agentic Research API that provides built-in reasoning with web search tools—delivering better results in a single API call.

## Current vs New Approach

| Aspect | Current | New (Agentic) |
|--------|---------|---------------|
| **API Endpoint** | `/chat/completions` | `/responses` |
| **Model** | `sonar-pro` | `openai/gpt-5.2` with tools |
| **Search** | Manual queries | Built-in `web_search` tool |
| **Synthesis** | Separate Claude API call | Built into response |
| **API Calls per person** | 3 (2 Perplexity + 1 Claude) | 1 |

## Technical Changes

### 1. Update `people-worker` Edge Function

**File:** `supabase/functions/people-worker/index.ts`

Replace the current implementation with the Agentic Research API using an enhanced prompt that captures full biographical data:

```typescript
const response = await fetch('https://api.perplexity.ai/responses', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: "openai/gpt-5.2",
    input: `Research ${personName}${contextStr}. Find their professional background, career history, contact information, and notable achievements.`,
    tools: [{ type: "web_search" }],
    instructions: `You are a professional researcher. Find comprehensive information about this person.

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
- Confidence: "high" if multiple sources agree, "medium" if single source, "low" if uncertain`
  }),
});
```

**Key changes:**
- Remove the `searchPerplexity` function (no longer needed)
- Remove the Claude API call (synthesis is now built-in)
- Remove `ANTHROPIC_API_KEY` dependency
- Add new `callAgenticResearch` function for the `/responses` endpoint
- Parse `output_text` from the new response format
- Update cost estimation (single API call pricing)

### 2. Expected JSON Output (Comprehensive)

The Agentic API will return rich biographical data:

```json
{
  "full_name": "John Smith",
  "biography": "John Smith is the VP of Sales at Acme Corp, where he has led the enterprise sales team since 2020. Previously, he spent 8 years at Salesforce building their EMEA division.",
  "job_title": "VP of Sales",
  "company": "Acme Corp",
  "previous_roles": [
    {"title": "Senior Director, Enterprise Sales", "company": "Salesforce", "years": "2012-2020"},
    {"title": "Account Executive", "company": "Oracle", "years": "2008-2012"}
  ],
  "education": [
    {"degree": "MBA", "institution": "Stanford GSB", "year": "2008"},
    {"degree": "BS Computer Science", "institution": "UC Berkeley", "year": "2004"}
  ],
  "notable_achievements": "Led Acme's 200% revenue growth in 2023. Named to Forbes 30 Under 30 in 2015.",
  "email": "john.smith@acme.com",
  "phone": "+1-555-123-4567",
  "linkedin_url": "https://linkedin.com/in/johnsmith",
  "twitter_handle": "@johnsmith",
  "other_socials": {"github": "https://github.com/johnsmith"},
  "confidence": "high",
  "sources": [
    "https://acme.com/team",
    "https://linkedin.com/in/johnsmith",
    "https://forbes.com/30-under-30/2015"
  ]
}
```

### 3. Create Standalone `enrich-person` Edge Function

**File:** `supabase/functions/enrich-person/index.ts`

A simpler, standalone function for quick one-off lookups (same comprehensive prompt).

### 4. Create Hook: `useEnrichPerson.ts`

**File:** `src/hooks/useEnrichPerson.ts`

```typescript
import { supabase } from "@/integrations/supabase/client"

export const useEnrichPerson = () => {
  const enrichPerson = async (name: string, company: string) => {
    const { data, error } = await supabase.functions.invoke('enrich-person', {
      body: { name, company }
    })
    if (error) throw error
    return data
  }
  return { enrichPerson }
}
```

### 5. Update `config.toml`

Add the new edge function:

```toml
[functions.enrich-person]
verify_jwt = false
```

## Response Format Handling

The Agentic API returns data differently than chat completions:

```typescript
// Extract output_text from response
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

// Parse JSON from output
const cleanedText = outputText.replace(/```json\n?|\n?```/g, '').trim();
const enrichedData = JSON.parse(cleanedText);
```

## Database Compatibility

The new output maps directly to existing `enriched_people` table columns:

| New Field | Existing Column |
|-----------|-----------------|
| `full_name` | `person_name` |
| `biography` | `biography` |
| `job_title` | `job_title` |
| `company` | `company` |
| `previous_roles` | `previous_roles` (JSONB) |
| `education` | `education` (JSONB) |
| `notable_achievements` | `notable_achievements` |
| `email` | `email` |
| `phone` | `phone` |
| `linkedin_url` | `linkedin_url` |
| `twitter_handle` | `twitter_handle` |
| `other_socials` | `other_socials` (JSONB) |
| `confidence` | `confidence_score` |
| `sources` | `all_citations` (JSONB) |

No database schema changes required!

## Cost Impact

| Item | Old Cost | New Cost |
|------|----------|----------|
| 2x Perplexity sonar-pro | ~$0.030 | - |
| 1x Claude synthesis | ~$0.004 | - |
| 1x Agentic Research | - | ~$0.02-0.05 |
| **Total per person** | ~$0.034 | ~$0.02-0.05 |

## Files to Create/Modify

| File | Action |
|------|--------|
| `supabase/functions/people-worker/index.ts` | Major rewrite - use Agentic API |
| `supabase/functions/enrich-person/index.ts` | Create - standalone enrichment |
| `src/hooks/useEnrichPerson.ts` | Create - hook for ad-hoc use |
| `supabase/config.toml` | Add `enrich-person` function |

## Benefits

1. **Rich biographical data** - Full career history, education, achievements
2. **Single API call** instead of 3 calls per person
3. **Built-in reasoning** with web search tools for better accuracy
4. **GPT-5.2 model** for superior synthesis
5. **Simpler code** - no orchestration of multiple AI providers
6. **Source attribution** maintained via `sources` array

