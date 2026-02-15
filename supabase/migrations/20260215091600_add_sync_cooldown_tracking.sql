/*
  # Add Sync Cooldown Tracking

  1. Changes to google_accounts table
    - Add `last_businesses_sync_at` (timestamptz) - tracks last time businesses were synced
    - Add `last_reviews_sync_at` (timestamptz) - tracks last time reviews were synced
    - Add `businesses_sync_count` (integer) - counts total business syncs for rate limiting
    - Add `reviews_sync_count` (integer) - counts total review syncs for rate limiting
    
  2. Purpose
    - Enable 5-minute cooldown between manual syncs
    - Prevent API rate limit abuse
    - Track sync frequency for analytics
    
  3. Notes
    - Cooldown enforced at API level before making external calls
    - Separate tracking for businesses and reviews allows independent syncing
    - Counters reset daily (handled in application code)
*/

-- Add sync tracking columns to google_accounts table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'google_accounts' AND column_name = 'last_businesses_sync_at'
  ) THEN
    ALTER TABLE google_accounts ADD COLUMN last_businesses_sync_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'google_accounts' AND column_name = 'last_reviews_sync_at'
  ) THEN
    ALTER TABLE google_accounts ADD COLUMN last_reviews_sync_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'google_accounts' AND column_name = 'businesses_sync_count'
  ) THEN
    ALTER TABLE google_accounts ADD COLUMN businesses_sync_count integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'google_accounts' AND column_name = 'reviews_sync_count'
  ) THEN
    ALTER TABLE google_accounts ADD COLUMN reviews_sync_count integer DEFAULT 0;
  END IF;
END $$;