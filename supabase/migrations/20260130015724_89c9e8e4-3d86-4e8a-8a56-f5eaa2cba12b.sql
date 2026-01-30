-- Add new columns to enriched_people table for comprehensive intelligence data

-- Identity fields
ALTER TABLE public.enriched_people ADD COLUMN IF NOT EXISTS aliases JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.enriched_people ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Current role fields
ALTER TABLE public.enriched_people ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE public.enriched_people ADD COLUMN IF NOT EXISTS start_date TEXT;
ALTER TABLE public.enriched_people ADD COLUMN IF NOT EXISTS reports_to TEXT;

-- Career history enhancements
ALTER TABLE public.enriched_people ADD COLUMN IF NOT EXISTS career_highlights JSONB DEFAULT '[]'::jsonb;

-- News and public presence
ALTER TABLE public.enriched_people ADD COLUMN IF NOT EXISTS recent_news JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.enriched_people ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE public.enriched_people ADD COLUMN IF NOT EXISTS notable_content JSONB DEFAULT '[]'::jsonb;

-- Contact enhancements
ALTER TABLE public.enriched_people ADD COLUMN IF NOT EXISTS email_confidence TEXT;
ALTER TABLE public.enriched_people ADD COLUMN IF NOT EXISTS email_pattern TEXT;
ALTER TABLE public.enriched_people ADD COLUMN IF NOT EXISTS location TEXT;

-- Sales insights
ALTER TABLE public.enriched_people ADD COLUMN IF NOT EXISTS communication_style TEXT;
ALTER TABLE public.enriched_people ADD COLUMN IF NOT EXISTS key_interests JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.enriched_people ADD COLUMN IF NOT EXISTS conversation_starters JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.enriched_people ADD COLUMN IF NOT EXISTS quotes JSONB DEFAULT '[]'::jsonb;

-- Research quality
ALTER TABLE public.enriched_people ADD COLUMN IF NOT EXISTS research_summary TEXT;