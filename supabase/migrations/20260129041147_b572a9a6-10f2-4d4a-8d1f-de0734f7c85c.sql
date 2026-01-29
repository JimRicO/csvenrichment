-- Add logo columns to scraped_rows table for Website Scraper module
ALTER TABLE public.scraped_rows
ADD COLUMN logo_url text,
ADD COLUMN logo_storage_url text;