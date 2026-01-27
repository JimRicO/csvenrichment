-- Create enrichment_jobs table
CREATE TABLE public.enrichment_jobs (
  id text PRIMARY KEY,
  project_id text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  total_rows integer NOT NULL DEFAULT 0,
  processed_rows integer NOT NULL DEFAULT 0,
  estimated_cost_usd numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create enrichment_rows table
CREATE TABLE public.enrichment_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id text NOT NULL REFERENCES public.enrichment_jobs(id) ON DELETE CASCADE,
  club_name text NOT NULL,
  website_url text NOT NULL,
  instagram_handle text,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create enriched_clubs table
CREATE TABLE public.enriched_clubs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id text NOT NULL REFERENCES public.enrichment_jobs(id) ON DELETE CASCADE,
  enrichment_row_id uuid NOT NULL REFERENCES public.enrichment_rows(id) ON DELETE CASCADE,
  club_name text NOT NULL,
  website_url text,
  instagram_handle text,
  logo_storage_url text,
  instagram_followers integer,
  instagram_bio text,
  instagram_profile_pic_url text,
  address text,
  phone text,
  email text,
  color_palette jsonb DEFAULT '{}'::jsonb,
  fonts jsonb DEFAULT '{}'::jsonb,
  description text,
  attitude text,
  aesthetics text,
  raw_branding_data jsonb DEFAULT '{}'::jsonb,
  raw_instagram_data jsonb DEFAULT '{}'::jsonb,
  scraped_content text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.enrichment_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrichment_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enriched_clubs ENABLE ROW LEVEL SECURITY;

-- RLS policies for enrichment_jobs
CREATE POLICY "Allow public read access to enrichment_jobs"
  ON public.enrichment_jobs FOR SELECT USING (true);

CREATE POLICY "Allow public insert to enrichment_jobs"
  ON public.enrichment_jobs FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow service role full access to enrichment_jobs"
  ON public.enrichment_jobs FOR ALL USING (true) WITH CHECK (true);

-- RLS policies for enrichment_rows
CREATE POLICY "Allow public read access to enrichment_rows"
  ON public.enrichment_rows FOR SELECT USING (true);

CREATE POLICY "Allow public insert to enrichment_rows"
  ON public.enrichment_rows FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow service role full access to enrichment_rows"
  ON public.enrichment_rows FOR ALL USING (true) WITH CHECK (true);

-- RLS policies for enriched_clubs
CREATE POLICY "Allow public read access to enriched_clubs"
  ON public.enriched_clubs FOR SELECT USING (true);

CREATE POLICY "Allow service role full access to enriched_clubs"
  ON public.enriched_clubs FOR ALL USING (true) WITH CHECK (true);

-- Create increment function for enrichment jobs
CREATE OR REPLACE FUNCTION public.increment_enrichment_job_processed(job_id_param text, cost_increment numeric)
RETURNS TABLE(processed_rows integer, total_rows integer, estimated_cost_usd numeric, status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_processed INTEGER;
  current_total INTEGER;
  current_cost NUMERIC;
  new_status TEXT;
BEGIN
  SELECT j.processed_rows, j.total_rows, j.estimated_cost_usd
  INTO current_processed, current_total, current_cost
  FROM enrichment_jobs j
  WHERE j.id = job_id_param;
  
  IF current_processed < current_total THEN
    current_processed := current_processed + 1;
    current_cost := current_cost + cost_increment;
    
    IF current_processed >= current_total THEN
      new_status := 'completed';
    ELSE
      new_status := 'processing';
    END IF;
    
    UPDATE enrichment_jobs
    SET 
      processed_rows = current_processed,
      estimated_cost_usd = current_cost,
      status = new_status,
      updated_at = now()
    WHERE id = job_id_param;
  ELSIF current_processed >= current_total THEN
    new_status := 'completed';
    UPDATE enrichment_jobs
    SET 
      status = new_status,
      updated_at = now()
    WHERE id = job_id_param AND enrichment_jobs.status != 'completed';
  END IF;
  
  RETURN QUERY
  SELECT current_processed, current_total, current_cost, COALESCE(new_status, (SELECT j.status FROM enrichment_jobs j WHERE j.id = job_id_param));
END;
$$;

-- Create updated_at trigger for enrichment_jobs
CREATE TRIGGER update_enrichment_jobs_updated_at
  BEFORE UPDATE ON public.enrichment_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create updated_at trigger for enriched_clubs
CREATE TRIGGER update_enriched_clubs_updated_at
  BEFORE UPDATE ON public.enriched_clubs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for enrichment tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.enrichment_jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.enriched_clubs;