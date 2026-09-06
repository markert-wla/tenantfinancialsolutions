-- One-time data fix: a client paid for the Advantage plan (payment verified
-- in Stripe by the owner on 2026-09-05, effective 2026-09-01), but the
-- confirmation from Stripe never reached the site, so no subscription id was
-- saved and the account was left on the free tier.
--
-- This sets the account to the Advantage tier and records the live Stripe
-- subscription id the owner read from the Stripe dashboard, so future
-- renewal/cancellation events from Stripe match this profile instead of
-- falling through the "no recorded subscription" paths in
-- src/app/api/stripe/webhook/route.ts. The account is matched by its unique
-- id, with the email and current tier as guards so the update is a no-op if
-- the record has already been corrected by the time this runs.
--
-- Session allowance needs no backdating: allowances reset on the 1st of the
-- month, so the September window already started 2026-09-01.

update public.profiles
   set plan_tier              = 'advantage',
       stripe_subscription_id = 'sub_1U8nvqF200S85BOkQvrl5sKE'
 where id = 'cbdfe854-094c-41d3-82cf-6caa1f89c672'
   and email = 'bgoss_1@comcast.net'
   and plan_tier = 'free';

-- Safety net: if the tier happens to be corrected some other way before this
-- runs, still record the subscription link (only when none is set).
update public.profiles
   set stripe_subscription_id = 'sub_1U8nvqF200S85BOkQvrl5sKE'
 where id = 'cbdfe854-094c-41d3-82cf-6caa1f89c672'
   and email = 'bgoss_1@comcast.net'
   and stripe_subscription_id is null;
