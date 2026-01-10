-- Create storage bucket for Instagram post images
INSERT INTO storage.buckets (id, name, public)
VALUES ('instagram-post-images', 'instagram-post-images', true);

-- Allow public read access for post images
CREATE POLICY "Public read access for instagram post images"
ON storage.objects FOR SELECT
USING (bucket_id = 'instagram-post-images');

-- Allow insert/upsert for post images (service role)
CREATE POLICY "Allow insert for instagram post images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'instagram-post-images');

-- Allow update for instagram post images (for upsert)
CREATE POLICY "Allow update for instagram post images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'instagram-post-images');