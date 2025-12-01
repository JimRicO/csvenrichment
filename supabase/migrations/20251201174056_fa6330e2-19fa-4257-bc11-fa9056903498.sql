-- Add unique constraint on url column
ALTER TABLE visual_identity ADD CONSTRAINT visual_identity_url_key UNIQUE (url);