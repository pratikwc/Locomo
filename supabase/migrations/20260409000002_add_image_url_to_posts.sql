-- Add image_url column to posts table for AI-generated images
ALTER TABLE posts ADD COLUMN IF NOT EXISTS image_url text;
