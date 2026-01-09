-- Add club_locations JSONB column to store detailed location information
ALTER TABLE public.scraped_rows ADD COLUMN club_locations jsonb DEFAULT '[]'::jsonb;