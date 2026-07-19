-- Newsletter subscribers table
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  email           text        NOT NULL UNIQUE,
  name            text,
  subscribed_at   timestamptz DEFAULT now() NOT NULL,
  unsubscribed_at timestamptz,
  is_active       boolean     DEFAULT true NOT NULL
);

CREATE INDEX IF NOT EXISTS newsletter_subscribers_email_idx  ON newsletter_subscribers (email);
CREATE INDEX IF NOT EXISTS newsletter_subscribers_active_idx ON newsletter_subscribers (is_active);

ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous visitors) can subscribe
CREATE POLICY "Anyone can subscribe to newsletter"
  ON newsletter_subscribers
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only admins can view all subscribers
CREATE POLICY "Admins can read newsletter subscribers"
  ON newsletter_subscribers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Only admins can update (e.g., mark inactive)
CREATE POLICY "Admins can update newsletter subscribers"
  ON newsletter_subscribers
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Only admins can delete subscribers
CREATE POLICY "Admins can delete newsletter subscribers"
  ON newsletter_subscribers
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );
