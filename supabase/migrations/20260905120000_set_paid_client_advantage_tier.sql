-- One-time data fix: a client paid for the Advantage plan (payment verified
-- in Stripe by the owner on 2026-09-05, effective 2026-09-01), but the
-- confirmation from Stripe never reached the site, so no subscription id was
-- saved and the account was left on the free tier.
--
-- This sets the account to the Advantage tier. The account is matched by its
-- unique id, with the email and current tier as guards so the update is a
-- no-op if the record has already been corrected by the time this runs.
--
-- Session allowance needs no backdating: allowances reset on the 1st of the
-- month, so the September window already started 2026-09-01.
--
-- Note: profiles.stripe_subscription_id remains empty because the
-- subscription confirmation was never received; automatic renewal/cancel
-- updates from Stripe will not apply to this account until that link is
-- restored.

update public.profiles
   set plan_tier = 'advantage'
 where id = 'cbdfe854-094c-41d3-82cf-6caa1f89c672'
   and email = 'bgoss_1@comcast.net'
   and plan_tier = 'free';
