-- Fix Janice Simpson's plan tier from 'free' to 'starter'
-- This corrects a record where the plan label was not updated when she upgraded.
UPDATE profiles
SET plan_tier = 'starter'
WHERE first_name = 'Janice'
  AND last_name = 'Simpson'
  AND role = 'client'
  AND plan_tier = 'free';
