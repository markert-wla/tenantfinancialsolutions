-- Strategic Partner Level PM tenants belong on the Advantage plan.
--
-- Live-data context (verified 2026-08-10):
--   * The MARKERTAPTS promo code already exists and is linked to the partner
--     "Markert Properties" (code_type 'full_comp', assigned_tier 'advantage').
--   * "Markert Properties" has no partner model set (NULL), so nothing in the
--     app can recognize it as a Strategic Partner Level (paying) partner.
--   * Tia Hall registered with MARKERTAPTS on 2026-05-15 but her plan_tier is
--     still 'free'. Her promo_code_used, applied_code_type ('full_comp') and
--     partner_id are already correct and must NOT be changed — 'full_comp' +
--     property_tenant is what grants the 2-sessions/month tenant benefit in
--     the booking flow.

-- 1. Mark Markert Properties as a Strategic Partner Level (paying) partner.
UPDATE partners
SET model = 'paying'
WHERE partner_name = 'Markert Properties'
  AND model IS NULL;

-- 2. Fix Tia Hall's plan tier (guarded so it only corrects the mislabeled row).
UPDATE profiles
SET plan_tier = 'advantage'
WHERE id = 'a6b6d732-e4ea-49a5-a3b8-c02daade7f66'  -- Tia Hall
  AND plan_tier = 'free';
