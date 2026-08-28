-- Adds a table to store the scheduled newsletter draft.
-- The system keeps at most one draft at a time.
-- When the Wednesday cron fires, it reads this draft, sends it, then clears it.

CREATE TABLE newsletter_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  body text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE newsletter_drafts ENABLE ROW LEVEL SECURITY;

-- Only admins can read or write drafts directly
CREATE POLICY "Admins can manage newsletter drafts"
  ON newsletter_drafts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
