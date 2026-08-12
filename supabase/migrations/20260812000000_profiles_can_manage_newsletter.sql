-- Reusable newsletter permission, replacing the hardcoded "Amanda Butler"
-- name-match added earlier on this branch. Admins keep access by role; any
-- coach can be granted newsletter access by setting this flag (service role
-- only — the 20260727010000 lockdown grants authenticated users UPDATE on an
-- explicit column list, which this column is deliberately not added to).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS can_manage_newsletter BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.can_manage_newsletter IS
  'Grants the newsletter composer + send capability to a coach (admins have it by role). Service-role managed.';

-- One-time grant for the coach the feature was requested for. Identifying her
-- by name is acceptable HERE (a one-off data seed) — never in application code.
UPDATE public.profiles
SET can_manage_newsletter = true
WHERE role = 'coach'
  AND first_name = 'Amanda'
  AND last_name = 'Butler';
