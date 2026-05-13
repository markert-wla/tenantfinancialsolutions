-- Add bio_short and zoom_link columns to coaches table (IF NOT EXISTS so safe to re-run)
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS bio_short text;
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS zoom_link text;
