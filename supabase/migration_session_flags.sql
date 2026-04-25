-- Migration: session_flags
-- Run in Supabase SQL Editor after migration_contact_submissions.sql

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS flagged     boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS flag_reason text;

COMMENT ON COLUMN bookings.flagged IS
  'Set by coach to escalate an issue to admin. Only admin can clear.';
COMMENT ON COLUMN bookings.flag_reason IS
  'Coach-provided reason for the flag.';
