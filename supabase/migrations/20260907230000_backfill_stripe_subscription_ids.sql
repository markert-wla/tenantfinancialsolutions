-- One-time data fix: record the live Stripe subscription id for the paid
-- clients whose confirmation webhook was rejected.
--
-- Background: from 2026-04-30 until 2026-09-07 the production
-- STRIPE_WEBHOOK_SECRET did not match the endpoint's signing secret, so every
-- delivery was rejected with 400 and no profile ever received its
-- stripe_subscription_id. The secret has been corrected; this backfills the
-- three accounts whose July/June events are now too old for Stripe to resend.
--
-- Each subscription id below was read from the live Stripe account on
-- 2026-09-07 and carries this profile's id in its metadata. Rows are matched
-- on profile id AND the Stripe customer id already stored on the row, and
-- only when no subscription id is recorded yet, so the update is a no-op for
-- anything that has since been corrected another way.
--
-- Not included: profile a6b6d732-e4ea-49a5-a3b8-c02daade7f66 is on a paid tier
-- with a Stripe customer but no subscription exists for that customer in
-- Stripe, so there is nothing to link; the owner should confirm whether that
-- account is comped.

update public.profiles
   set stripe_subscription_id = 'sub_1TzDrZF200S85BOk5tJjtnER'
 where id = '9703cd52-bba2-4c02-9c65-763afaa3cc4f'
   and stripe_customer_id = 'cus_UyejkiiFOkbLmF'
   and stripe_subscription_id is null;

update public.profiles
   set stripe_subscription_id = 'sub_1TzPCuF200S85BOkfCvFpKwu'
 where id = '49e37b22-75aa-4744-bbf6-21612bf7345f'
   and stripe_customer_id = 'cus_UywiZh5LDjQZdT'
   and stripe_subscription_id is null;

update public.profiles
   set stripe_subscription_id = 'sub_1TeYklF200S85BOkkdUzpcfq'
 where id = 'b1edb193-782a-42e6-b08c-9f5b9b11f35f'
   and stripe_customer_id = 'cus_UdqQhEyFOsTUjc'
   and stripe_subscription_id is null;
