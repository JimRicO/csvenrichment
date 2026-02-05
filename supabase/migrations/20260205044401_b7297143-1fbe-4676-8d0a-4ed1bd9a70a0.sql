-- Add score_factors column to store the detailed breakdown of invisibility score calculation
ALTER TABLE public.enriched_clubs
ADD COLUMN IF NOT EXISTS score_factors JSONB DEFAULT NULL;