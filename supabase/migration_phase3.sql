-- ============================================================
-- TFS Phase 3 Migration
-- Paste into Supabase SQL Editor and run.
-- ============================================================

-- ─── ENUMS ──────────────────────────────────────────────────

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'property_manager';

CREATE TYPE client_type AS ENUM (
  'individual',
  'couple',
  'nonprofit_individual',
  'property_tenant'
);

-- ─── PROFILES ───────────────────────────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS client_type        client_type,
  ADD COLUMN IF NOT EXISTS free_trial_expires_at timestamptz;

-- ─── BOOKINGS ────────────────────────────────────────────────

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS attended boolean;

-- ─── GROUP SESSION ATTENDANCE ────────────────────────────────

CREATE TABLE IF NOT EXISTS group_session_attendance (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid        NOT NULL REFERENCES group_sessions(id) ON DELETE CASCADE,
  client_id  uuid        NOT NULL REFERENCES profiles(id)       ON DELETE CASCADE,
  attended   boolean     NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, client_id)
);

ALTER TABLE group_session_attendance ENABLE ROW LEVEL SECURITY;

-- Clients read own attendance
CREATE POLICY "gsa: client read own"
  ON group_session_attendance FOR SELECT
  USING (auth.uid() = client_id);

-- Coaches manage all attendance (mark attended/no-show)
CREATE POLICY "gsa: coach manage"
  ON group_session_attendance FOR ALL
  USING (get_my_role() = 'coach');

-- Admins manage all
CREATE POLICY "gsa: admin all"
  ON group_session_attendance FOR ALL
  USING (get_my_role() = 'admin');

-- PMs read attendance for their tenants
CREATE POLICY "gsa: pm read tenants"
  ON group_session_attendance FOR SELECT
  USING (
    get_my_role() = 'property_manager'
    AND EXISTS (
      SELECT 1 FROM profiles p
      JOIN promo_codes pc ON pc.code = p.promo_code_used
      WHERE p.id = client_id
        AND pc.created_by = auth.uid()
    )
  );

-- ─── RLS ADDITIONS ───────────────────────────────────────────

-- PMs can read profiles of tenants registered under their promo codes
CREATE POLICY "profiles: pm read tenants"
  ON profiles FOR SELECT
  USING (
    get_my_role() = 'property_manager'
    AND EXISTS (
      SELECT 1 FROM promo_codes pc
      WHERE pc.code = promo_code_used
        AND pc.created_by = auth.uid()
    )
  );

-- ─── INDEXES ─────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_profiles_client_type    ON profiles(client_type);
CREATE INDEX IF NOT EXISTS idx_profiles_free_trial     ON profiles(free_trial_expires_at);
CREATE INDEX IF NOT EXISTS idx_gsa_session             ON group_session_attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_gsa_client              ON group_session_attendance(client_id);
