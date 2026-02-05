
# Visual DNA Analysis Feature - Implementation Plan

## Overview
Build a comprehensive Visual DNA analysis system that analyzes enriched clubs' Instagram content using AI to extract visual identity patterns, voice profiles, calculate an "Invisibility Score," and match against CTLT photography styles.

---

## Architecture Summary

```text
+---------------------------+
|  Frontend UI              |
|  - Analyze buttons (single/bulk) 
|  - Visual DNA display section
|  - CTLT Style Matches display
+------------+--------------+
             |
             v
+---------------------------+
| analyze-visual-dna        |
| (Edge Function)           |
+------------+--------------+
             |
     +-------+-------+-------+
     |       |       |       |
     v       v       v       v
+------+ +------+ +------+ +------+
| Apify| |Gemini| |Claude| |Claude|
| Inst-| | 2.5  | |Voice | |CTLT  |
| gram | |Visual| |Analy-| |Match-|
+------+ +------+ | sis  | | ing  |
                  +------+ +------+
                         |
                         v
                  +------------+
                  | enriched_  |
                  | clubs      |
                  | (Update)   |
                  +------------+
```

---

## Part 1: Database Schema

All required infrastructure already exists:

**`enriched_clubs` table** (columns confirmed):
- `visual_dna` (JSONB) - stores visual analysis
- `voice_dna` (JSONB) - stores voice analysis
- `ctlt_matches` (JSONB) - stores CTLT style matching results
- `invisibility_score` (INTEGER) - 0-100 score
- `invisibility_category` (TEXT) - Invisible/Struggling/Average/Strong/Excellent
- `visual_dna_analyzed_at` (TIMESTAMPTZ)

**`visual_dna_jobs` table** (exists):
- `id`, `status`, `total_clubs`, `processed_clubs`, `failed_clubs`, `error_log`, `created_at`, `updated_at`

**`visual_dna_rows` table** (exists):
- `id`, `job_id`, `enriched_club_id`, `club_name`, `status`, `error_message`, `posts_analyzed`, `processing_time_ms`, `created_at`, `updated_at`

No schema migrations needed.

---

## Part 2: Edge Function `analyze-visual-dna`

**Location:** `supabase/functions/analyze-visual-dna/index.ts`

### Processing Flow

1. **Validate Input**
   - Accept `{ enriched_club_id: string }`
   - Fetch club from `enriched_clubs` by ID
   - Return error if no `instagram_handle` exists

2. **Check for Existing Instagram Data**
   - Query `instagram_company_data` by matching username (strip @ from handle)
   - If data exists with `latest_posts` array having 4+ items, use it
   - Otherwise, trigger Apify scraper

3. **Instagram Scraping (if needed)**
   - Reuse same Apify actor pattern from `instagram-scraper` function
   - Actor: `apify~instagram-profile-scraper`
   - Config: `{ usernames: [handle], resultsLimit: 12 }`
   - Use `APIFY_API_TOKEN` secret (confirmed)
   - Store results in `instagram_company_data`

4. **Fetch Posts**
   - Get `latest_posts` from stored data
   - Sort by timestamp, take up to 12
   - Minimum 4 posts required, otherwise return error

5. **Visual Analysis via Gemini 2.5 Flash**
   - Build multimodal request with up to 12 image URLs
   - Skip any URLs that fail to load
   - Extract structured data:
     - `color_palette`: array of hex codes (top 5-8 dominant colors)
     - `photography_style`: cinematic/bright/moody/natural/minimal/saturated
     - `composition_patterns`: array of styles (close-up/wide/overhead/action/portrait)
     - `branding_elements`: { logo_visible, watermarks, text_overlays }
     - `content_mix`: percentages for action/lifestyle/events/coaching/facility/community/promotional
     - `quality_assessment`: { image_quality, consistency (1-10), brand_coherence (1-10) }
     - `filter_style`: warm/cool/high-contrast/natural/vintage

