-- Return the session credit when a booking is cancelled with enough notice.
--
-- Policy approved by Michael 2026-07-29: client cancellations with more than
-- 24 hours' notice restore the session credit; later cancellations count as
-- used (Terms §5). Coach/admin cancellations of future sessions always
-- restore it.

-- Booking creation decrements extra_sessions when the client has an
-- admin-gifted pool; record that so a refund restores the same pool.
alter table public.bookings
  add column if not exists used_extra_session boolean not null default false;

-- Atomic credit refund. Callable by the API service role only — clients could
-- otherwise mint credits, same class of hole as the 2026-07-27 RPC lockdown.
create or replace function public.refund_session_credit(
  p_client_id uuid,
  p_restore_extra boolean
)
returns void
language sql
set search_path to 'public'
as $$
  update public.profiles
     set sessions_used_this_month = greatest(coalesce(sessions_used_this_month, 0) - 1, 0),
         extra_sessions = coalesce(extra_sessions, 0)
                          + (case when p_restore_extra then 1 else 0 end)
   where id = p_client_id;
$$;

revoke execute on function public.refund_session_credit(uuid, boolean) from public, anon, authenticated;
grant execute on function public.refund_session_credit(uuid, boolean) to service_role;
