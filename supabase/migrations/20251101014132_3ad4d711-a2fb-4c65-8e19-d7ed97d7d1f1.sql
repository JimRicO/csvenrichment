-- Add people search columns to scraped_rows table
ALTER TABLE scraped_rows
ADD COLUMN people_search_status TEXT DEFAULT 'not_started',
ADD COLUMN people_search_error TEXT,
ADD COLUMN team_page_url TEXT,
ADD COLUMN detailed_team_members TEXT,
ADD COLUMN people_searched_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN scraped_rows.people_search_status IS 'Possible values: not_started, processing, completed, failed, no_team_page_found';