-- Fix the ambiguous column reference in increment_instagram_job_processed
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
    WHERE id = job_id_param AND instagram_jobs.status != 'completed';
  END IF;
  
  -- Fix: Fully qualify the status column with table alias to avoid ambiguity
  RETURN QUERY
  SELECT current_processed, current_total, current_cost, COALESCE(new_status, (SELECT j.status FROM instagram_jobs j WHERE j.id = job_id_param));
END;
$$;