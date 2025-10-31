-- Add conversation column to scraping_jobs table
ALTER TABLE public.scraping_jobs 
ADD COLUMN conversation JSONB DEFAULT '[]'::jsonb;