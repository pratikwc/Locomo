/*
  # Add GMB-related fields to google_accounts table

  ## Overview
  Adds fields to store Google My Business account information and user profile data
  from Google OAuth.

  ## Changes
  
  ### Modified Tables
  - `google_accounts`
    - Add `display_name` (text) - User's name from Google profile
    - Add `profile_photo_url` (text) - User's profile photo URL from Google
    - Add `gmb_account_name` (text) - GMB account identifier (e.g., accounts/123456)
    - Add `has_gmb_access` (boolean) - Whether user has access to GMB
    - Add `onboarding_status` (text) - GMB onboarding state
  
  ## Security
  - No changes to RLS policies needed (existing policies cover new fields)
*/

-- Add GMB-related fields to google_accounts table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'google_accounts' AND column_name = 'display_name'
  ) THEN
    ALTER TABLE google_accounts ADD COLUMN display_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'google_accounts' AND column_name = 'profile_photo_url'
  ) THEN
    ALTER TABLE google_accounts ADD COLUMN profile_photo_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'google_accounts' AND column_name = 'gmb_account_name'
  ) THEN
    ALTER TABLE google_accounts ADD COLUMN gmb_account_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'google_accounts' AND column_name = 'has_gmb_access'
  ) THEN
    ALTER TABLE google_accounts ADD COLUMN has_gmb_access boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'google_accounts' AND column_name = 'onboarding_status'
  ) THEN
    ALTER TABLE google_accounts ADD COLUMN onboarding_status text DEFAULT 'not_started' 
      CHECK (onboarding_status IN ('not_started', 'in_progress', 'completed', 'no_account'));
  END IF;
END $$;