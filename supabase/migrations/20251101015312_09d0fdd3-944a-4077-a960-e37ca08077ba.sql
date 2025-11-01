-- Create people table to store team members
CREATE TABLE public.people (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL,
  scraped_row_id UUID NOT NULL,
  name TEXT NOT NULL,
  title TEXT,
  website_url TEXT,
  source TEXT NOT NULL DEFAULT 'automated',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (matching other tables)
CREATE POLICY "Allow public read access to people" 
ON public.people 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert to people" 
ON public.people 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow service role full access to people" 
ON public.people 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_people_updated_at
BEFORE UPDATE ON public.people
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_people_job_id ON public.people(job_id);
CREATE INDEX idx_people_scraped_row_id ON public.people(scraped_row_id);