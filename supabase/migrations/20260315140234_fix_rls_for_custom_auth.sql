-- Drop all RLS policies that use auth.uid() since this app uses custom JWT auth
-- The supabaseAdmin client uses the service role key which bypasses RLS entirely
-- These policies are replaced with simple permissive ones for anon/authenticated roles
-- Security is enforced at the API route level via JWT verification

-- gmb_api_cache
DROP POLICY IF EXISTS "Users can view own cache" ON gmb_api_cache;
DROP POLICY IF EXISTS "Users can insert own cache" ON gmb_api_cache;
DROP POLICY IF EXISTS "Users can update own cache" ON gmb_api_cache;
DROP POLICY IF EXISTS "Users can delete own cache" ON gmb_api_cache;

CREATE POLICY "Service role manages cache" ON gmb_api_cache FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- gmb_sync_sessions
DROP POLICY IF EXISTS "Users can view own sync sessions" ON gmb_sync_sessions;
DROP POLICY IF EXISTS "Users can insert own sync sessions" ON gmb_sync_sessions;
DROP POLICY IF EXISTS "Users can update own sync sessions" ON gmb_sync_sessions;
DROP POLICY IF EXISTS "Users can delete own sync sessions" ON gmb_sync_sessions;

CREATE POLICY "Service role manages sync sessions" ON gmb_sync_sessions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- api_rate_limits
DROP POLICY IF EXISTS "Users can view own rate limits" ON api_rate_limits;
DROP POLICY IF EXISTS "Users can insert own rate limits" ON api_rate_limits;
DROP POLICY IF EXISTS "Users can update own rate limits" ON api_rate_limits;
DROP POLICY IF EXISTS "Users can delete own rate limits" ON api_rate_limits;

CREATE POLICY "Service role manages rate limits" ON api_rate_limits FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- health_scores: also add UPDATE policy which is missing
DROP POLICY IF EXISTS "Users can view own health scores" ON health_scores;
DROP POLICY IF EXISTS "Users can insert own health scores" ON health_scores;
DROP POLICY IF EXISTS "Users can view all health scores" ON health_scores;
DROP POLICY IF EXISTS "Users can insert all health scores" ON health_scores;

CREATE POLICY "Allow all health_scores operations" ON health_scores FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- analytics: add missing UPDATE policy
DROP POLICY IF EXISTS "Users can view own analytics" ON analytics;
DROP POLICY IF EXISTS "Users can insert own analytics" ON analytics;
DROP POLICY IF EXISTS "Users can view all analytics" ON analytics;
DROP POLICY IF EXISTS "Users can insert analytics" ON analytics;

CREATE POLICY "Allow all analytics operations" ON analytics FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- businesses: ensure UPDATE works without google_account_id join complexity
DROP POLICY IF EXISTS "Users can view own businesses" ON businesses;
DROP POLICY IF EXISTS "Users can insert own businesses" ON businesses;
DROP POLICY IF EXISTS "Users can update own businesses" ON businesses;
DROP POLICY IF EXISTS "Users can delete own businesses" ON businesses;
DROP POLICY IF EXISTS "Users can view businesses" ON businesses;
DROP POLICY IF EXISTS "Users can insert businesses" ON businesses;
DROP POLICY IF EXISTS "Users can update businesses" ON businesses;
DROP POLICY IF EXISTS "Users can delete businesses" ON businesses;
DROP POLICY IF EXISTS "Users can view all businesses" ON businesses;
DROP POLICY IF EXISTS "Admins can view all businesses" ON businesses;

CREATE POLICY "Allow all businesses operations" ON businesses FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- reviews
DROP POLICY IF EXISTS "Users can view own reviews" ON reviews;
DROP POLICY IF EXISTS "Users can insert own reviews" ON reviews;
DROP POLICY IF EXISTS "Users can update own reviews" ON reviews;
DROP POLICY IF EXISTS "Users can view all reviews" ON reviews;
DROP POLICY IF EXISTS "Users can insert reviews" ON reviews;
DROP POLICY IF EXISTS "Users can update reviews" ON reviews;

