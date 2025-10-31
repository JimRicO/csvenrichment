-- Fix security warning: Set search_path for the update_updated_at_column function
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate the triggers
CREATE TRIGGER update_scraping_jobs_updated_at
BEFORE UPDATE ON public.scraping_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_scraped_rows_updated_at
BEFORE UPDATE ON public.scraped_rows
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_extraction_models_updated_at
BEFORE UPDATE ON public.ai_extraction_models
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();