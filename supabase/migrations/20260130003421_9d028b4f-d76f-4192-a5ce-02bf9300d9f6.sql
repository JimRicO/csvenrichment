-- Create people_jobs table for job tracking
CREATE TABLE IF NOT EXISTS public.people_jobs (
  id text PRIMARY KEY,
  project_id text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  total_rows integer NOT NULL DEFAULT 0,
  processed_rows integer NOT NULL DEFAULT 0,
  estimated_cost_usd numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.people_jobs ENABLE ROW LEVEL SECURITY;

-- RLS policies for people_jobs (use IF NOT EXISTS pattern)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'people_jobs' AND policyname = 'Allow public insert to people_jobs') THEN
    CREATE POLICY "Allow public insert to people_jobs" ON public.people_jobs FOR INSERT WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'people_jobs' AND policyname = 'Allow public read access to people_jobs') THEN
    CREATE POLICY "Allow public read access to people_jobs" ON public.people_jobs FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'people_jobs' AND policyname = 'Allow service role full access to people_jobs') THEN
    CREATE POLICY "Allow service role full access to people_jobs" ON public.people_jobs FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Create people_rows table for processing queue
CREATE TABLE IF NOT EXISTS public.people_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id text NOT NULL REFERENCES public.people_jobs(id) ON DELETE CASCADE,
  person_name text NOT NULL,
  context text,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.people_rows ENABLE ROW LEVEL SECURITY;

-- RLS policies for people_rows
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'people_rows' AND policyname = 'Allow public insert to people_rows') THEN
    CREATE POLICY "Allow public insert to people_rows" ON public.people_rows FOR INSERT WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'people_rows' AND policyname = 'Allow public read access to people_rows') THEN
    CREATE POLICY "Allow public read access to people_rows" ON public.people_rows FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'people_rows' AND policyname = 'Allow service role full access to people_rows') THEN
    CREATE POLICY "Allow service role full access to people_rows" ON public.people_rows FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Create enriched_people table for research results
CREATE TABLE IF NOT EXISTS public.enriched_people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id text NOT NULL REFERENCES public.people_jobs(id) ON DELETE CASCADE,
  people_row_id uuid NOT NULL REFERENCES public.people_rows(id) ON DELETE CASCADE,
  person_name text NOT NULL,
  context text,
  biography text,
  biography_source text,
  job_title text,
  company text,
  role_source text,
  previous_roles jsonb DEFAULT '[]'::jsonb,
  education jsonb DEFAULT '[]'::jsonb,
  notable_achievements text,
  achievements_source text,
  email text,
  email_source text,
  phone text,
  phone_source text,
  linkedin_url text,
  twitter_handle text,
  other_socials jsonb DEFAULT '{}'::jsonb,
  all_citations jsonb DEFAULT '[]'::jsonb,
  confidence_score text DEFAULT 'medium',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.enriched_people ENABLE ROW LEVEL SECURITY;

-- RLS policies for enriched_people
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'enriched_people' AND policyname = 'Allow public read access to enriched_people') THEN
    CREATE POLICY "Allow public read access to enriched_people" ON public.enriched_people FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'enriched_people' AND policyname = 'Allow service role full access to enriched_people') THEN
    CREATE POLICY "Allow service role full access to enriched_people" ON public.enriched_people FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Create RPC function for atomic job progress updates
CREATE OR REPLACE FUNCTION public.increment_people_job_processed(
  job_id_param text,
  cost_increment numeric
)
RETURNS TABLE(processed_rows integer, total_rows integer, estimated_cost_usd numeric, status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_processed INTEGER;
  current_total INTEGER;
  current_cost NUMERIC;
  new_status TEXT;
BEGIN
  SELECT j.processed_rows, j.total_rows, j.estimated_cost_usd
  INTO current_processed, current_total, current_cost
  FROM people_jobs j
  WHERE j.id = job_id_param;
  
  IF current_processed < current_total THEN
    current_processed := current_processed + 1;
    current_cost := current_cost + cost_increment;
    
    IF current_processed >= current_total THEN
      new_status := 'completed';
    ELSE
      new_status := 'processing';
    END IF;
    
    UPDATE people_jobs
    SET 
      processed_rows = current_processed,
      estimated_cost_usd = current_cost,
      status = new_status,
      updated_at = now()
    WHERE id = job_id_param;
  ELSIF current_processed >= current_total THEN
    new_status := 'completed';
    UPDATE people_jobs
    SET 
      status = new_status,
      updated_at = now()
    WHERE id = job_id_param AND people_jobs.status != 'completed';
  END IF;
  
  RETURN QUERY
  SELECT current_processed, current_total, current_cost, COALESCE(new_status, (SELECT j.status FROM people_jobs j WHERE j.id = job_id_param));
END;
$$;

-- Create triggers for updated_at (drop first if exists to avoid errors)
DROP TRIGGER IF EXISTS update_people_jobs_updated_at ON public.people_jobs;
CREATE TRIGGER update_people_jobs_updated_at
  BEFORE UPDATE ON public.people_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_enriched_people_updated_at ON public.enriched_people;
CREATE TRIGGER update_enriched_people_updated_at
  BEFORE UPDATE ON public.enriched_people
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();