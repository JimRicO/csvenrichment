

# Fix Person Intelligence: Use Perplexity `deep-research` Preset

## Problem Identified

The current implementation is **not performing proper web searches** because it's using the raw Agentic Research API with manual configuration instead of Perplexity's optimized **presets**.

### Current Implementation Issues:
- Passes `model: "openai/gpt-5.2"` directly but **no preset**
- Manually defines tools but misses the optimized multi-step research workflow
- Only getting 5 sources (logs show: "Sources: 5")
- Model doing minimal searching because it lacks the preset's research methodology

### What Presets Provide:

| Preset | Max Steps | Expected Sources | Tools |
|--------|-----------|------------------|-------|
| `fast-search` | 1 | ~10-20 | `web_search` |
| `pro-search` | 3 | ~30-50 | `web_search` + `fetch_url` |
| **`deep-research`** | **10** | **50-80+** | `web_search` + `fetch_url` |

The `deep-research` preset includes a sophisticated system prompt that instructs the model to:
- Act as a "world-class research expert"
- Iterate on tool calls until comprehensive coverage
- Use 50-80+ sources for complex research
- Generate premium-quality dossiers

## Technical Changes

### 1. Update `enrich-person` Edge Function

**File:** `supabase/functions/enrich-person/index.ts`

Switch from manual configuration to the `deep-research` preset:

```typescript
// OLD (current - not working well)
body: JSON.stringify({
  model: "openai/gpt-5.2",
  input: "...",
  tools: [{ type: "web_search" }, { type: "fetch_url" }],
  instructions: "...",
  reasoning: { effort: "high" },
  max_output_tokens: 4000
})

// NEW (using deep-research preset)
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
  instructions: `You are building a premium competitive intelligence dossier. Research exhaustively.

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
})
```

### 2. Update `people-worker` Edge Function

**File:** `supabase/functions/people-worker/index.ts`

Same change - use `preset: "deep-research"` instead of manual model/tools configuration.

### Key Differences with Preset:

| Aspect | Manual Config | `deep-research` Preset |
|--------|---------------|------------------------|
| Research steps | 1 (default) | **10** |
| Sources | 5 (observed) | **50-80+** |
| System prompt | Custom (basic) | **Premium research methodology** |
| Tool orchestration | Basic | **Iterative multi-query** |
| Output quality | Basic | **$200K consultant-grade** |

## Expected Improvements

1. **Deep web searches** - 10 iterative steps with multiple queries
2. **50-80+ sources** - Exhaustive LinkedIn, news, company page coverage
3. **Premium system prompt** - Research expert methodology built-in
4. **Multi-step reasoning** - Iterates until comprehensive coverage
5. **Better citations** - More sources in the final response

## Cost Impact

| Aspect | Current | With `deep-research` |
|--------|---------|---------------------|
| API calls | 1 | 1 |
| Searches | ~1-2 | 10-30+ |
| Sources | 5 | 50-80+ |
| Estimated cost/person | ~$0.05-0.10 | ~$0.30-0.50 |

Cost increases but delivers dramatically better results.

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/enrich-person/index.ts` | Use `preset: "deep-research"` |
| `supabase/functions/people-worker/index.ts` | Use `preset: "deep-research"` |

