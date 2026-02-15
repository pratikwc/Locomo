/*
  # Update onboarding_status values

  ## Overview
  Updates the onboarding_status check constraint to include new status values
  for better error handling and async verification flow.

  ## Changes
  - Modify `google_accounts.onboarding_status` constraint
    - Add 'pending_verification' - Account connected, GMB verification in progress
    - Add 'verification_failed' - GMB verification failed due to API errors
    - Add 'auth_failed' - Authentication/token refresh failed
  - Existing values retained: 'not_started', 'in_progress', 'completed', 'no_account'

  ## Security
  - No RLS changes needed
*/

-- Drop the existing constraint
ALTER TABLE google_accounts 
  DROP CONSTRAINT IF EXISTS google_accounts_onboarding_status_check;

-- Add updated constraint with new values
ALTER TABLE google_accounts 
  ADD CONSTRAINT google_accounts_onboarding_status_check 
  CHECK (onboarding_status IN (
    'not_started', 
    'in_progress', 
    'completed', 
    'no_account',
    'pending_verification',
    'verification_failed',
    'auth_failed'
  ));
