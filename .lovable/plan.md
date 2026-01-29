# Add Perplexity Search to Club Intelligence Enrichment

## Overview

Enhance the Club Intelligence Enrichment module by adding Perplexity AI-powered web search to gather additional intelligence:

1. **Club Description** - A concise, factual overview of the club (simple query using just club name)
2. **Founder & History** - founding story, who started it, credentials
3. **Recent Activities & News** - recent events, expansions, awards, press coverage

---

## Architecture

```text
Current Flow:
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│  1. Firecrawl   │ → │  2. Firecrawl   │ → │   3. Apify      │ → │  4. Claude AI   │
│  (Website MD)   │   │  (Branding)     │   │  (Instagram)    │   │  (Analysis)     │
└─────────────────┘   └─────────────────┘   └─────────────────┘   └─────────────────┘

New Flow:
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│  1. Firecrawl   │ → │  2. Firecrawl   │ → │   3. Apify      │ → │  4. Perplexity  │ → │  5. Claude AI   │
│  (Website MD)   │   │  (Branding)     │   │  (Instagram)    │   │  (3 Searches)   │   │  (Analysis)     │
└─────────────────┘   └─────────────────┘   └─────────────────┘   └─────────────────┘   └─────────────────┘
```

---

## Perplexity Searches (3 queries per club)

### Query 1: Club Description
A simple, direct search using just the club name for a factual overview.

```typescript
{
  model: 'sonar',
  messages: [{ role: 'user', content: clubName }],
  max_tokens: 2000,
  temperature: 0.1  // Low for factual results
}
```
→ Returns: General description of what the club is, what they offer, reputation

### Query 2: Founder & History
```typescript
{
  model: 'sonar',
  messages: [{ role: 'user', content: `${clubName} founder history background` }],
  max_tokens: 1500,
  temperature: 0.1
}
```
→ Returns: Founder name, background, when founded

### Query 3: Recent News & Activities
```typescript
{
  model: 'sonar',
  messages: [{ role: 'user', content: `${clubName} recent news events 2025` }],
  search_recency_filter: 'year',
  max_tokens: 1500,
  temperature: 0.1
}
```
→ Returns: Recent activities, awards, expansions

---

## Database Migration

Add new columns to `enriched_clubs` table:

| Column | Type | Purpose |
|--------|------|---------|
| `perplexity_description` | text | Simple club description from Perplexity |
| `founder_info` | text | Founder name, background, credentials |
| `founding_year` | text | When the club was founded |
| `recent_activities` | jsonb | Array of recent news/events/activities |
| `perplexity_citations` | jsonb | All source URLs from Perplexity searches |

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/enrichment-worker/index.ts` | Add 3 Perplexity searches, update Claude prompt, store new fields |
| `src/components/EnrichedClubsDialog.tsx` | Display Perplexity description, founder info, recent activities with sources |

---

## Implementation Order

1. ✅ Connect Perplexity connector
2. Run database migration
3. Update enrichment-worker with 3 Perplexity searches
4. Update Claude prompt to synthesize all data
5. Update EnrichedClubsDialog UI

---

## Considerations

- **Rate Limits**: Handle 429 errors with backoff
- **Optional Step**: Skip if PERPLEXITY_API_KEY not configured
- **Cost**: ~$0.015-0.03 per club (3 searches)
- **Parallel Queries**: Run all 3 Perplexity searches in parallel for speed
