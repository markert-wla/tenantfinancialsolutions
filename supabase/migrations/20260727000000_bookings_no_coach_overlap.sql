-- Prevent double-booking a coach at the database level.
-- The API-level conflict check previously ran under RLS, which hid other
-- clients' bookings and allowed two clients to confirm the same slot. The
-- API is fixed to check with the service role; this constraint additionally
-- guarantees no overlap even if two requests race past the check.
--
-- Scoped to bookings starting 2026-07-30+ because one pre-existing overlap
-- (2026-07-29 20:00 UTC) is being resolved manually by the coach; an
-- unscoped constraint would fail to apply while that row exists.

create extension if not exists btree_gist with schema extensions;

alter table bookings
  add constraint bookings_no_coach_overlap
  exclude using gist (
    coach_id with =,
    tstzrange(start_time_utc, end_time_utc) with &&
  )
  where (status <> 'cancelled' and start_time_utc >= '2026-07-30 00:00:00+00');
