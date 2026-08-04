-- Tia Hall is a Strategic Partner Level PM Tenant and should be on the Advantage plan.
-- Her profile was created on the Free plan. This migration corrects that.
-- Guarded so it only touches a still-mislabeled row.
update profiles
set plan_tier = 'advantage'
where first_name = 'Tia'
  and last_name  = 'Hall'
  and role       = 'client'
  and plan_tier  = 'free';
