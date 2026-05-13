-- Add bio_short and zoom_link columns to coaches table (IF NOT EXISTS so safe to re-run)
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS bio_short text;
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS zoom_link text;

-- Allow coaches to always read their own record (even when is_active = false)
-- Without this, inactive coaches are silently redirected away from their profile page
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'coaches' AND policyname = 'coaches: own read'
  ) THEN
    EXECUTE 'CREATE POLICY "coaches: own read" ON coaches FOR SELECT USING (auth.uid() = id)';
  END IF;
END $$;
