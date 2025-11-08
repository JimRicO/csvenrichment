# Architecture Analysis: Shared Components Problem

## CRITICAL FINDING: Both systems share the SAME database tables

### CSV SCRAPER SYSTEM
**UI Components:**
- `UploadSection` - File upload for CSV
- `JobsTable` - Shows CSV scraping jobs
- `ActiveJobMonitor` - Monitors CSV job progress
- `ScrapedRowsDialog` - Shows scraped row details
- `StatsCards` - **PROBLEM: Shows ALL jobs (both systems)**

**Edge Functions:**
- `create-scraping-job` - Creates CSV scraping jobs
- `scraper-worker` - Uses Firecrawl to scrape websites
- `extractor-worker` - Uses Claude AI for data extraction
- `find-people-worker` - Finds team members
- `download-csv` - Downloads enriched CSV
- `merge-csv` - Merges multiple CSVs
- `project-qa` - Q&A on scraped data
- `get-job-status` - **SHARED with Instagram**

**Tables Used:**
- `scraping_jobs` - **SHARED TABLE** ❌
- `scraped_rows` - **SHARED TABLE** ❌
- `people` - CSV-specific ✓
- `ai_extraction_models` - CSV-specific ✓

---

### INSTAGRAM INTELLIGENCE SYSTEM
**UI Components:**
- `InstagramIntelligenceSection` - File upload for Instagram URLs
- `InstagramJobsTable` - Shows Instagram scraping jobs
- `ActiveInstagramJobMonitor` - Monitors Instagram job progress
- `InstagramResultsDialog` - Shows Instagram profile results

**Edge Functions:**
- `create-instagram-job` - Creates Instagram scraping jobs
- `instagram-worker` - Orchestrates Instagram scraping
- `instagram-scraper` - Uses Apify to scrape Instagram
- `download-instagram-csv` - Downloads Instagram CSV
- `get-job-status` - **SHARED with CSV** ❌

**Tables Used:**
- `scraping_jobs` - **SHARED TABLE** ❌
- `scraped_rows` - **SHARED TABLE** ❌
- `instagram_company_data` - Instagram-specific ✓

---

## ROOT CAUSE: SHARED DATABASE TABLES

### 1. `scraping_jobs` table (SHARED)
**Used by BOTH systems:**
- CSV jobs: IDs with random format
- Instagram jobs: IDs starting with "IG"

**Contains irrelevant fields for Instagram:**
- `total_characters_scraped` - Only for Firecrawl scraping
- `extraction_config` - Only for AI extraction
- `conversation` - Only for project Q&A
- `total_input_tokens` / `total_output_tokens` - Only for Claude AI

**Result:** Instagram jobs populate these fields with wrong data

### 2. `scraped_rows` table (SHARED)
**Used by BOTH systems:**
- CSV rows: Website URLs to scrape with Firecrawl
- Instagram rows: Instagram profile URLs to scrape with Apify

**Contains irrelevant fields for Instagram:**
- `scraped_content` - Only stores Firecrawl HTML/markdown
- `business_description` - Only from AI extraction
- `team_members` - Only from AI extraction
- `social_media` - Only from AI extraction
- `whatsapp_contact` - Only from AI extraction
- `custom_answer_1/2` - Only from AI extraction
- `model_id` - Only references AI extraction models
- `people_search_status` - Only for find-people-worker
- `team_page_url` - Only for find-people-worker
- `detailed_team_members` - Only for find-people-worker

**Result:** Instagram rows have 15+ unused columns, CSV rows get contaminated by Instagram data

---

## CONTAMINATION ISSUES CAUSED BY SHARING

### Issue 1: Worker Race Conditions
**Before fixes:**
- `scraper-worker` (Firecrawl) picked up Instagram URLs → 403 errors
- `extractor-worker` (Claude) picked up Instagram jobs → wrong costs/tokens
- `instagram-worker` used wrong filter → missed jobs

**After band-aid fixes:**
- Added `.not('job_id', 'like', 'IG%')` filters everywhere
- Added `.like('id', 'IG%')` filters for Instagram
- **This is a band-aid, not a fix**

### Issue 2: UI Contamination
**StatsCards:**
- Shows combined stats for BOTH systems
- No way to separate CSV vs Instagram costs
- Mixed success rates

**JobsTable:**
- Had to add special logic to detect Instagram jobs by ID prefix
- Shows mixed job types
- Confusion for users

### Issue 3: Cost Tracking Contamination
**Instagram jobs show wrong metrics:**
- `total_input_tokens` / `total_output_tokens` (should be 0)
- `estimated_cost_usd` includes AI extraction costs (should only be Apify)
- `total_characters_scraped` (meaningless for Instagram)

**CSV jobs contaminated by:**
- Instagram jobs in statistics
- Shared RPC functions that don't distinguish job types

### Issue 4: CSV Download Issues
**Instagram CSV (now fixed):**
- Was only showing successfully scraped profiles
- Missing failed rows (not isomorphic to upload)

**CSV Scraper download:**
- Could accidentally pull Instagram data if filters fail

---

## WHAT SHOULD HAVE BEEN DONE

### COMPLETELY SEPARATE SYSTEMS:

**Instagram System:**
```
Tables:
- instagram_jobs (not scraping_jobs)
- instagram_rows (not scraped_rows)
- instagram_company_data

Edge Functions:
- create-instagram-job
- instagram-worker
- instagram-scraper
- download-instagram-csv
- get-instagram-job-status

No shared tables with CSV system
```

**CSV Scraper System:**
```
Tables:
- scraping_jobs
- scraped_rows
- people
- ai_extraction_models

Edge Functions:
- create-scraping-job
- scraper-worker
- extractor-worker
- find-people-worker
- download-csv
- merge-csv
- project-qa
- get-job-status

No shared tables with Instagram system
```

---

## CURRENT BAND-AID APPROACH

All fixes so far have been **filters and exclusions**:
```typescript
// Everywhere we query scraped_rows or scraping_jobs:
.not('job_id', 'like', 'IG%')  // Exclude Instagram
.like('id', 'IG%')              // Include only Instagram
```

**This is fragile and error-prone:**
- Easy to forget a filter
- Performance overhead checking prefixes everywhere
- Logic scattered across 12+ files
- Future developers will make mistakes

---

## RECOMMENDATION

### Option 1: Complete Separation (PROPER FIX)
**Create separate tables for Instagram:**
- Migrate Instagram data to new tables
- Update all edge functions
- Clean up shared table schemas
- Remove all band-aid filters

**Pros:** Clean architecture, no contamination, maintainable
**Cons:** Requires migration, more work upfront

### Option 2: Keep Band-Aids (CURRENT APPROACH)
**Continue with filters everywhere**

**Pros:** No migration needed
**Cons:** 
- Fragile
- Performance overhead
- Easy to break
- Hard to maintain
- Mixed statistics
- Confusing UX

---

## IMMEDIATE ISSUES TO VERIFY

1. **StatsCards** - Currently shows mixed data
2. **get-job-status** - Single endpoint for both systems
3. **Database functions** - RPC functions don't check job type
4. **Cost calculations** - Instagram jobs have wrong costs from AI extraction
5. **Token counts** - Instagram jobs shouldn't have token data
