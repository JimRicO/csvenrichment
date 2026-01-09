-- Create storage bucket for Instagram profile pictures
INSERT INTO storage.buckets (id, name, public)
VALUES ('instagram-profile-pics', 'instagram-profile-pics', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to instagram profile pics
CREATE POLICY "Public read access for instagram profile pics"
ON storage.objects FOR SELECT
USING (bucket_id = 'instagram-profile-pics');

-- Allow service role to upload instagram profile pics
CREATE POLICY "Service role upload for instagram profile pics"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'instagram-profile-pics');

-- Add profile_pic_storage_url column to instagram_company_data
ALTER TABLE public.instagram_company_data
ADD COLUMN IF NOT EXISTS profile_pic_storage_url text;