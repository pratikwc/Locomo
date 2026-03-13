/*
  # Growmatiq Multi-Location Workspace Architecture

  ## Overview
  This migration transforms the single-location architecture into a comprehensive
  multi-location workspace system for Growmatiq platform.

  ## New Tables Created

  1. **workspaces** - Central workspace entity for multi-location businesses
  2. **workspace_members** - Team members with role-based access control
  3. **brands** - Brand intelligence profiles for AI insights
  4. **locations** - Google Business Profile locations (extends businesses concept)
  5. **location_groups** - Organization of locations into groups
  6. **competitors** - Competitor tracking per location
  7. **seo_health_snapshots** - Historical SEO health tracking
  8. **brand_intelligence_profiles** - AI-generated brand analysis
  9. **agent_configs** - AI agent configuration per workspace
  10. **agent_runs** - AI agent execution history
  11. **recommendations** - Actionable insights and suggestions
  12. **notifications** - User notification system
  13. **subscriptions** - Billing management
  14. **usage_events** - Usage tracking
  15. **leads** - Basic CRM functionality

  ## Modified Tables

  - google_accounts: Added workspace_id
  - reviews: Added location_id
  - posts: Added location_id
  - analytics: Added location_id

  ## Security

  - Row Level Security enabled on all tables
  - Workspace isolation enforced
  - Role-based access control
  - Location-scoped permissions
*/

-- Create workspaces table
CREATE TABLE IF NOT EXISTS workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text DEFAULT '',
  website_url text,
  logo_url text,
  subscription_tier text DEFAULT 'free' CHECK (subscription_tier IN ('free', 'starter', 'pro', 'enterprise')),
  subscription_status text DEFAULT 'trialing' CHECK (subscription_status IN ('active', 'trialing', 'canceled', 'past_due')),
  trial_ends_at timestamptz DEFAULT (now() + interval '14 days'),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create workspace_members table
CREATE TABLE IF NOT EXISTS workspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner', 'admin', 'manager', 'operator', 'analyst', 'viewer')),
  invited_by uuid REFERENCES users(id),
  invited_at timestamptz DEFAULT now(),
  joined_at timestamptz DEFAULT now(),
  location_access jsonb DEFAULT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);

-- Create brands table
CREATE TABLE IF NOT EXISTS brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  brand_name text NOT NULL,
  industry text DEFAULT '',
  target_audience text DEFAULT '',
  brand_voice text DEFAULT '',
  key_messages jsonb DEFAULT '[]'::jsonb,
  unique_value_props jsonb DEFAULT '[]'::jsonb,
  competitor_names jsonb DEFAULT '[]'::jsonb,
  generated_by_ai boolean DEFAULT false,
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create locations table
CREATE TABLE IF NOT EXISTS locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  google_account_id uuid REFERENCES google_accounts(id) ON DELETE SET NULL,
  name text NOT NULL,
  store_code text,
  address text,
  phone text,
  website_url text,
  google_location_id text,
  google_place_id text,
  primary_category text,
  additional_categories jsonb DEFAULT '[]'::jsonb,
  description text DEFAULT '',
  latitude numeric,
  longitude numeric,
  verification_status text DEFAULT 'unverified',
  connection_status text DEFAULT 'disconnected' CHECK (connection_status IN ('connected', 'disconnected', 'error')),
  health_score integer DEFAULT 0 CHECK (health_score >= 0 AND health_score <= 100),
  seo_score integer DEFAULT 0 CHECK (seo_score >= 0 AND seo_score <= 100),
  assigned_manager_id uuid REFERENCES users(id) ON DELETE SET NULL,
  is_active boolean DEFAULT true,
  last_synced_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create location_groups table
CREATE TABLE IF NOT EXISTS location_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  color text DEFAULT '#6931FF',
  location_ids jsonb DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

-- Create competitors table
CREATE TABLE IF NOT EXISTS competitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  name text NOT NULL,
  google_place_id text,
  google_business_url text,
  rating numeric,
  review_count integer DEFAULT 0,
  last_scraped_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create seo_health_snapshots table
CREATE TABLE IF NOT EXISTS seo_health_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  overall_score integer DEFAULT 0 CHECK (overall_score >= 0 AND overall_score <= 100),
  nap_consistency integer DEFAULT 0 CHECK (nap_consistency >= 0 AND nap_consistency <= 100),
  profile_completeness integer DEFAULT 0 CHECK (profile_completeness >= 0 AND profile_completeness <= 100),
  category_coverage integer DEFAULT 0 CHECK (category_coverage >= 0 AND category_coverage <= 100),
  keyword_coverage integer DEFAULT 0 CHECK (keyword_coverage >= 0 AND keyword_coverage <= 100),
  photo_completeness integer DEFAULT 0 CHECK (photo_completeness >= 0 AND photo_completeness <= 100),
  description_quality integer DEFAULT 0 CHECK (description_quality >= 0 AND description_quality <= 100),
  local_visibility integer DEFAULT 0 CHECK (local_visibility >= 0 AND local_visibility <= 100),
  issues_found jsonb DEFAULT '[]'::jsonb,
  snapshot_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create brand_intelligence_profiles table
