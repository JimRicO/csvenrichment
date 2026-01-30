

# Upgrade to Comprehensive Person Intelligence Tool

## Overview

Transform the current basic person enrichment into an **elite competitive intelligence research system** that produces complete dossiers with narrative biographies, career histories, public presence, news mentions, and actionable sales insights.

## Current vs New Approach

| Aspect | Current | New (Intelligence Tool) |
|--------|---------|------------------------|
| **Model** | `openai/gpt-5.2` | `openai/gpt-5.2` |
| **Tools** | `web_search` only | `web_search` + `fetch_url` |
| **Search depth** | 1 generic search | 10+ targeted searches |
| **Biography** | 2-3 sentences | 3-5 paragraph narrative |
| **Output tokens** | Default (~1000) | 4000 tokens |
| **Reasoning** | Default | `effort: "high"` |
| **Data sections** | 6 basic | 9 comprehensive |

## New Data Schema

The enhanced output includes 9 intelligence sections:

```text
1. IDENTITY
   - full_name, aliases, photo_url

2. CURRENT ROLE
   - title, company, department, start_date, reports_to

3. BIOGRAPHY
   - 3-5 paragraph narrative (not bullet points)

4. CAREER HISTORY
   - Previous roles with dates and highlights

5. EDUCATION
   - Degrees, institutions, fields, years

6. PUBLIC PRESENCE
   - LinkedIn, Twitter, website, podcasts, talks, articles

7. RECENT NEWS
   - Headlines, sources, dates, URLs

8. CONTACT
   - Email (with confidence), phone, location, company pattern

9. INSIGHTS
   - Communication style, key interests, conversation starters, quotes
```

## Technical Changes

### 1. Update `enrich-person` Edge Function

**File:** `supabase/functions/enrich-person/index.ts`

Major rewrite with:
- Add `fetch_url` tool for extracting full page content
- Add 10+ prescribed search queries in the instructions
- Request narrative biography (not bullet points)
- Set `max_output_tokens: 4000`
- Enable `reasoning: { effort: "high" }`
- New comprehensive JSON schema with 9 sections
- Include `research_summary` for quality assessment

### 2. Update `people-worker` Edge Function

**File:** `supabase/functions/people-worker/index.ts`

Same upgrade to the worker function that processes batch jobs:
- Use the comprehensive intelligence prompt
- Add `fetch_url` tool
- Enable high reasoning effort
- Map new data fields to database columns

### 3. Database Migration

**New columns needed for `enriched_people` table:**

| New Column | Type | Purpose |
|------------|------|---------|
| `aliases` | JSONB | Alternative names |
| `photo_url` | TEXT | Profile photo URL |
| `department` | TEXT | Current department |
| `start_date` | TEXT | Time in current role |
| `reports_to` | TEXT | Manager/reporting line |
| `career_highlights` | JSONB | Notable achievements per role |
| `recent_news` | JSONB | News mentions array |
| `email_confidence` | TEXT | verified/pattern_based/not_found |
| `email_pattern` | TEXT | Company email format |
| `location` | TEXT | Office location |
| `communication_style` | TEXT | How they communicate |
| `key_interests` | JSONB | Topics they care about |
| `conversation_starters` | JSONB | Icebreakers |
| `quotes` | JSONB | Notable quotes |
| `website` | TEXT | Personal website |
| `notable_content` | JSONB | Podcasts, talks, articles |
| `research_summary` | TEXT | Quality/gaps assessment |

### 4. Update TypeScript Interface and Hook

**File:** `src/hooks/useEnrichPerson.ts`

Update the interface to match the new comprehensive data structure.

### 5. Update UI Component

**File:** `src/components/EnrichedPeopleDialog.tsx`

Add new sections to display:
- Photo (if available)
- Aliases
- Recent news mentions
- Insights section (communication style, interests, quotes)
- Conversation starters for sales outreach
- Research quality summary

## Search Strategy

The prompt prescribes 10+ targeted searches:

```text
- "{name}" - general presence
- "{name} {company}" - current role
- "{name} LinkedIn" - professional profile
- "{name} biography" - background info
- "{name} interview" - quotes, perspectives
- "{name} news" - recent mentions
- "{name} Twitter OR X" - social presence
- "{name} speaker OR conference" - public appearances
- "{name} education university" - academic background
- "{name} previous company" - career history
```

## Cost Impact

| Item | Old | New |
|------|-----|-----|
| API calls | 1 | 1 |
| Tokens | ~1000 | ~4000 |
| Reasoning | Default | High |
| Estimated cost per person | ~$0.03-0.05 | ~$0.08-0.15 |

The cost increases ~3x but delivers significantly richer intelligence.

## Files to Create/Modify

| File | Action |
|------|--------|
| `supabase/functions/enrich-person/index.ts` | Major rewrite |
| `supabase/functions/people-worker/index.ts` | Major rewrite |
| Database migration | Add 17 new columns |
| `src/hooks/useEnrichPerson.ts` | Update interface |
| `src/components/EnrichedPeopleDialog.tsx` | Add new UI sections |

## Benefits

1. **Elite-level research** - Comprehensive dossiers, not quick lookups
2. **Narrative biographies** - Real written bios, not bullet points
3. **Sales intelligence** - Conversation starters, quotes, interests
4. **Deep search** - 10+ targeted searches per person
5. **Page extraction** - Full content from LinkedIn, company pages
6. **News tracking** - Recent mentions and coverage
7. **Quality transparency** - Research summary shows gaps

