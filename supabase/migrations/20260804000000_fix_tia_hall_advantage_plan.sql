-- Fix: Tia Hall should be on the Advantage plan (Strategic Partner Level PM tenant).
-- Strategic Partner Level PM tenants are pre-paid by their property manager and
-- are entitled to the Advantage plan: 2 coaching sessions/month + TFS Community Connect.

UPDATE profiles
SET plan_tier = 'advantage'
WHERE lower(first_name) = 'tia'
  AND lower(last_name)  = 'hall'
  AND plan_tier = 'free';
