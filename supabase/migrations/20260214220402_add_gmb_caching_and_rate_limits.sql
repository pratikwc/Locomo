/*
  # Add GMB API Caching and Rate Limit Tracking

  ## New Tables

  ### `gmb_api_cache`
  Caches GMB API responses to reduce API calls and prevent rate limits
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key to users)
  - `endpoint` (text) - API endpoint called
  - `params_hash` (text) - Hash of request parameters
  - `response_data` (jsonb) - Cached response
  - `cached_at` (timestamptz) - When cached
  - `expires_at` (timestamptz) - When cache expires
  - Indexes on user_id, endpoint, and expires_at

  ### `api_rate_limits`
  Tracks API usage and enforces cooldowns
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key to users)
  - `api_name` (text) - Name of the API
  - `attempts_count` (integer) - Number of attempts
  - `window_start` (timestamptz) - Start of tracking window
  - `window_end` (timestamptz) - End of tracking window
  - `blocked_until` (timestamptz, nullable) - When user can retry
  - `last_error` (jsonb, nullable) - Last error details

  ### `gmb_sync_sessions`
  Tracks background sync operations
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key to users)
  - `status` (text) - pending, running, completed, failed, rate_limited
  - `started_at` (timestamptz) - When sync started
  - `completed_at` (timestamptz, nullable) - When sync completed
  - `items_processed` (integer) - Number of items processed
  - `total_items` (integer, nullable) - Total items to process
  - `last_error` (jsonb, nullable) - Error details if failed

  ## Security
  - Enable RLS on all new tables
  - Users can only access their own data
  - Authenticated users required for all operations
*/

-- Create gmb_api_cache table
CREATE TABLE IF NOT EXISTS gmb_api_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  params_hash text NOT NULL,
  response_data jsonb NOT NULL,
  cached_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_gmb_api_cache_user_id ON gmb_api_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_gmb_api_cache_endpoint ON gmb_api_cache(endpoint);
CREATE INDEX IF NOT EXISTS idx_gmb_api_cache_expires_at ON gmb_api_cache(expires_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_gmb_api_cache_unique ON gmb_api_cache(user_id, endpoint, params_hash);

-- Enable RLS
ALTER TABLE gmb_api_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies for gmb_api_cache
CREATE POLICY "Users can view own cache"
  ON gmb_api_cache FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cache"
  ON gmb_api_cache FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cache"
  ON gmb_api_cache FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own cache"
  ON gmb_api_cache FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create api_rate_limits table
CREATE TABLE IF NOT EXISTS api_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  api_name text NOT NULL,
  attempts_count integer NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now(),
  window_end timestamptz NOT NULL,
  blocked_until timestamptz,
  last_error jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_user_id ON api_rate_limits(user_id);
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_api_name ON api_rate_limits(api_name);
CREATE UNIQUE INDEX IF NOT EXISTS idx_api_rate_limits_unique ON api_rate_limits(user_id, api_name);

-- Enable RLS
ALTER TABLE api_rate_limits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for api_rate_limits
CREATE POLICY "Users can view own rate limits"
  ON api_rate_limits FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own rate limits"
  ON api_rate_limits FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own rate limits"
  ON api_rate_limits FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own rate limits"
  ON api_rate_limits FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create gmb_sync_sessions table
CREATE TABLE IF NOT EXISTS gmb_sync_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'rate_limited')),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  items_processed integer NOT NULL DEFAULT 0,
  total_items integer,
  last_error jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_gmb_sync_sessions_user_id ON gmb_sync_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_gmb_sync_sessions_status ON gmb_sync_sessions(status);

-- Enable RLS
ALTER TABLE gmb_sync_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for gmb_sync_sessions
CREATE POLICY "Users can view own sync sessions"
  ON gmb_sync_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sync sessions"
  ON gmb_sync_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sync sessions"
  ON gmb_sync_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own sync sessions"
  ON gmb_sync_sessions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to auto-clean expired cache entries
CREATE OR REPLACE FUNCTION clean_expired_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM gmb_api_cache WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql;
