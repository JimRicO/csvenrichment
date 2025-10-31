-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- Table: ai_extraction_models
-- Configuration table for AI models and extraction prompts
CREATE TABLE public.ai_extraction_models (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_name TEXT NOT NULL,
  model_version TEXT NOT NULL,
  extraction_prompt TEXT NOT NULL,
  input_cost_per_mtok DECIMAL(10, 2) NOT NULL,
  output_cost_per_mtok DECIMAL(10, 2) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table: scraping_jobs
-- Primary job tracking table
CREATE TABLE public.scraping_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  total_rows INT NOT NULL DEFAULT 0,
  processed_rows INT NOT NULL DEFAULT 0,
  total_pages_scraped INT NOT NULL DEFAULT 0,
  total_characters_scraped BIGINT NOT NULL DEFAULT 0,
  total_input_tokens BIGINT NOT NULL DEFAULT 0,
  total_output_tokens BIGINT NOT NULL DEFAULT 0,
  estimated_cost_usd DECIMAL(10, 4) NOT NULL DEFAULT 0,
  extraction_config JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table: scraped_rows
-- Individual row tracking with dual status workflow
CREATE TABLE public.scraped_rows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES public.scraping_jobs(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL,
  website_url TEXT NOT NULL,
  model_id UUID REFERENCES public.ai_extraction_models(id),
  
  -- Scraping stage
  scraped_content TEXT,
  scrape_status TEXT NOT NULL DEFAULT 'pending' CHECK (scrape_status IN ('pending', 'completed', 'failed')),
  scrape_error_message TEXT,
  scraped_at TIMESTAMP WITH TIME ZONE,
  
  -- Extraction stage
  extraction_status TEXT NOT NULL DEFAULT 'pending' CHECK (extraction_status IN ('pending', 'completed', 'failed')),
  business_description TEXT,
  team_members TEXT,
  social_media JSONB,
  whatsapp_contact TEXT,
  custom_answer_1 TEXT,
  custom_answer_2 TEXT,
  extraction_error_message TEXT,
  extracted_at TIMESTAMP WITH TIME ZONE,
  
  -- Token tracking
  input_tokens INT DEFAULT 0,
  output_tokens INT DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for worker queries
CREATE INDEX idx_scraped_rows_scrape_pending ON public.scraped_rows(created_at) WHERE scrape_status = 'pending';
CREATE INDEX idx_scraped_rows_extraction_pending ON public.scraped_rows(created_at) WHERE scrape_status = 'completed' AND extraction_status = 'pending';
CREATE INDEX idx_scraping_jobs_project_id ON public.scraping_jobs(project_id);
CREATE INDEX idx_scraped_rows_job_id ON public.scraped_rows(job_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for automatic timestamp updates
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

-- Enable RLS
ALTER TABLE public.scraping_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scraped_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_extraction_models ENABLE ROW LEVEL SECURITY;

-- RLS Policies for scraping_jobs (read-only for authenticated users)
CREATE POLICY "Allow authenticated users to read scraping_jobs"
ON public.scraping_jobs FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert scraping_jobs"
ON public.scraping_jobs FOR INSERT
TO authenticated
WITH CHECK (true);

-- RLS Policies for scraped_rows (read-only for authenticated users)
CREATE POLICY "Allow authenticated users to read scraped_rows"
ON public.scraped_rows FOR SELECT
TO authenticated
USING (true);

-- RLS Policies for ai_extraction_models (read-only for authenticated users)
CREATE POLICY "Allow authenticated users to read ai_extraction_models"
ON public.ai_extraction_models FOR SELECT
TO authenticated
USING (true);

-- Allow service role full access for workers
CREATE POLICY "Allow service role full access to scraping_jobs"
ON public.scraping_jobs FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow service role full access to scraped_rows"
ON public.scraped_rows FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow service role full access to ai_extraction_models"
ON public.ai_extraction_models FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Insert default Claude Haiku model configuration
INSERT INTO public.ai_extraction_models (
  model_name,
  model_version,
  extraction_prompt,
  input_cost_per_mtok,
  output_cost_per_mtok,
  is_active,
  description
) VALUES (
  'claude-sonnet-4-5',
  '4.5',
  'You are a business data extraction assistant. Analyze the provided website content and extract the following information in a structured format:

1. Business Description: Provide a 2-3 sentence summary of what the business does
2. Team Members: List all team member names you can find
3. Social Media: Extract social media handles/URLs for Instagram, Facebook, LinkedIn, and Twitter/X
4. WhatsApp Contact: Find any WhatsApp numbers or group links
5. Custom Fields: Answer any custom questions based on the content

Return the data in JSON format with these exact keys: business_description, team_members (array), social_media (object with instagram, facebook, linkedin, twitter keys), whatsapp_contact, custom_answer_1, custom_answer_2.',
  3.00,
  15.00,
  true,
  'Default Claude Sonnet 4.5 model - high quality extraction with superior reasoning'
);