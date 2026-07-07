-- Migration: create migration_test table
-- Purpose: simple test table to verify migration flow

CREATE TABLE IF NOT EXISTS migration_test (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  note       text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS so the table is not publicly accessible
ALTER TABLE migration_test ENABLE ROW LEVEL SECURITY;

-- No policies defined intentionally — only service-role/admin can access
