CREATE TABLE public.visual_identity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  branding_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.visual_identity ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_visual_identity_url ON public.visual_identity(url);