-- Autopilot posting schedule configuration per business
CREATE TABLE IF NOT EXISTS autopilot_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  posts_per_week integer NOT NULL DEFAULT 2,
  preferred_days text[] NOT NULL DEFAULT ARRAY['Wednesday', 'Friday'],
  post_types text[] NOT NULL DEFAULT ARRAY['STANDARD', 'OFFER'],
  tone text NOT NULL DEFAULT 'friendly',
  topics text[] NOT NULL DEFAULT ARRAY[]::text[],
  last_auto_post_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT autopilot_configs_business_id_key UNIQUE (business_id)
);

CREATE INDEX IF NOT EXISTS autopilot_configs_business_id_idx ON autopilot_configs (business_id);
CREATE INDEX IF NOT EXISTS autopilot_configs_enabled_idx ON autopilot_configs (enabled);

ALTER TABLE autopilot_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own autopilot configs"
  ON autopilot_configs
  FOR ALL
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );
