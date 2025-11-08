-- Migration: Change job_id from UUID to TEXT with prefixes
-- This migration changes the scraping_jobs.id and all related foreign keys from UUID to TEXT
-- to support prefixed job IDs (RICH for enrichment, IG for Instagram)

-- Step 1: Drop foreign key constraints
ALTER TABLE scraped_rows DROP CONSTRAINT IF EXISTS scraped_rows_job_id_fkey;
ALTER TABLE people DROP CONSTRAINT IF EXISTS people_job_id_fkey;
ALTER TABLE instagram_company_data DROP CONSTRAINT IF EXISTS instagram_company_data_job_id_fkey;

-- Step 2: Change scraping_jobs.id from UUID to TEXT
ALTER TABLE scraping_jobs ALTER COLUMN id TYPE TEXT USING id::TEXT;
ALTER TABLE scraping_jobs ALTER COLUMN id DROP DEFAULT;

-- Step 3: Change all foreign key columns to TEXT
ALTER TABLE scraped_rows ALTER COLUMN job_id TYPE TEXT USING job_id::TEXT;
ALTER TABLE people ALTER COLUMN job_id TYPE TEXT USING job_id::TEXT;
ALTER TABLE instagram_company_data ALTER COLUMN job_id TYPE TEXT USING job_id::TEXT;

-- Step 4: Re-add foreign key constraints
ALTER TABLE scraped_rows 
  ADD CONSTRAINT scraped_rows_job_id_fkey 
  FOREIGN KEY (job_id) REFERENCES scraping_jobs(id) ON DELETE CASCADE;

ALTER TABLE people 
  ADD CONSTRAINT people_job_id_fkey 
  FOREIGN KEY (job_id) REFERENCES scraping_jobs(id) ON DELETE CASCADE;

ALTER TABLE instagram_company_data 
  ADD CONSTRAINT instagram_company_data_job_id_fkey 
  FOREIGN KEY (job_id) REFERENCES scraping_jobs(id) ON DELETE CASCADE;