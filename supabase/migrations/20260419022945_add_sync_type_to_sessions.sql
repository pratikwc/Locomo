-- Add sync_type to gmb_sync_sessions to distinguish reviews vs insights syncs
ALTER TABLE gmb_sync_sessions
  ADD COLUMN IF NOT EXISTS sync_type text NOT NULL DEFAULT 'reviews';

CREATE INDEX IF NOT EXISTS idx_gmb_sync_sessions_sync_type ON gmb_sync_sessions(sync_type);
