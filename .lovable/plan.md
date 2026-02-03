
# Plan: Add Pre-Pipeline Social Media Discovery Search

## Problem Statement

The current enrichment pipeline assumes the input includes `website_url` and optionally `instagram_handle`. However:
- API requests may only contain `club_name`
- Social media URLs (Facebook, Twitter, LinkedIn) are not discovered reliably
- The existing Perplexity searches focus on business info, not social discovery

## Solution: Two-Phase Approach

Add a **discovery phase** BEFORE the main pipeline that uses Perplexity to find the club's web presence and social media profiles.

---

## New Pipeline Flow

```text
┌────────────────────────────────────────────────────────┐
│  STEP 0 (NEW): Social Media Discovery                  │
│  Input: club_name only                                 │
│  Perplexity search for:                                │
│    - Official website URL                              │
│    - Instagram handle                                  │
│    - Facebook page URL                                 │
│    - Twitter/X handle                                  │
│    - LinkedIn company page                             │
│  Output: Discovered URLs and handles                   │
└────────────────────────────────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────┐
│  Merge discovered data with input data                 │
│  - Use discovered website_url if not provided          │
│  - Use discovered instagram_handle if not provided     │
│  - Store all social URLs for later                     │
└────────────────────────────────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────┐
│  EXISTING PIPELINE (Steps 1-6)                         │
│  Now runs with enhanced input data                     │
│  Step 1: Website Scrape (uses discovered URL)          │
│  Step 2: Branding Extraction                           │
│  Step 3: Instagram Scrape (uses discovered handle)     │
│  Step 4: Perplexity Research (4 searches)              │
│  Step 5: Claude AI Analysis                            │
│  Step 6: Store Results (includes discovered socials)   │
└────────────────────────────────────────────────────────┘
```

---

## Technical Changes

### File: `supabase/functions/enrichment-worker/index.ts`

**1. Add new interface for discovered social data**

```typescript
interface DiscoveredSocialData {
  website_url: string | null;
  instagram_handle: string | null;
  facebook_url: string | null;
  twitter_handle: string | null;
  linkedin_url: string | null;
}
```

**2. Add new function: `discoverSocialMedia`**

This function runs a single Perplexity search with structured JSON output to discover all social media profiles:

- Uses Perplexity with `response_format: json_schema` for reliable parsing
- Query: "Find official website and social media accounts for [club_name]"
- Returns structured data with all discovered URLs
- Includes regex extraction as fallback from citations

**3. Insert STEP 0 before existing Step 1 (line ~132)**

```typescript
// ========== STEP 0: Social Media Discovery ==========
console.log('Step 0: Discovering social media presence...');
let discoveredSocial: DiscoveredSocialData = {
  website_url: null,
  instagram_handle: null,
  facebook_url: null,
  twitter_handle: null,
  linkedin_url: null
};

if (PERPLEXITY_API_KEY) {
  discoveredSocial = await discoverSocialMedia(row.club_name, PERPLEXITY_API_KEY);
  
  // Enhance input data with discovered values
  if (!row.website_url || row.website_url === 'https://placeholder.com') {
    row.website_url = discoveredSocial.website_url || row.website_url;
  }
  if (!row.instagram_handle && discoveredSocial.instagram_handle) {
    row.instagram_handle = discoveredSocial.instagram_handle;
  }
}
```

**4. Update Step 6 (Store Results) to prioritize discovered social URLs**

```typescript
facebook_url: discoveredSocial.facebook_url || socialMedia.facebook_url || null,
twitter_handle: discoveredSocial.twitter_handle || socialMedia.twitter_handle || null,
linkedin_url: discoveredSocial.linkedin_url || socialMedia.linkedin_url || null,
```

---

## Discovery Search Implementation

The `discoverSocialMedia` function will:

1. Call Perplexity with a targeted query:
   ```
   Find the official website and social media accounts for "[club_name]". 
   Include: website URL, Instagram, Facebook page, Twitter/X, LinkedIn company page.
   ```

2. Request structured JSON response with this schema:
   ```json
   {
     "website_url": "https://...",
     "instagram": "@handle or URL",
     "facebook": "https://facebook.com/...",
     "twitter": "@handle or https://x.com/...",
     "linkedin": "https://linkedin.com/company/..."
   }
   ```

3. Also extract URLs directly from Perplexity citations as a fallback

4. Normalize all handles/URLs to consistent format

---

## Cost Impact

- Adds 1 Perplexity sonar query per club
- Estimated additional cost: ~$0.005 per club
- Total pipeline cost: ~$0.034 to ~$0.039 per club

---

## Benefits

1. **Works with club_name only** - No longer requires website_url in input
2. **Discovers all social profiles** - Facebook, Twitter, LinkedIn found via web search
3. **Instagram discovery** - Finds Instagram handle if not provided
4. **Website discovery** - Finds official website if not provided
5. **More reliable** - Perplexity search is better at finding social profiles than scraping website footers

---

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/enrichment-worker/index.ts` | Add discoverSocialMedia function, insert Step 0, update Step 6 |

---

## Summary

This plan adds a discovery phase at the start of the pipeline that uses Perplexity to find the club's web presence. The discovered data (website URL, Instagram handle, Facebook, Twitter, LinkedIn) is then fed into the existing pipeline, ensuring we have all social information even when the API request only contains the club name.
