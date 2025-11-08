-- Add column to store raw Apify response data
ALTER TABLE instagram_company_data 
ADD COLUMN raw_apify_data JSONB DEFAULT '{}'::jsonb;