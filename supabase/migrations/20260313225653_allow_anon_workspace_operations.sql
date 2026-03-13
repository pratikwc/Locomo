/*
  # Allow Anonymous Workspace Operations

  ## Overview
  Updates RLS policies to allow anonymous (unauthenticated) connections to perform
  workspace operations. This is necessary because the app uses custom authentication
  with JWT tokens that don't integrate with Supabase Auth.

  ## Changes
  - Drop existing policies that require `authenticated` role
  - Create new policies that allow `anon` role access
  - Enable operations for workspace creation flow

  ## Security Note
  This is for development/custom auth. In production, implement proper JWT validation
  or migrate to Supabase Auth for better security.
*/

-- Workspaces table - allow anon access
DROP POLICY IF EXISTS "Allow authenticated insert workspaces" ON workspaces;
DROP POLICY IF EXISTS "Allow authenticated select workspaces" ON workspaces;
DROP POLICY IF EXISTS "Allow authenticated update workspaces" ON workspaces;

CREATE POLICY "Allow anon insert workspaces"
  ON workspaces FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon select workspaces"
  ON workspaces FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon update workspaces"
  ON workspaces FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon delete workspaces"
  ON workspaces FOR DELETE
  TO anon
  USING (true);

-- Also keep authenticated policies
CREATE POLICY "Allow authenticated insert workspaces"
  ON workspaces FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated select workspaces"
  ON workspaces FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated update workspaces"
  ON workspaces FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Workspace members - allow anon access
DROP POLICY IF EXISTS "Allow authenticated insert workspace_members" ON workspace_members;
DROP POLICY IF EXISTS "Allow authenticated select workspace_members" ON workspace_members;
DROP POLICY IF EXISTS "Allow authenticated update workspace_members" ON workspace_members;
DROP POLICY IF EXISTS "Allow authenticated delete workspace_members" ON workspace_members;

CREATE POLICY "Allow anon insert workspace_members"
  ON workspace_members FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon select workspace_members"
  ON workspace_members FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon update workspace_members"
  ON workspace_members FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon delete workspace_members"
  ON workspace_members FOR DELETE
  TO anon
  USING (true);

-- Also keep authenticated policies
CREATE POLICY "Allow authenticated insert workspace_members"
  ON workspace_members FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated select workspace_members"
  ON workspace_members FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated update workspace_members"
  ON workspace_members FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated delete workspace_members"
  ON workspace_members FOR DELETE
  TO authenticated
  USING (true);

-- Update other tables to allow anon access
DROP POLICY IF EXISTS "Allow authenticated brands operations" ON brands;

CREATE POLICY "Allow anon brands operations"
  ON brands FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated brands operations"
  ON brands FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Locations
DROP POLICY IF EXISTS "Allow authenticated locations operations" ON locations;

CREATE POLICY "Allow anon locations operations"
  ON locations FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated locations operations"
  ON locations FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Location groups
DROP POLICY IF EXISTS "Allow authenticated location_groups operations" ON location_groups;

CREATE POLICY "Allow anon location_groups operations"
  ON location_groups FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated location_groups operations"
  ON location_groups FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Update comment
COMMENT ON TABLE workspaces IS 'RLS policies allow both anon and authenticated roles for custom auth system. Implement proper session validation in application layer.';
