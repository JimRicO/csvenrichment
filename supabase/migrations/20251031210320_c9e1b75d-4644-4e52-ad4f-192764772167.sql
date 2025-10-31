-- Add 'processing' as valid status for scrape_status and extraction_status
ALTER TABLE public.scraped_rows DROP CONSTRAINT IF EXISTS scraped_rows_scrape_status_check;
ALTER TABLE public.scraped_rows DROP CONSTRAINT IF EXISTS scraped_rows_extraction_status_check;

ALTER TABLE public.scraped_rows 
ADD CONSTRAINT scraped_rows_scrape_status_check 
CHECK (scrape_status IN ('pending', 'processing', 'completed', 'failed'));

ALTER TABLE public.scraped_rows 
ADD CONSTRAINT scraped_rows_extraction_status_check 
CHECK (extraction_status IN ('pending', 'processing', 'completed', 'failed'));