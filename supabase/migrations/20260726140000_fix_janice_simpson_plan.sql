-- Correct Janice Simpson's plan label: she upgraded to the Starter plan but her
-- profile was left on 'free' (the webhook missed the upgrade event — fixed in code
-- alongside this migration). Guarded so it only touches a still-mislabeled row.
update profiles
set plan_tier = 'starter'
where first_name = 'Janice'
  and last_name = 'Simpson'
  and role = 'client'
  and plan_tier = 'free';
