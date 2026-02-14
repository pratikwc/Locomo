/*
  # Add RLS Policies for OTP Verifications

  ## Changes
  - Add policies to allow OTP insertion and verification
  - OTP table needs to be accessible during the authentication flow
  
  ## Security
  - Allow anyone to insert OTP records (needed for signup/login)
  - Allow anyone to select OTP records for verification
  - Cleanup of old OTP records should be handled by a scheduled job
*/

-- Allow inserting OTP records (needed for sending OTP)
CREATE POLICY "Anyone can insert OTP records"
  ON otp_verifications FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow selecting OTP records for verification
CREATE POLICY "Anyone can read OTP records for verification"
  ON otp_verifications FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow updating OTP records (for marking as verified or incrementing attempts)
CREATE POLICY "Anyone can update OTP records"
  ON otp_verifications FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);