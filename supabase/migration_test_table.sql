-- Migration: migration_test
-- Purpose: Test table for validating the migration flow. Not connected to any app logic.

CREATE TABLE IF NOT EXISTS migration_test (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Enable Row Level Security (table is not publicly accessible)
ALTER TABLE migration_test ENABLE ROW LEVEL SECURITY;

-- No policies are defined intentionally — only service-role/admin access is allowed.
