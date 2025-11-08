-- Create instagram_company_data table for Instagram Intelligence Scraping
CREATE TABLE IF NOT EXISTS public.instagram_company_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.scraping_jobs(id) ON DELETE CASCADE,
  scraped_row_id UUID NOT NULL REFERENCES public.scraped_rows(id) ON DELETE CASCADE,
  
  -- Instagram URL
  instagram_url TEXT NOT NULL,
  
  -- Profile Header Fields (8 fields)
  username TEXT NOT NULL,
  full_name TEXT,
  biography TEXT,
  external_url TEXT,
  followers_count INTEGER DEFAULT 0,
  posts_count INTEGER DEFAULT 0,
  is_business_account BOOLEAN DEFAULT false,
  verified BOOLEAN DEFAULT false,
  
  -- Competitive Intelligence (JSONB array)
  related_profiles JSONB DEFAULT '[]'::jsonb,
  
  -- Latest Posts (JSONB array of 3-5 posts)
  latest_posts JSONB DEFAULT '[]'::jsonb,
  
  -- Metadata
  scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(scraped_row_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_instagram_company_job_id ON public.instagram_company_data(job_id);
CREATE INDEX IF NOT EXISTS idx_instagram_company_username ON public.instagram_company_data(username);

-- Enable RLS
ALTER TABLE public.instagram_company_data ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (public read access for competitive intelligence data)
CREATE POLICY "Allow public read access" ON public.instagram_company_data 
  FOR SELECT 
  USING (true);

CREATE POLICY "Allow service role full access" ON public.instagram_company_data 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_instagram_company_updated_at
  BEFORE UPDATE ON public.instagram_company_data
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();