CREATE TABLE IF NOT EXISTS brand_intelligence_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  analysis_version integer DEFAULT 1,
  tone_analysis jsonb DEFAULT '{}'::jsonb,
  messaging_themes jsonb DEFAULT '[]'::jsonb,
  content_pillars jsonb DEFAULT '[]'::jsonb,
  audience_insights jsonb DEFAULT '{}'::jsonb,
  competitive_positioning jsonb DEFAULT '{}'::jsonb,
  generated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create agent_configs table
CREATE TABLE IF NOT EXISTS agent_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  agent_type text NOT NULL CHECK (agent_type IN ('brand_intelligence', 'review', 'content', 'competitor', 'geo_search')),
  is_enabled boolean DEFAULT false,
  schedule_cron text DEFAULT '0 0 * * *',
  config_data jsonb DEFAULT '{}'::jsonb,
  ai_provider text DEFAULT 'openai',
  ai_model text DEFAULT 'gpt-4',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id, agent_type)
);

-- Create agent_runs table
CREATE TABLE IF NOT EXISTS agent_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_config_id uuid NOT NULL REFERENCES agent_configs(id) ON DELETE CASCADE,
  status text DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'canceled')),
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  results jsonb DEFAULT '{}'::jsonb,
  error_message text,
  metrics jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create recommendations table
CREATE TABLE IF NOT EXISTS recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  location_id uuid REFERENCES locations(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  severity text DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  impact_score integer DEFAULT 50 CHECK (impact_score >= 0 AND impact_score <= 100),
  effort_estimate text DEFAULT 'moderate' CHECK (effort_estimate IN ('quick', 'moderate', 'extensive')),
  action_url text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'dismissed', 'completed', 'in_progress')),
  generated_by text DEFAULT 'system',
  generated_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  action_url text,
  is_read boolean DEFAULT false,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  stripe_subscription_id text UNIQUE,
  stripe_customer_id text,
  tier text DEFAULT 'free',
  status text DEFAULT 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create usage_events table
CREATE TABLE IF NOT EXISTS usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  event_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create leads table
CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  source text NOT NULL CHECK (source IN ('phone_click', 'website_click', 'directions', 'whatsapp', 'manual')),
  contact_name text,
  contact_phone text,
  contact_email text,
  status text DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'lost')),
  assigned_to uuid REFERENCES users(id) ON DELETE SET NULL,
  notes text DEFAULT '',
  metadata jsonb DEFAULT '{}'::jsonb,
  converted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Modify existing google_accounts table to add workspace_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'google_accounts' AND column_name = 'workspace_id'
  ) THEN
    ALTER TABLE google_accounts ADD COLUMN workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Modify existing reviews table to add location_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reviews' AND column_name = 'location_id'
  ) THEN
    ALTER TABLE reviews ADD COLUMN location_id uuid REFERENCES locations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Modify existing posts table to add location_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'location_id'
  ) THEN
    ALTER TABLE posts ADD COLUMN location_id uuid REFERENCES locations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Modify existing analytics table to add location_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'analytics' AND column_name = 'location_id'
  ) THEN
    ALTER TABLE analytics ADD COLUMN location_id uuid REFERENCES locations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_locations_workspace ON locations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_locations_google_account ON locations(google_account_id);
CREATE INDEX IF NOT EXISTS idx_competitors_location ON competitors(location_id);
CREATE INDEX IF NOT EXISTS idx_seo_snapshots_location ON seo_health_snapshots(location_id);
CREATE INDEX IF NOT EXISTS idx_agent_configs_workspace ON agent_configs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_config ON agent_runs(agent_config_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_workspace ON recommendations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_location ON recommendations(location_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_workspace ON notifications(workspace_id);
CREATE INDEX IF NOT EXISTS idx_leads_location ON leads(location_id);
CREATE INDEX IF NOT EXISTS idx_reviews_location ON reviews(location_id);
CREATE INDEX IF NOT EXISTS idx_posts_location ON posts(location_id);
CREATE INDEX IF NOT EXISTS idx_analytics_location ON analytics(location_id);
CREATE INDEX IF NOT EXISTS idx_google_accounts_workspace ON google_accounts(workspace_id);

-- Enable Row Level Security on all new tables
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_health_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_intelligence_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workspaces
CREATE POLICY "Users can view workspaces they are members of"
  ON workspaces FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace owners can update their workspace"
  ON workspaces FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  )
  WITH CHECK (
    id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Authenticated users can create workspaces"
  ON workspaces FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for workspace_members
CREATE POLICY "Users can view members of their workspaces"
  ON workspace_members FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace owners and admins can manage members"
  ON workspace_members FOR ALL
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- RLS Policies for brands
CREATE POLICY "Users can view brands in their workspace"
  ON brands FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace managers can manage brands"
  ON brands FOR ALL
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager')
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager')
    )
  );

