-- Add Perplexity data columns to enriched_clubs table
ALTER TABLE public.enriched_clubs
ADD COLUMN IF NOT EXISTS perplexity_description text,
ADD COLUMN IF NOT EXISTS founder_info text,
ADD COLUMN IF NOT EXISTS founding_year text,
ADD COLUMN IF NOT EXISTS recent_activities jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS perplexity_citations jsonb DEFAULT '[]'::jsonb;