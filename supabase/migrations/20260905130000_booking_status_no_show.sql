-- Allow a session to be marked as a no-show.
--
-- The admin Bookings page already offers a "Mark as No-Show" action and filter,
-- but 'no_show' was never added to the booking_status enum, so the update was
-- rejected by Postgres. Adding the value here makes no-show work for admins and
-- for coaches (coach Sessions page).
ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'no_show';
