-- Fix instagram_company_data foreign key to point to instagram_rows instead of scraped_rows

-- Drop the old foreign key constraint
ALTER TABLE instagram_company_data 
DROP CONSTRAINT IF EXISTS instagram_company_data_scraped_row_id_fkey;

-- Add new foreign key constraint pointing to instagram_rows
ALTER TABLE instagram_company_data
ADD CONSTRAINT instagram_company_data_scraped_row_id_fkey 
FOREIGN KEY (scraped_row_id) 
REFERENCES instagram_rows(id) 
ON DELETE CASCADE;