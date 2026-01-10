-- Add columns to track multi-page crawling
ALTER TABLE public.scraped_rows 
ADD COLUMN IF NOT EXISTS pages_scraped integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS discovered_links jsonb DEFAULT '[]'::jsonb;