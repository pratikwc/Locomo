-- Add auto-reply settings to businesses table
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS auto_reply_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_reply_min_rating integer NOT NULL DEFAULT 4;

-- Add post_type to posts table
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS post_type text DEFAULT 'STANDARD';

-- Add indexes to posts for faster lookups
CREATE INDEX IF NOT EXISTS posts_business_id_idx ON posts (business_id);
CREATE INDEX IF NOT EXISTS posts_status_idx ON posts (status);
