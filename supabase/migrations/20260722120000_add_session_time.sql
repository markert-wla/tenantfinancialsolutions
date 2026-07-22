-- Add session_time column to group_sessions
-- Stores the start time as a display string (e.g. "10:00 AM")
ALTER TABLE group_sessions
  ADD COLUMN IF NOT EXISTS session_time text;
