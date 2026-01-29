

# Add Logo Extraction to Website Scraper Module

## Overview

Enhance the **Website Scraper** module ("Scrape a single website or bulk process from CSV" in `UploadSection.tsx`) to extract and persist club logos using Firecrawl's branding format.

---

## Current State

| Component | Function | Logo Support |
|-----------|----------|--------------|
| `scraper-worker` | Scrapes pages with `formats: ['markdown', 'links']` | None |
| `extractor-worker` | AI extraction of business data | None |
| `scraped_rows` table | Stores scraped/extracted data | No logo columns |
| `WebsiteResultsDialog` | Displays results table | No logo display |
| `download-csv` | Exports enriched CSV | No logo columns |

---

## Changes Required

### 1. Database Migration

Add two new columns to the `scraped_rows` table:

| Column | Type | Description |
|--------|------|-------------|
| `logo_url` | text | Original logo URL from Firecrawl branding response |
| `logo_storage_url` | text | Persisted logo URL in Supabase Storage (brand-images bucket) |

---

### 2. Edge Function: scraper-worker

Modify to add a **branding extraction step** after content scraping:

**Current Flow:**
1. Map website URLs
2. Scrape homepage + subpages with `formats: ['markdown', 'links']`
3. Save content to database

**New Flow:**
1. Map website URLs
2. Scrape homepage + subpages with `formats: ['markdown', 'links']`
3. **NEW: Call Firecrawl with `formats: ['branding']` on homepage**
4. **NEW: Extract logo URL from `branding.images.logo`**
5. **NEW: Download and persist logo to `brand-images` storage bucket**
6. Save content + logo URLs to database

**Logo Download Pattern** (from existing `enrichment-worker`):
- Fetch logo with User-Agent header
- Handle HTTPS failures with HTTP fallback (SSL certificate issues)
- Detect content type and file extension
- Upload to storage: `{hostname}/logo-{timestamp}.{ext}`
- Get public URL

---

### 3. Frontend: UploadSection.tsx

Update the single-scrape result display to show the logo:

- Add logo thumbnail above or beside website URL
- Handle broken images with fallback icon
- Show "No logo found" placeholder if none extracted

---

### 4. Frontend: WebsiteResultsDialog.tsx

Update the results table to include a Logo column:

- Add "Logo" column to table header
- Display logo thumbnail (40x40px) with tooltip for full preview
- Use `ImageOff` icon as fallback for missing logos
- Make logo clickable to open full size in new tab

---

### 5. Edge Function: download-csv

Update CSV export to include logo URLs:

- Add `Logo URL` column (original source URL)
- Add `Logo Storage URL` column (persisted URL)

---

## Technical Details

### Modified Files

1. **Database Migration**
   - Add `logo_url` and `logo_storage_url` columns to `scraped_rows`

2. **supabase/functions/scraper-worker/index.ts**
   - Add Firecrawl branding call after content scrape
   - Add logo download and storage persistence
   - Update database row with logo URLs

3. **src/components/UploadSection.tsx**
   - Add logo display to single-scrape results (lines ~410-430)
   - Add `logo_url` and `logo_storage_url` to `ScrapedResult` interface

4. **src/components/WebsiteResultsDialog.tsx**
   - Add Logo column to table header and rows
   - Update `ScrapedRow` interface with logo fields
   - Add logo thumbnail with fallback

5. **supabase/functions/download-csv/index.ts**
   - Add logo URLs to CSV headers and row data

---

## Cost Impact

- Additional Firecrawl credit (~$0.001) per website for branding extraction
- Total cost per website increases from ~$0.002 to ~$0.003

---

## Implementation Sequence

1. Create database migration to add logo columns
2. Update `scraper-worker` with branding extraction + storage
3. Update `UploadSection.tsx` single-scrape result display
4. Update `WebsiteResultsDialog.tsx` with Logo column
5. Update `download-csv` to include logo URLs

