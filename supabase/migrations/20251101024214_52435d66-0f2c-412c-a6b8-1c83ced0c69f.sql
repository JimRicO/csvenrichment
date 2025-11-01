-- Add description field to people table
ALTER TABLE public.people 
ADD COLUMN description text;

COMMENT ON COLUMN public.people.description IS 'Full bio/description text about the person from the team page';