/*
  # Locomo Platform - Complete Database Schema

  ## Overview
  Creates all tables needed for the Locomo AI-powered marketing platform with proper
  relationships, indexes, and Row Level Security policies.

  ## New Tables
  
  ### 1. users
  - `id` (uuid, primary key) - User identifier
  - `phone_number` (text, unique) - User's phone number for authentication
  - `role` (text) - User role: 'user' or 'admin'
  - `status` (text) - Account status: 'active', 'disabled', 'pending'
  - `last_login` (timestamptz) - Last login timestamp
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 2. otp_verifications
  - `id` (uuid, primary key) - OTP record identifier
  - `phone_number` (text) - Phone number for OTP
  - `otp_code` (text) - 6-digit OTP code
  - `expires_at` (timestamptz) - OTP expiration time (5 minutes)
  - `verified` (boolean) - Whether OTP was used
  - `attempts` (integer) - Number of verification attempts
  - `created_at` (timestamptz) - Creation timestamp

  ### 3. google_accounts
  - `id` (uuid, primary key) - Account record identifier
  - `user_id` (uuid, foreign key) - Reference to users table
  - `google_user_id` (text) - Google user identifier
  - `email` (text) - Google account email
  - `access_token` (text) - Encrypted OAuth access token
  - `refresh_token` (text) - Encrypted OAuth refresh token
  - `token_expires_at` (timestamptz) - Access token expiration
  - `scopes` (text[]) - Granted OAuth scopes
  - `created_at` (timestamptz) - Connection timestamp
  - `updated_at` (timestamptz) - Last token update

  ### 4. businesses
  - `id` (uuid, primary key) - Business record identifier
  - `user_id` (uuid, foreign key) - Reference to users table
  - `google_account_id` (uuid, foreign key) - Reference to google_accounts
  - `business_id` (text) - Google Business Profile ID
  - `name` (text) - Business name
  - `category` (text) - Primary business category
  - `additional_categories` (text[]) - Additional categories
  - `address` (jsonb) - Full address object
  - `phone` (text) - Business phone number
  - `website` (text) - Business website URL
  - `description` (text) - Business description
  - `hours` (jsonb) - Business hours object
  - `attributes` (jsonb) - Business attributes and amenities
  - `photos` (jsonb[]) - Array of photo objects with URLs and metadata
  - `latitude` (decimal) - Location latitude
  - `longitude` (decimal) - Location longitude
  - `profile_completeness` (integer) - Profile completion percentage
  - `last_synced_at` (timestamptz) - Last sync with Google
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 5. reviews
  - `id` (uuid, primary key) - Review record identifier
  - `business_id` (uuid, foreign key) - Reference to businesses table
  - `google_review_id` (text, unique) - Google review identifier
  - `reviewer_name` (text) - Name of reviewer
  - `reviewer_photo_url` (text) - Reviewer's photo URL
  - `rating` (integer) - Star rating (1-5)
  - `review_text` (text) - Review content
  - `review_date` (timestamptz) - When review was posted
  - `reply_text` (text) - Business reply text
  - `reply_date` (timestamptz) - When reply was posted
  - `ai_suggested_reply` (text) - AI-generated reply suggestion
  - `reply_status` (text) - Status: 'pending', 'replied', 'ignored'
  - `sentiment` (text) - AI sentiment analysis: 'positive', 'neutral', 'negative'
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 6. posts
  - `id` (uuid, primary key) - Post record identifier
  - `business_id` (uuid, foreign key) - Reference to businesses table
  - `google_post_id` (text) - Google post identifier (after publishing)
  - `title` (text) - Post title
  - `content` (text) - Post content
  - `images` (text[]) - Array of image URLs
  - `call_to_action` (jsonb) - CTA button configuration
  - `status` (text) - Status: 'draft', 'scheduled', 'published', 'failed'
  - `scheduled_for` (timestamptz) - Scheduled publication time
  - `published_at` (timestamptz) - Actual publication time
  - `ai_generated` (boolean) - Whether content was AI-generated
  - `ai_prompt` (text) - Original AI prompt if applicable
  - `performance` (jsonb) - Post performance metrics
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 7. analytics
  - `id` (uuid, primary key) - Analytics record identifier
  - `business_id` (uuid, foreign key) - Reference to businesses table
  - `date` (date) - Analytics date
  - `views` (integer) - Profile views count
  - `searches` (integer) - Search appearances count
  - `actions_phone` (integer) - Phone call actions
  - `actions_website` (integer) - Website click actions
  - `actions_directions` (integer) - Direction request actions
  - `search_queries` (jsonb) - Top search queries with counts
  - `customer_locations` (jsonb) - Geographic data of customers
  - `created_at` (timestamptz) - Record creation timestamp

  ### 8. health_scores
  - `id` (uuid, primary key) - Score record identifier
  - `business_id` (uuid, foreign key) - Reference to businesses table
  - `score` (integer) - Overall health score (0-100)
  - `profile_score` (integer) - Profile completeness score
  - `review_score` (integer) - Review management score
  - `post_score` (integer) - Posting activity score
  - `photo_score` (integer) - Photo quality score
  - `engagement_score` (integer) - Customer engagement score
  - `action_items` (jsonb) - Array of improvement suggestions
  - `calculated_at` (timestamptz) - Score calculation timestamp
  - `created_at` (timestamptz) - Record creation timestamp

  ### 9. events
  - `id` (uuid, primary key) - Event record identifier
  - `business_id` (uuid, foreign key) - Reference to businesses table
  - `google_event_id` (text) - Google event identifier
  - `title` (text) - Event title
  - `description` (text) - Event description
  - `start_date` (timestamptz) - Event start date/time
  - `end_date` (timestamptz) - Event end date/time
  - `status` (text) - Status: 'draft', 'published', 'ended'
  - `offer_details` (jsonb) - Special offer information if applicable
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 10. keywords
  - `id` (uuid, primary key) - Keyword record identifier
  - `business_id` (uuid, foreign key) - Reference to businesses table
  - `keyword` (text) - Keyword phrase
  - `search_volume` (integer) - Estimated monthly search volume
  - `competition` (text) - Competition level: 'low', 'medium', 'high'
  - `relevance_score` (integer) - AI-calculated relevance (0-100)
  - `suggested_by_ai` (boolean) - Whether suggested by AI
  - `created_at` (timestamptz) - Creation timestamp

  ### 11. admin_audit_logs
  - `id` (uuid, primary key) - Log record identifier
  - `admin_id` (uuid, foreign key) - Reference to users table (admin)
  - `action` (text) - Action performed
  - `target_user_id` (uuid) - Target user if applicable
  - `details` (jsonb) - Additional action details
  - `ip_address` (text) - IP address of admin
  - `user_agent` (text) - Browser user agent
  - `created_at` (timestamptz) - Action timestamp

  ## Security
  - Enable RLS on all tables
  - Users can only access their own data
  - Admins can access all data
  - OTP table accessible only during verification process
  - Audit logs only accessible by admins

  ## Indexes
  - Add indexes on foreign keys for performance
  - Add indexes on frequently queried fields (phone_number, business_id, etc.)
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_number text UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled', 'pending')),
  last_login timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create OTP verifications table
CREATE TABLE IF NOT EXISTS otp_verifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_number text NOT NULL,
  otp_code text NOT NULL,
  expires_at timestamptz NOT NULL,
  verified boolean DEFAULT false,
  attempts integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create google_accounts table
CREATE TABLE IF NOT EXISTS google_accounts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  google_user_id text NOT NULL,
  email text NOT NULL,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  token_expires_at timestamptz NOT NULL,
  scopes text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create businesses table
CREATE TABLE IF NOT EXISTS businesses (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  google_account_id uuid REFERENCES google_accounts(id) ON DELETE SET NULL,
  business_id text UNIQUE NOT NULL,
  name text NOT NULL,
  category text,
  additional_categories text[] DEFAULT '{}',
  address jsonb,
  phone text,
  website text,
  description text,
  hours jsonb,
  attributes jsonb,
  photos jsonb[] DEFAULT '{}',
  latitude decimal(10, 8),
  longitude decimal(11, 8),
  profile_completeness integer DEFAULT 0,
  last_synced_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  google_review_id text UNIQUE NOT NULL,
  reviewer_name text NOT NULL,
  reviewer_photo_url text,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text,
  review_date timestamptz NOT NULL,
  reply_text text,
  reply_date timestamptz,
  ai_suggested_reply text,
  reply_status text DEFAULT 'pending' CHECK (reply_status IN ('pending', 'replied', 'ignored')),
  sentiment text CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create posts table
CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  google_post_id text,
  title text,
  content text NOT NULL,
  images text[] DEFAULT '{}',
  call_to_action jsonb,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'failed')),
  scheduled_for timestamptz,
  published_at timestamptz,
  ai_generated boolean DEFAULT false,
  ai_prompt text,
  performance jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create analytics table
CREATE TABLE IF NOT EXISTS analytics (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  date date NOT NULL,
  views integer DEFAULT 0,
  searches integer DEFAULT 0,
  actions_phone integer DEFAULT 0,
  actions_website integer DEFAULT 0,
  actions_directions integer DEFAULT 0,
  search_queries jsonb,
  customer_locations jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE(business_id, date)
);

-- Create health_scores table
CREATE TABLE IF NOT EXISTS health_scores (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  score integer NOT NULL CHECK (score >= 0 AND score <= 100),
  profile_score integer DEFAULT 0,
  review_score integer DEFAULT 0,
  post_score integer DEFAULT 0,
  photo_score integer DEFAULT 0,
  engagement_score integer DEFAULT 0,
  action_items jsonb,
  calculated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create events table
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  google_event_id text,
  title text NOT NULL,
  description text,
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'ended')),
  offer_details jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create keywords table
CREATE TABLE IF NOT EXISTS keywords (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  keyword text NOT NULL,
  search_volume integer DEFAULT 0,
  competition text CHECK (competition IN ('low', 'medium', 'high')),
  relevance_score integer DEFAULT 0,
  suggested_by_ai boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create admin_audit_logs table
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  details jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_otp_phone_expires ON otp_verifications(phone_number, expires_at);
CREATE INDEX IF NOT EXISTS idx_google_accounts_user ON google_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_businesses_user ON businesses(user_id);
CREATE INDEX IF NOT EXISTS idx_businesses_business_id ON businesses(business_id);
CREATE INDEX IF NOT EXISTS idx_reviews_business ON reviews(business_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(reply_status);
CREATE INDEX IF NOT EXISTS idx_posts_business ON posts(business_id);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_analytics_business_date ON analytics(business_id, date);
CREATE INDEX IF NOT EXISTS idx_health_scores_business ON health_scores(business_id);
CREATE INDEX IF NOT EXISTS idx_events_business ON events(business_id);
CREATE INDEX IF NOT EXISTS idx_keywords_business ON keywords(business_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin ON admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON admin_audit_logs(target_user_id);

-- Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update all users"
  ON users FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- RLS Policies for google_accounts table
CREATE POLICY "Users can view own google accounts"
  ON google_accounts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own google accounts"
  ON google_accounts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own google accounts"
  ON google_accounts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own google accounts"
  ON google_accounts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for businesses table
CREATE POLICY "Users can view own businesses"
  ON businesses FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own businesses"
  ON businesses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own businesses"
  ON businesses FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own businesses"
  ON businesses FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all businesses"
  ON businesses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- RLS Policies for reviews table
CREATE POLICY "Users can view reviews for own businesses"
  ON reviews FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = reviews.business_id AND businesses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update reviews for own businesses"
  ON reviews FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = reviews.business_id AND businesses.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = reviews.business_id AND businesses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert reviews for own businesses"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = reviews.business_id AND businesses.user_id = auth.uid()
    )
  );

-- RLS Policies for posts table
CREATE POLICY "Users can view posts for own businesses"
  ON posts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = posts.business_id AND businesses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert posts for own businesses"
  ON posts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = posts.business_id AND businesses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update posts for own businesses"
  ON posts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = posts.business_id AND businesses.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = posts.business_id AND businesses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete posts for own businesses"
  ON posts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = posts.business_id AND businesses.user_id = auth.uid()
    )
  );

-- RLS Policies for analytics table
CREATE POLICY "Users can view analytics for own businesses"
  ON analytics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = analytics.business_id AND businesses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert analytics for own businesses"
  ON analytics FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = analytics.business_id AND businesses.user_id = auth.uid()
    )
  );

-- RLS Policies for health_scores table
CREATE POLICY "Users can view health scores for own businesses"
  ON health_scores FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = health_scores.business_id AND businesses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert health scores for own businesses"
  ON health_scores FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = health_scores.business_id AND businesses.user_id = auth.uid()
    )
  );

-- RLS Policies for events table
CREATE POLICY "Users can view events for own businesses"
  ON events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = events.business_id AND businesses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert events for own businesses"
  ON events FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = events.business_id AND businesses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update events for own businesses"
  ON events FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = events.business_id AND businesses.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = events.business_id AND businesses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete events for own businesses"
  ON events FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = events.business_id AND businesses.user_id = auth.uid()
    )
  );

-- RLS Policies for keywords table
CREATE POLICY "Users can view keywords for own businesses"
  ON keywords FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = keywords.business_id AND businesses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert keywords for own businesses"
  ON keywords FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = keywords.business_id AND businesses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete keywords for own businesses"
  ON keywords FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = keywords.business_id AND businesses.user_id = auth.uid()
    )
  );

-- RLS Policies for admin_audit_logs table
CREATE POLICY "Admins can view all audit logs"
  ON admin_audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert audit logs"
  ON admin_audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_google_accounts_updated_at BEFORE UPDATE ON google_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE ON businesses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();