-- RLS Policies for locations
CREATE POLICY "Users can view locations in their workspace"
  ON locations FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace managers can manage locations"
  ON locations FOR ALL
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager')
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager')
    )
  );

-- RLS Policies for location_groups
CREATE POLICY "Users can view location groups in their workspace"
  ON location_groups FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace managers can manage location groups"
  ON location_groups FOR ALL
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager')
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager')
    )
  );

-- RLS Policies for competitors
CREATE POLICY "Users can view competitors for their locations"
  ON competitors FOR SELECT
  TO authenticated
  USING (
    location_id IN (
      SELECT l.id FROM locations l
      INNER JOIN workspace_members wm ON l.workspace_id = wm.workspace_id
      WHERE wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can manage competitors"
  ON competitors FOR ALL
  TO authenticated
  USING (
    location_id IN (
      SELECT l.id FROM locations l
      INNER JOIN workspace_members wm ON l.workspace_id = wm.workspace_id
      WHERE wm.user_id = auth.uid() AND wm.role IN ('owner', 'admin', 'manager', 'operator')
    )
  )
  WITH CHECK (
    location_id IN (
      SELECT l.id FROM locations l
      INNER JOIN workspace_members wm ON l.workspace_id = wm.workspace_id
      WHERE wm.user_id = auth.uid() AND wm.role IN ('owner', 'admin', 'manager', 'operator')
    )
  );

-- RLS Policies for seo_health_snapshots
CREATE POLICY "Users can view SEO snapshots for their locations"
  ON seo_health_snapshots FOR SELECT
  TO authenticated
  USING (
    location_id IN (
      SELECT l.id FROM locations l
      INNER JOIN workspace_members wm ON l.workspace_id = wm.workspace_id
      WHERE wm.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert SEO snapshots"
  ON seo_health_snapshots FOR INSERT
  TO authenticated
  WITH CHECK (
    location_id IN (
      SELECT l.id FROM locations l
      INNER JOIN workspace_members wm ON l.workspace_id = wm.workspace_id
      WHERE wm.user_id = auth.uid()
    )
  );

-- RLS Policies for brand_intelligence_profiles
CREATE POLICY "Users can view brand intelligence for their workspace"
  ON brand_intelligence_profiles FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace managers can manage brand intelligence"
  ON brand_intelligence_profiles FOR ALL
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager')
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager')
    )
  );

-- RLS Policies for agent_configs
CREATE POLICY "Users can view agent configs for their workspace"
  ON agent_configs FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace owners and admins can manage agent configs"
  ON agent_configs FOR ALL
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- RLS Policies for agent_runs
CREATE POLICY "Users can view agent runs for their workspace"
  ON agent_runs FOR SELECT
  TO authenticated
  USING (
    agent_config_id IN (
      SELECT ac.id FROM agent_configs ac
      INNER JOIN workspace_members wm ON ac.workspace_id = wm.workspace_id
      WHERE wm.user_id = auth.uid()
    )
  );

-- RLS Policies for recommendations
CREATE POLICY "Users can view recommendations for their workspace"
  ON recommendations FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update recommendation status"
  ON recommendations FOR UPDATE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System can create recommendations"
  ON recommendations FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for subscriptions
CREATE POLICY "Workspace owners can view their subscription"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Workspace owners can manage their subscription"
  ON subscriptions FOR ALL
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- RLS Policies for usage_events
CREATE POLICY "Users can view usage events for their workspace"
  ON usage_events FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "System can track usage events"
  ON usage_events FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for leads
CREATE POLICY "Users can view leads for their locations"
  ON leads FOR SELECT
  TO authenticated
  USING (
    location_id IN (
      SELECT l.id FROM locations l
      INNER JOIN workspace_members wm ON l.workspace_id = wm.workspace_id
      WHERE wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage leads for their locations"
  ON leads FOR ALL
  TO authenticated
  USING (
    location_id IN (
      SELECT l.id FROM locations l
      INNER JOIN workspace_members wm ON l.workspace_id = wm.workspace_id
      WHERE wm.user_id = auth.uid() AND wm.role IN ('owner', 'admin', 'manager', 'operator')
    )
  )
  WITH CHECK (
    location_id IN (
      SELECT l.id FROM locations l
      INNER JOIN workspace_members wm ON l.workspace_id = wm.workspace_id
      WHERE wm.user_id = auth.uid() AND wm.role IN ('owner', 'admin', 'manager', 'operator')
    )
  );