6. **Voice Analysis via Claude Sonnet**
   - Collect all captions from posts
   - Use `ANTHROPIC_API_KEY` secret
   - Extract:
     - `tone`: formal/casual/hype/educational/inspirational/mixed
     - `average_length`: short/medium/long
     - `emoji_frequency`: none/rare/moderate/heavy
     - `common_emojis`: top 5
     - `hashtag_strategy`: { average_count, branded_vs_generic, placement }
     - `cta_patterns`: array of CTA styles
     - `languages`: detected languages
     - `recurring_themes`: common themes
     - `signature_phrases`: unique phrases

7. **CTLT Style Matching via Claude Sonnet** (NEW)
   - Take the visual analysis JSON output
   - Send to Claude with list of 20 CTLT style names (hardcoded):
     - Cinematic, Editorial, Vintage Film, Neon Glow, Minimalist Clean, High Contrast, Dark Moody, Bright Natural, Warm Golden, Cool Blue, Urban Street, Luxury Premium, Retro Pop, Soft Pastel, Bold Graphic, Documentary, Fashion Editorial, Sports Action, Lifestyle Casual, Studio Portrait
   - Extract:
     - `matched_styles`: Top 5 with match_score (1-10) and reason
     - `styles_to_avoid`: 2-3 styles with reason
     - `enhancement_suggestion`: One sentence

8. **Calculate Invisibility Score**

   | Factor | Weight | Calculation |
   |--------|--------|-------------|
   | Posting Frequency | 30% | posts/13 weeks. 5+/wk=100, 3-5=75, 2-3=50, 1-2=30, 0.5-1=15, less=0 |
   | Content Quality | 25% | professional=100, semi-professional=70, phone-camera=40, mixed=55 |
   | Brand Consistency | 20% | brand_coherence (1-10) * 10 |
   | Engagement Rate | 15% | (avg likes+comments)/followers*100. 5%+=100, 3-5%=80, 1.5-3%=60, 0.5-1.5%=30, less=10 |
   | Caption Effort | 10% | long=100, medium=70, short=30 |

   **Categories:**
   - 0-19: "Invisible" (red)
   - 20-39: "Struggling" (orange)
   - 40-59: "Average" (yellow)
   - 60-79: "Strong" (green)
   - 80-100: "Excellent" (blue)

9. **Store Results**
   - Update `enriched_clubs` with:
     - `visual_dna` (JSONB)
     - `voice_dna` (JSONB)
     - `ctlt_matches` (JSONB)
     - `invisibility_score` (INTEGER)
     - `invisibility_category` (TEXT)
     - `visual_dna_analyzed_at` (TIMESTAMPTZ)
   - Update `visual_dna_rows` status to 'completed'

### Error Handling
- No Instagram handle: `{ error: "No Instagram handle found", code: "NO_HANDLE" }`
- Private/not found: Update row status to 'failed'
- Less than 4 posts: `{ error: "Not enough posts for analysis (minimum 4 required)", code: "INSUFFICIENT_POSTS" }`
- API failures: Log error, return partial results if possible

---

## Part 3: Frontend Changes

### 3.1 Update EnrichedClub Interface

Add new fields to the `EnrichedClub` interface in `EnrichedClubsDialog.tsx`:
- `visual_dna`: Visual analysis JSON
- `voice_dna`: Voice analysis JSON
- `ctlt_matches`: CTLT matching results
- `invisibility_score`: number
- `invisibility_category`: string
- `visual_dna_analyzed_at`: string

### 3.2 Single "Analyze Visual DNA" Button

**Location:** `EnrichedClubsDialog.tsx` (in club header section)

- Only visible when `instagram_handle` exists AND `visual_dna` is null
- Loading state with spinner during analysis
- On click:
  1. Create `visual_dna_jobs` entry with `total_clubs: 1`
  2. Create `visual_dna_rows` entry linking to enriched_club
  3. Invoke `analyze-visual-dna` edge function
  4. Show toast on success/failure
  5. Refresh club data to show new Visual DNA section

### 3.3 Bulk "Analyze All Visual DNA" Button

**Location:** `EnrichmentJobsTable.tsx` (in toolbar)

- Label: "Analyze All Visual DNA"
- Only enabled when there are clubs with `instagram_handle` but no `visual_dna`
- On click:
  1. Query all eligible `enriched_clubs`
  2. Create `visual_dna_jobs` entry with `total_clubs: count`
  3. Create `visual_dna_rows` entries for each
  4. Process sequentially with 2-second delays
  5. Show progress toast ("Processing 3/30...")

