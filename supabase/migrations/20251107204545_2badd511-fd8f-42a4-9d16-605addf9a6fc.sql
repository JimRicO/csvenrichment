-- Add column to store original CSV row data
ALTER TABLE public.scraped_rows 
ADD COLUMN original_row_data JSONB DEFAULT '{}'::jsonb;