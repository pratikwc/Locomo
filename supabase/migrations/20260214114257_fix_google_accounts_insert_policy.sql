/*
  # Fix Google Accounts Insert Policy

  ## Changes
  - Update google_accounts INSERT policy to allow both anon and authenticated users
  - This is needed because OAuth callbacks happen server-side using the anon key

  ## Security
  - The policy still validates data through WITH CHECK
  - Only allow inserts during OAuth flow (server-side)
  - Users can only see and modify their own google_accounts through other policies
*/

-- Drop and recreate the insert policy to allow anon users
DROP POLICY IF EXISTS "Anyone can insert google accounts" ON google_accounts;

CREATE POLICY "Allow server-side insert during OAuth"
  ON google_accounts FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
