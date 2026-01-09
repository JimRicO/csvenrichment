-- Add Contact Information columns
ALTER TABLE scraped_rows ADD COLUMN phone_number text;
ALTER TABLE scraped_rows ADD COLUMN email text;
ALTER TABLE scraped_rows ADD COLUMN address text;
ALTER TABLE scraped_rows ADD COLUMN opening_hours text;

-- Add Facility Information columns
ALTER TABLE scraped_rows ADD COLUMN number_of_clubs integer;
ALTER TABLE scraped_rows ADD COLUMN number_of_courts integer;
ALTER TABLE scraped_rows ADD COLUMN facilities_details text;