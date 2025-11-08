-- Add CHECK constraint to prevent processed_rows from exceeding total_rows
ALTER TABLE scraping_jobs 
ADD CONSTRAINT processed_rows_cannot_exceed_total 
CHECK (processed_rows <= total_rows);