-- Rename plan tiers to match the customer-facing plan names:
--   bronze → starter, silver → advantage
-- and remove the unused gold tier (never sold; any stray rows map to advantage).

alter type plan_tier rename to plan_tier_old;
create type plan_tier as enum ('free', 'starter', 'advantage');

-- profiles.plan_tier
alter table profiles alter column plan_tier drop default;
alter table profiles
  alter column plan_tier type plan_tier
  using (case plan_tier::text
           when 'bronze' then 'starter'
           when 'silver' then 'advantage'
           when 'gold'   then 'advantage'
           else plan_tier::text
         end)::plan_tier;
alter table profiles alter column plan_tier set default 'free';

-- promo_codes.assigned_tier — drop any check constraints that reference the old
-- tier literals before converting, then re-add with the new names.
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'promo_codes'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%assigned_tier%'
  loop
    execute format('alter table promo_codes drop constraint %I', c.conname);
  end loop;
end $$;

alter table promo_codes
  alter column assigned_tier type plan_tier
  using (case assigned_tier::text
           when 'bronze' then 'starter'
           when 'silver' then 'advantage'
           when 'gold'   then 'advantage'
           else assigned_tier::text
         end)::plan_tier;

alter table promo_codes
  add constraint promo_codes_assigned_tier_check
  check (assigned_tier in ('free', 'starter', 'advantage'));

-- testimonials.plan_tier (nullable, no default)
alter table testimonials
  alter column plan_tier type plan_tier
  using (case plan_tier::text
           when 'bronze' then 'starter'
           when 'silver' then 'advantage'
           when 'gold'   then 'advantage'
           else plan_tier::text
         end)::plan_tier;

-- Fail loudly if any column still uses the old type before dropping it.
do $$
declare n int;
begin
  select count(*) into n
  from pg_attribute a
  join pg_type t on t.oid = a.atttypid
  where t.typname = 'plan_tier_old' and a.attnum > 0 and not a.attisdropped;
  if n > 0 then
    raise exception 'plan_tier_old is still used by % column(s); migration incomplete', n;
  end if;
end $$;

drop type plan_tier_old;