CREATE POLICY "Allow all reviews operations" ON reviews FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- posts
DROP POLICY IF EXISTS "Users can view own posts" ON posts;
DROP POLICY IF EXISTS "Users can insert own posts" ON posts;
DROP POLICY IF EXISTS "Users can update own posts" ON posts;
DROP POLICY IF EXISTS "Users can delete own posts" ON posts;
DROP POLICY IF EXISTS "Users can view all posts" ON posts;
DROP POLICY IF EXISTS "Users can insert posts" ON posts;
DROP POLICY IF EXISTS "Users can update posts" ON posts;
DROP POLICY IF EXISTS "Users can delete posts" ON posts;

CREATE POLICY "Allow all posts operations" ON posts FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- keywords
DROP POLICY IF EXISTS "Users can view own keywords" ON keywords;
DROP POLICY IF EXISTS "Users can insert own keywords" ON keywords;
DROP POLICY IF EXISTS "Users can delete own keywords" ON keywords;
DROP POLICY IF EXISTS "Users can view all keywords" ON keywords;
DROP POLICY IF EXISTS "Users can insert keywords" ON keywords;
DROP POLICY IF EXISTS "Users can delete keywords" ON keywords;

CREATE POLICY "Allow all keywords operations" ON keywords FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- events
DROP POLICY IF EXISTS "Users can view own events" ON events;
DROP POLICY IF EXISTS "Users can insert own events" ON events;
DROP POLICY IF EXISTS "Users can update own events" ON events;
DROP POLICY IF EXISTS "Users can delete own events" ON events;
DROP POLICY IF EXISTS "Users can view all events" ON events;
DROP POLICY IF EXISTS "Users can insert events" ON events;
DROP POLICY IF EXISTS "Users can update events" ON events;
DROP POLICY IF EXISTS "Users can delete events" ON events;

CREATE POLICY "Allow all events operations" ON events FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- google_accounts: consolidate all policies
DROP POLICY IF EXISTS "Users can view google accounts" ON google_accounts;
DROP POLICY IF EXISTS "Users can insert google accounts" ON google_accounts;
DROP POLICY IF EXISTS "Users can update google accounts" ON google_accounts;
DROP POLICY IF EXISTS "Users can delete own google accounts" ON google_accounts;
DROP POLICY IF EXISTS "Allow server-side insert during OAuth" ON google_accounts;
DROP POLICY IF EXISTS "Allow anon to read google accounts" ON google_accounts;

CREATE POLICY "Allow all google_accounts operations" ON google_accounts FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- users: make sure anon insert and select work for OTP login flow
DROP POLICY IF EXISTS "Anyone can create user account" ON users;
DROP POLICY IF EXISTS "Anyone can view users for login" ON users;
DROP POLICY IF EXISTS "Allow user creation during signup" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can update all users" ON users;

CREATE POLICY "Allow all users operations" ON users FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- otp_verifications
DROP POLICY IF EXISTS "Anyone can insert OTP records" ON otp_verifications;
DROP POLICY IF EXISTS "Anyone can read OTP records for verification" ON otp_verifications;
DROP POLICY IF EXISTS "Anyone can update OTP records" ON otp_verifications;
DROP POLICY IF EXISTS "Anyone can manage own OTP records" ON otp_verifications;

CREATE POLICY "Allow all otp operations" ON otp_verifications FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- admin_audit_logs
DROP POLICY IF EXISTS "Admins can view all audit logs" ON admin_audit_logs;
DROP POLICY IF EXISTS "Admins can insert audit logs" ON admin_audit_logs;

CREATE POLICY "Allow all audit_log operations" ON admin_audit_logs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Remove UNIQUE constraint on businesses.business_id that blocks multi-user agency syncs
ALTER TABLE businesses DROP CONSTRAINT IF EXISTS businesses_business_id_key;

-- Add composite unique instead: same location can exist per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_businesses_user_business 
  ON businesses(user_id, business_id);
