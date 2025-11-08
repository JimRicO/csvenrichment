-- Create dedicated Instagram jobs table (no AI extraction fields)
CREATE TABLE IF NOT EXISTS public.instagram_jobs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  total_rows INTEGER NOT NULL DEFAULT 0,
  processed_rows INTEGER NOT NULL DEFAULT 0,
  estimated_cost_usd NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create dedicated Instagram rows table (no AI extraction fields)
CREATE TABLE IF NOT EXISTS public.instagram_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id TEXT NOT NULL REFERENCES public.instagram_jobs(id) ON DELETE CASCADE,
  instagram_url TEXT NOT NULL,
  scrape_status TEXT NOT NULL DEFAULT 'pending',
  scrape_error_message TEXT,
  scraped_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  original_row_data JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.instagram_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instagram_rows ENABLE ROW LEVEL SECURITY;

-- RLS Policies for instagram_jobs
CREATE POLICY "Allow public read access to instagram_jobs" 
ON public.instagram_jobs 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert to instagram_jobs" 
ON public.instagram_jobs 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow service role full access to instagram_jobs" 
ON public.instagram_jobs 
FOR ALL 
USING (true)
WITH CHECK (true);

-- RLS Policies for instagram_rows
CREATE POLICY "Allow public read access to instagram_rows" 
ON public.instagram_rows 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert to instagram_rows" 
ON public.instagram_rows 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow service role full access to instagram_rows" 
ON public.instagram_rows 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_instagram_jobs_status ON public.instagram_jobs(status);
CREATE INDEX IF NOT EXISTS idx_instagram_jobs_created_at ON public.instagram_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_instagram_rows_job_id ON public.instagram_rows(job_id);
CREATE INDEX IF NOT EXISTS idx_instagram_rows_scrape_status ON public.instagram_rows(scrape_status);

-- Create update trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_instagram_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_instagram_jobs_updated_at
BEFORE UPDATE ON public.instagram_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_instagram_updated_at();

CREATE TRIGGER update_instagram_rows_updated_at
BEFORE UPDATE ON public.instagram_rows
FOR EACH ROW
EXECUTE FUNCTION public.update_instagram_updated_at();

-- Create RPC function for Instagram job increment
CREATE OR REPLACE FUNCTION public.increment_instagram_job_processed(job_id_param TEXT, cost_increment NUMERIC)
RETURNS TABLE(processed_rows INTEGER, total_rows INTEGER, estimated_cost_usd NUMERIC, status TEXT)
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
  FROM instagram_jobs j
  WHERE j.id = job_id_param;
  
  IF current_processed < current_total THEN
    current_processed := current_processed + 1;
    current_cost := current_cost + cost_increment;
    
    IF current_processed >= current_total THEN
      new_status := 'completed';
    ELSE
      new_status := 'processing';
    END IF;
    
    UPDATE instagram_jobs
    SET 
      processed_rows = current_processed,
      estimated_cost_usd = current_cost,
      status = new_status,
      updated_at = now()
    WHERE id = job_id_param;
  ELSIF current_processed >= current_total THEN
    new_status := 'completed';
    UPDATE instagram_jobs
    SET 
      status = new_status,
      updated_at = now()
    WHERE id = job_id_param AND status != 'completed';
  END IF;
  
  RETURN QUERY
  SELECT current_processed, current_total, current_cost, COALESCE(new_status, (SELECT status FROM instagram_jobs WHERE id = job_id_param));
END;
$$;