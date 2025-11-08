-- Fix search_path for security
DROP FUNCTION IF EXISTS increment_job_processed(TEXT);
DROP FUNCTION IF EXISTS increment_job_processed_with_cost(TEXT, NUMERIC);

-- Create function to safely increment processed_rows (for failures)
CREATE OR REPLACE FUNCTION increment_job_processed(job_id_param TEXT)
RETURNS TABLE (
  processed_rows INTEGER,
  total_rows INTEGER,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_processed INTEGER;
  current_total INTEGER;
  new_status TEXT;
BEGIN
  -- Get current values
  SELECT j.processed_rows, j.total_rows 
  INTO current_processed, current_total
  FROM scraping_jobs j
  WHERE j.id = job_id_param;
  
  -- Only increment if below limit
  IF current_processed < current_total THEN
    current_processed := current_processed + 1;
    
    -- Determine new status
    IF current_processed >= current_total THEN
      new_status := 'completed';
    ELSE
      new_status := 'processing';
    END IF;
    
    -- Update the job
    UPDATE scraping_jobs
    SET 
      processed_rows = current_processed,
      status = new_status,
      updated_at = now()
    WHERE id = job_id_param;
  ELSIF current_processed >= current_total THEN
    -- Already at limit, just ensure status is completed
    new_status := 'completed';
    UPDATE scraping_jobs
    SET 
      status = new_status,
      updated_at = now()
    WHERE id = job_id_param AND status != 'completed';
  END IF;
  
  -- Return updated values
  RETURN QUERY
  SELECT current_processed, current_total, COALESCE(new_status, (SELECT status FROM scraping_jobs WHERE id = job_id_param));
END;
$$;

-- Create function to safely increment with cost tracking (for successes)
CREATE OR REPLACE FUNCTION increment_job_processed_with_cost(
  job_id_param TEXT,
  cost_increment NUMERIC
)
RETURNS TABLE (
  processed_rows INTEGER,
  total_rows INTEGER,
  total_pages_scraped INTEGER,
  estimated_cost_usd NUMERIC,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_processed INTEGER;
  current_total INTEGER;
  current_pages INTEGER;
  current_cost NUMERIC;
  new_status TEXT;
BEGIN
  -- Get current values
  SELECT 
    j.processed_rows, 
    j.total_rows,
    j.total_pages_scraped,
    j.estimated_cost_usd
  INTO 
    current_processed, 
    current_total,
    current_pages,
    current_cost
  FROM scraping_jobs j
  WHERE j.id = job_id_param;
  
  -- Only increment if below limit
  IF current_processed < current_total THEN
    current_processed := current_processed + 1;
    current_pages := current_pages + 1;
    current_cost := current_cost + cost_increment;
    
    -- Determine new status
    IF current_processed >= current_total THEN
      new_status := 'completed';
    ELSE
      new_status := 'processing';
    END IF;
    
    -- Update the job
    UPDATE scraping_jobs
    SET 
      processed_rows = current_processed,
      total_pages_scraped = current_pages,
      estimated_cost_usd = current_cost,
      status = new_status,
      updated_at = now()
    WHERE id = job_id_param;
  ELSIF current_processed >= current_total THEN
    -- Already at limit, just ensure status is completed
    new_status := 'completed';
    UPDATE scraping_jobs
    SET 
      status = new_status,
      updated_at = now()
    WHERE id = job_id_param AND status != 'completed';
  END IF;
  
  -- Return updated values
  RETURN QUERY
  SELECT current_processed, current_total, current_pages, current_cost, COALESCE(new_status, (SELECT status FROM scraping_jobs WHERE id = job_id_param));
END;
$$;