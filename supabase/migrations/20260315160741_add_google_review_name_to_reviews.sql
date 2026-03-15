/*
  # Add google_review_name column to reviews table

  1. Changes
    - `reviews` table: adds `google_review_name` column to store the full Google resource name
      (e.g. "locations/12345/reviews/abcdef") which is required to post replies back to Google
      via the My Business Reviews API v1

  2. Why
    - The existing `google_review_id` only stores the short ID, not the full resource path
    - The Google My Business Reviews API v1 requires the full name path for the reply endpoint:
      PUT https://mybusinessreviews.googleapis.com/v1/{name}/reply
    - Without this field, we cannot push replies back to Google from the app

  3. Notes
    - Column is nullable so existing rows are not affected
    - New syncs will populate this field going forward
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reviews' AND column_name = 'google_review_name'
  ) THEN
    ALTER TABLE reviews ADD COLUMN google_review_name text;
  END IF;
END $$;
