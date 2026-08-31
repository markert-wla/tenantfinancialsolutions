-- Personal (anniversary) session windows.
--
-- Until now every client's session allowance reset at 00:00 UTC on the 1st of
-- the month, regardless of when they signed up or when they are billed. A
-- client who joined on the 30th therefore got a full month's charge and roughly
-- a day of usable allowance.
--
-- Going forward each client gets their own window, anchored to the day they
-- joined and re-anchored to their payment date when they start a paid plan.
--
-- Existing clients are deliberately left on the calendar-month reset they
-- signed up under; only accounts created after this migration runs use the new
-- anniversary window.

alter table public.profiles
  -- Which system this client's allowance runs on. New rows default to the
  -- anniversary window; every row that exists today is set to false below.
  add column if not exists uses_anniversary_cycle boolean not null default true,

  -- The date the client's personal window counts from. Set to their join date
  -- at signup, then moved to their subscription start date when they first pay,
  -- so the window and the charge always line up.
  add column if not exists session_cycle_anchor timestamptz not null default now(),

  -- The start of the window that sessions_used_this_month currently refers to.
  -- If this is older than the current window, the count is stale and reads as 0
  -- — that is what makes the allowance reset on the client's own date without a
  -- scheduled job needing to touch every row at once.
  add column if not exists session_cycle_started_at timestamptz not null default now(),

  -- The window start we last sent a "your window is closing" email for, so a
  -- client is reminded once per window rather than once per day.
  add column if not exists cycle_reminder_sent_for timestamptz;

-- Everyone who already has an account keeps the 1st-of-the-month reset.
update public.profiles
   set uses_anniversary_cycle = false;

-- Truthful anchor for existing rows (unused while they stay on the calendar
-- reset, but correct if one is ever switched over by hand).
update public.profiles
   set session_cycle_anchor     = coalesce(created_at, now()),
       session_cycle_started_at = coalesce(created_at, now());

-- The monthly job now only resets the clients still on the calendar month.
-- Anniversary clients reset themselves when their own window turns over.
create or replace function public.reset_monthly_sessions()
 returns void
 language sql
 security definer
 set search_path to 'public'
as $function$
  update profiles
  set sessions_used_this_month = 0
  where role = 'client'
    and uses_anniversary_cycle = false;
$function$;
