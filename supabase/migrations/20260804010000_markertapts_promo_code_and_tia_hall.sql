-- Create Markert Apartments as a Strategic Partner (Property Management, paying model)
-- and the MARKERTAPTS promo code (Advantage Plan, Tier Assignment).
-- Also updates Tia Hall's profile to be fully linked to this code and confirmed on the Advantage Plan.

-- Step 1: Ensure Markert Apartments exists as a Strategic Partner
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM partners WHERE partner_name = 'Markert Apartments') THEN
    INSERT INTO partners (partner_name, partner_type, model)
    VALUES ('Markert Apartments', 'property_management', 'paying');
  END IF;
END $$;

-- Step 2: Create the MARKERTAPTS promo code if it does not already exist
DO $$
DECLARE
  v_partner_id uuid;
BEGIN
  SELECT id INTO v_partner_id
  FROM partners
  WHERE partner_name = 'Markert Apartments'
  LIMIT 1;

  IF v_partner_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM promo_codes WHERE code = 'MARKERTAPTS'
  ) THEN
    INSERT INTO promo_codes (
      code,
      partner_id,
      partner_name,
      partner_type,
      assigned_tier,
      code_type,
      max_uses,
      uses_count,
      is_active
    ) VALUES (
      'MARKERTAPTS',
      v_partner_id,
      'Markert Apartments',
      'property_management',
      'advantage',
      'tier_assignment',
      100,
      0,
      true
    );
  END IF;
END $$;

-- Step 3: Update Tia Hall — confirm Advantage Plan and link her profile to MARKERTAPTS
UPDATE profiles
SET
  plan_tier         = 'advantage',
  promo_code_used   = 'MARKERTAPTS',
  applied_code_type = 'tier_assignment',
  partner_id        = (
    SELECT id FROM partners WHERE partner_name = 'Markert Apartments' LIMIT 1
  )
WHERE lower(first_name) = 'tia'
  AND lower(last_name)  = 'hall'
  AND role              = 'client';
