-- Fix instagram_company_data job_id foreign key to point to instagram_jobs instead of scraping_jobs

-- Drop the incorrect foreign key constraint
ALTER TABLE instagram_company_data 
DROP CONSTRAINT IF EXISTS instagram_company_data_job_id_fkey;

-- Add correct foreign key constraint pointing to instagram_jobs
ALTER TABLE instagram_company_data
ADD CONSTRAINT instagram_company_data_job_id_fkey 
FOREIGN KEY (job_id) 
REFERENCES instagram_jobs(id) 
ON DELETE CASCADE;