-- Add policies to allow anonymous users to read data
-- This is appropriate for a public scraping tool

-- Allow anyone to read scraping_jobs
CREATE POLICY "Allow public read access to scraping_jobs"
ON public.scraping_jobs FOR SELECT
TO anon
USING (true);

-- Allow anyone to read scraped_rows
CREATE POLICY "Allow public read access to scraped_rows"
ON public.scraped_rows FOR SELECT
TO anon
USING (true);

-- Allow anyone to read ai_extraction_models
CREATE POLICY "Allow public read access to ai_extraction_models"
ON public.ai_extraction_models FOR SELECT
TO anon
USING (true);

-- Allow anon users to insert scraping jobs (for creating new jobs)
CREATE POLICY "Allow public insert to scraping_jobs"
ON public.scraping_jobs FOR INSERT
TO anon
WITH CHECK (true);