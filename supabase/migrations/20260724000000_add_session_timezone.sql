-- Add session_timezone column to group_sessions
-- Stores an IANA timezone id (e.g. "America/New_York") qualifying the session_time display string
ALTER TABLE group_sessions
  ADD COLUMN IF NOT EXISTS session_timezone text;
