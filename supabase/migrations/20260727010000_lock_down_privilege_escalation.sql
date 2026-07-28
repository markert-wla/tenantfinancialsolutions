-- Security lockdown following the 2026-07-27 database audit.
--
-- Root pattern: the original schema granted table-wide privileges to `anon`
-- and `authenticated`, and several RPCs were left EXECUTE-able by PUBLIC.
-- RLS blocked most of that, but wherever a policy said "this row is yours"
-- it implicitly said "…and you may write EVERY column of it." Verified
-- exploitable before writing this migration:
--   1. Any logged-in client could set profiles.role='admin' on their own row.
--   2. Any anonymous caller could invoke delete_client_data() and wipe a
--      client's bookings, or reset_monthly_sessions() to zero every counter.
--   3. Any client could INSERT bookings directly, bypassing plan quotas,
--      coach availability and the 12-hour rule.
--   4. Any client could UPDATE their booking's start time / coach.
--   5. Any client could INSERT a testimonial with approved=true.
--   6. promo_codes was world-readable (qual `true`) — full code harvesting.
--
-- Every app write to profiles already uses the service client, so the column
-- revokes below are not load-bearing for any existing feature.

-- ─── 1. profiles: no self-service privilege / billing / quota edits ───
revoke insert, update on public.profiles from anon, authenticated;

-- Self-editable presentation fields only. Anything governing access, billing
-- or quota (role, plan_tier, extra_sessions, sessions_used_this_month,
-- promo_*, stripe_*, partner_id, free_trial_expires_at, client_type,
-- is_active, intake_completed_at) is service-role only.
grant update (
  first_name, last_name, timezone, bio, photo_url, contact_email,
  birthday_month, anniversary_month, partner_first_name, partner_last_name,
  unit_number
) on public.profiles to authenticated;

-- This policy was `WITH CHECK (true)` for PUBLIC, letting anyone insert
-- arbitrary profile rows. The service role bypasses RLS, so it is redundant.
drop policy if exists "profiles: service insert" on public.profiles;

-- ─── 2. bookings: creation and rescheduling are server-side only ───
-- All legitimate inserts go through /api/booking (quota, availability,
-- 12-hour rule, conflict check) or the Stripe webhook — both service role.
drop policy if exists "bookings: client insert" on public.bookings;
revoke insert, update on public.bookings from anon, authenticated;

-- Clients cancel + leave a message; coaches mark attendance and flag.
-- start_time_utc, end_time_utc, coach_id and client_id are deliberately
-- excluded so a booking cannot be moved or reassigned outside the API.
grant update (
  status, cancelled_by, client_message, client_notes, notes,
  attended, flagged, flag_reason
) on public.bookings to authenticated;

-- ─── 3. testimonials: submissions cannot self-approve ───
revoke insert, update on public.testimonials from anon, authenticated;
grant insert (client_name, quote, plan_tier) on public.testimonials to authenticated;

-- ─── 4. RPCs: revoke PUBLIC execute, harden bodies ───
-- PUBLIC held EXECUTE on all of these, which is how `anon` reached them.
revoke execute on function public.delete_client_data(uuid)      from public, anon, authenticated;
revoke execute on function public.reset_monthly_sessions()       from public, anon, authenticated;
revoke execute on function public.delete_client_account(uuid)    from public, anon;

-- Destructive and previously unauthenticated: add an explicit admin guard and
-- pin search_path so a hostile search_path cannot redirect the DELETEs.
create or replace function public.delete_client_data(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  DELETE FROM bookings WHERE client_id = target_user_id;
  DELETE FROM group_session_attendance WHERE client_id = target_user_id;
  UPDATE promo_codes SET created_by = NULL WHERE created_by = target_user_id;
END;
$function$;

revoke execute on function public.delete_client_data(uuid) from public, anon, authenticated;

-- Pin search_path on the remaining definer functions (Supabase linter 0011).
create or replace function public.reset_monthly_sessions()
returns void
language sql
security definer
set search_path to 'public'
as $function$
  update profiles
  set sessions_used_this_month = 0
  where role = 'client';
$function$;

revoke execute on function public.reset_monthly_sessions() from public, anon, authenticated;

create or replace function public.get_my_promo_codes()
returns setof text
language sql
stable
security definer
set search_path to 'public'
as $function$
  SELECT code
  FROM promo_codes
  WHERE partner_id = (
    SELECT partner_id FROM profiles WHERE id = auth.uid()
  )
  AND partner_id IS NOT NULL
$function$;

create or replace function public.update_last_active()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
begin
  new.last_active_at = now();
  return new;
end;
$function$;

-- ─── 5. promo_codes: no more world-readable code list ───
-- Public validation now runs server-side via the service role in
-- /api/codes/validate (rate limited, single-code lookup).
drop policy if exists "promo_codes: public read for validation" on public.promo_codes;

-- A client still needs to resolve the partner behind their own applied code
-- (portal group-sessions filtering).
create policy "promo_codes: client read own applied code"
  on public.promo_codes for select
  using (code = (select promo_code_used from public.profiles where id = auth.uid()));

-- Property managers list the codes belonging to their own partner org.
create policy "promo_codes: pm read own partner"
  on public.promo_codes for select
  using (
    public.get_my_role() = 'property_manager'
    and partner_id is not null
    and partner_id = (select partner_id from public.profiles where id = auth.uid())
  );

-- ─── 6. Privileges PostgREST never needs ───
revoke truncate, trigger, references on all tables in schema public from anon, authenticated;
