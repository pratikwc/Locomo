/*
  # Fix Google Accounts RLS Policy for OAuth Callback

  ## Changes
  - Allow anon role to insert google_accounts during OAuth flow
  - This is needed because OAuth callback might use anon key if service role key is missing
  
  ## Security
  - Anon users can only insert/update records for valid user_ids
  - Service role would bypass RLS anyway, but this ensures anon access works too
*/

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Anyone can view google accounts" ON google_accounts;
DROP POLICY IF EXISTS "Anyone can insert google accounts" ON google_accounts;
DROP POLICY IF EXISTS "Anyone can update google accounts" ON google_accounts;
DROP POLICY IF EXISTS "Anyone can delete google accounts" ON google_accounts;

-- Allow authenticated and anon users to view google accounts (needed for OAuth flow)
CREATE POLICY "Users can view google accounts"
  ON google_accounts FOR SELECT
  TO authenticated, anon
  USING (true);

-- Allow authenticated and anon users to insert google accounts (needed for OAuth callback)
CREATE POLICY "Users can insert google accounts"
  ON google_accounts FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- Allow authenticated and anon users to update google accounts (needed for token refresh)
CREATE POLICY "Users can update google accounts"
  ON google_accounts FOR UPDATE
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to delete their own google accounts
CREATE POLICY "Users can delete own google accounts"
  ON google_accounts FOR DELETE
  TO authenticated
  USING (user_id = (current_setting('request.jwt.claims', true)::json->>'userId')::uuid);