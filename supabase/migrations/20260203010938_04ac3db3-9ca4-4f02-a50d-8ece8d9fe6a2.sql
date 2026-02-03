-- Add key_people column to enriched_clubs table
-- Stores array of key individuals (owner, CEO, management, founders, etc.)
ALTER TABLE public.enriched_clubs 
ADD COLUMN IF NOT EXISTS key_people JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.enriched_clubs.key_people IS 'Array of key individuals: [{name, role, context, source_url}]';