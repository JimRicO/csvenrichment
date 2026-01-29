
# Implementation: Add Perplexity Searches to Enrichment Pipeline

## Problem Identified

The database migration added the new columns, but two key pieces are missing:
1. The `enrichment-worker` edge function doesn't call Perplexity API
2. The `EnrichedClubsDialog` UI doesn't display the new fields

---

## Implementation Steps

### Step 1: Update enrichment-worker Edge Function

**File:** `supabase/functions/enrichment-worker/index.ts`

Add a new Step 4 (Perplexity Search) between Instagram scrape and Claude AI analysis:

| Search | Query | Purpose |
|--------|-------|---------|
| 1 | `{clubName}` | Simple club description |
| 2 | `{clubName} founder history background` | Founder info |
| 3 | `{clubName} recent news events 2025` | Recent activities |

```text
// After Step 3 (Instagram), before Step 4 (Claude):
// ========== STEP 4: Perplexity Web Search ==========

1. Check if PERPLEXITY_API_KEY is configured
2. Run 3 parallel searches using Promise.all()
3. Parse responses and extract citations
4. Pass results to Claude prompt
5. Track cost (~$0.015-0.03 for 3 searches)
```

Update the Claude prompt to include Perplexity data and generate additional fields:
- `founder_info`
- `founding_year`
- `recent_activities` (array)

Update the database insert to include:
- `perplexity_description`
- `founder_info`
- `founding_year`
- `recent_activities`
- `perplexity_citations`

---

### Step 2: Update EnrichedClubsDialog UI

**File:** `src/components/EnrichedClubsDialog.tsx`

1. Update `EnrichedClub` interface to include new fields:
```typescript
interface EnrichedClub {
  // ... existing fields ...
  perplexity_description: string | null;
  founder_info: string | null;
  founding_year: string | null;
  recent_activities: { title: string; date?: string; source?: string }[];
  perplexity_citations: string[];
}
```

2. Add new UI sections:
   - **Perplexity Description** - displayed prominently near the top
   - **Founder Information** - with founding year badge
   - **Recent Activities** - list with clickable source links
   - **Sources** - collapsible section showing all Perplexity citations

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/enrichment-worker/index.ts` | Add Perplexity search step, update Claude prompt, store new fields |
| `src/components/EnrichedClubsDialog.tsx` | Update interface, add UI sections for new fields |

---

## Cost Impact

| Item | Cost |
|------|------|
| Perplexity (3 searches) | ~$0.015-0.03 |
| Total per club (with existing) | ~$0.024-0.039 |

---

## Considerations

- Perplexity step is optional - skips gracefully if API key not configured
- All 3 Perplexity searches run in parallel for speed
- Rate limit handling with exponential backoff for 429 errors
- Citations stored for transparency and source verification