### 3.4 Visual DNA Display Section

**Location:** New section in `EnrichedClubsDialog.tsx` (after AI Analysis sections)

Only shown when `visual_dna` exists:

```
+-----------------------------------------------+
|  Visual DNA                              [v]  |
+-----------------------------------------------+
|                                               |
|  [85]  EXCELLENT                              |
|  Invisibility Score      (blue badge)         |
|                                               |
|  Color Palette: [●][●][●][●][●]               |
|  (small colored circles with hex tooltips)    |
|                                               |
|  Style: [Cinematic] [High Contrast]           |
|  Composition: [Wide] [Action] [Overhead]      |
|                                               |
|  Voice Profile                                |
|  Tone: Casual | Emoji: Heavy | CTAs: 3 types  |
|  Hashtags: 8 avg (mostly branded)             |
|                                               |
|  Content Mix                                  |
|  [==== Action 35% ========================]   |
|  [=== Lifestyle 25% ======================]   |
|  [...stacked bar for each category...]        |
|                                               |
|  ── CTLT Style Matches ──                     |
|                                               |
|  [Sports Action 9/10] [Cinematic 8/10]       |
|  [Documentary 7/10] [Bright Natural 7/10]     |
|  [Lifestyle Casual 6/10]                      |
|                                               |
|  Avoid: [Neon Glow] [Dark Moody]             |
|                                               |
|  💡 "Consider adding more close-up shots..."  |
|                                               |
|  Analyzed on Feb 5, 2026                      |
+-----------------------------------------------+
```

**Component Structure:**
- Large score display with color-coded category badge
- Color swatches as small circles
- Photography style and composition as badge tags
- Compact voice profile row with key metrics
- Horizontal stacked bar chart for content mix
- CTLT matched styles as badges with scores (e.g., "Sports Action 9/10")
- Styles to avoid as outline/muted badges
- Enhancement suggestion with lightbulb icon
- Timestamp footer

### 3.5 Invisibility Score Column (Optional Enhancement)

Could add to jobs table or a separate clubs list view showing:
- "Score" column with number + category badge
- Color coding matches category (red/orange/yellow/green/blue)
- Sortable by score value

---

## Part 4: Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `supabase/functions/analyze-visual-dna/index.ts` | CREATE | Main edge function with 3 AI calls |
| `supabase/config.toml` | MODIFY | Add function config entry |
| `src/components/EnrichedClubsDialog.tsx` | MODIFY | Add Visual DNA section + analyze button + CTLT display |
| `src/components/EnrichmentJobsTable.tsx` | MODIFY | Add bulk analyze button |
| `src/hooks/useVisualDNAAnalysis.ts` | CREATE | Hook for analysis operations (optional, can inline) |

---

## Part 5: API Keys Confirmation

All required secrets already exist:
- `GEMINI_API_KEY` - For visual analysis
- `ANTHROPIC_API_KEY` - For voice analysis + CTLT matching
- `APIFY_API_TOKEN` - For Instagram scraping (confirmed naming)

---

## Technical Implementation Details

### Gemini Multimodal Request Format
```typescript
const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-goog-api-key': GEMINI_API_KEY
  },
  body: JSON.stringify({
    contents: [{
      parts: [
        { text: "Analyze these Instagram posts..." },
        { inline_data: { mime_type: "image/jpeg", data: base64Image1 } },
        // ... more images
      ]
    }],
    generationConfig: { temperature: 0.2 }
  })
});
```

### Claude API Call Format
```typescript
const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01'
  },
  body: JSON.stringify({
    model: 'claude-sonnet-4-5-20241022',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }]
  })
});
```

### Cost Estimation Per Analysis
- Gemini 2.5 Flash (12 images): ~$0.001
- Claude Sonnet (voice analysis): ~$0.003
- Claude Sonnet (CTLT matching): ~$0.002
- Apify (if scrape needed): ~$0.003
- **Total: ~$0.006-0.009 per club**

### Rate Limiting
- 2-second delay between bulk analyses prevents API throttling
- Sequential processing for bulk operations
