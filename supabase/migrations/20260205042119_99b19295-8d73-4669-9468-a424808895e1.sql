-- Add column to store persisted media URLs for Visual DNA gallery
ALTER TABLE public.enriched_clubs
ADD COLUMN IF NOT EXISTS visual_dna_media_urls jsonb DEFAULT '[]'::jsonb;