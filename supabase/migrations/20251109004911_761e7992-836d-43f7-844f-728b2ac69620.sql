-- Add retry tracking to instagram_rows table
ALTER TABLE instagram_rows 
ADD COLUMN IF NOT EXISTS retry_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_processing_at timestamp with time zone;

-- Create index for faster timeout detection
CREATE INDEX IF NOT EXISTS idx_instagram_rows_processing_timeout 
ON instagram_rows(scrape_status, last_processing_at) 
WHERE scrape_status = 'processing';