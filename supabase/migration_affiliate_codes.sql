-- Migration: affiliate_discount_and_comp_codes
-- Run in Supabase SQL Editor after migration_phase3.sql

ALTER TABLE promo_codes
  ADD COLUMN IF NOT EXISTS code_type TEXT NOT NULL DEFAULT 'tier_assignment'
    CHECK (code_type IN ('tier_assignment', 'affiliate_discount', 'full_comp', 'group_comp')),
  ADD COLUMN IF NOT EXISTS discount_percent INT
    CHECK (discount_percent IS NULL OR (discount_percent > 0 AND discount_percent <= 100));

COMMENT ON COLUMN promo_codes.code_type IS
  'tier_assignment = standard code that assigns a plan tier; affiliate_discount = assigns tier + applies % off first Stripe invoice; full_comp = complimentary full coaching (no billing); group_comp = complimentary group session only (distinct from nonprofit for reporting)';

COMMENT ON COLUMN promo_codes.discount_percent IS
  'Only used when code_type = affiliate_discount. Percentage off first month (e.g. 10 = 10%).';
