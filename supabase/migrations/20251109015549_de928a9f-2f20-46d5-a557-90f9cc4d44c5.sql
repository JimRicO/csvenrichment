-- Add column_order field to instagram_jobs table to preserve original CSV column order
ALTER TABLE instagram_jobs ADD COLUMN IF NOT EXISTS column_order jsonb DEFAULT '[]'::jsonb;