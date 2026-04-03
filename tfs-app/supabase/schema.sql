-- ============================================================
-- Tenant Financial Solutions — Supabase Schema + RLS
-- Paste this entire file into the Supabase SQL Editor and run.
-- ============================================================

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ─── ENUMS ──────────────────────────────────────────────────
create type user_role as enum ('client', 'coach', 'admin');
create type plan_tier as enum ('free', 'bronze', 'silver', 'gold');
create type booking_status as enum ('pending', 'confirmed', 'cancelled');
create type partner_type as enum ('property_management', 'nonprofit', 'trial');
create type partner_model as enum ('affiliate', 'paying');

-- ─── PROFILES ───────────────────────────────────────────────
create table profiles (
  id                     uuid primary key references auth.users(id) on delete cascade,
  role                   user_role not null default 'client',
  first_name             text not null,
  last_name              text not null,
  email                  text not null,
  timezone               text not null default 'America/New_York',
  plan_tier              plan_tier not null default 'free',
  sessions_used_this_month int not null default 0,
  stripe_customer_id     text,
  stripe_subscription_id text,
  promo_code_used        text,
  unit_number            text,
  birthday_month         int check (birthday_month between 1 and 12),
  is_active              boolean not null default true,
  last_active_at         timestamptz not null default now(),
  created_at             timestamptz not null default now()
);

-- RLS
alter table profiles enable row level security;

-- Users can read/update their own profile
create policy "profiles: own read"
  on profiles for select
  using (auth.uid() = id);

create policy "profiles: own update"
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Admins can read all profiles
create policy "profiles: admin read all"
  on profiles for select
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Admins can update any profile
create policy "profiles: admin update all"
  on profiles for update
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Coaches can read client profiles (for booking context)
create policy "profiles: coach read clients"
  on profiles for select
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'coach'
    )
  );

-- Service role can insert (used during registration via server-side API)
create policy "profiles: service insert"
  on profiles for insert
  with check (true);

-- ─── COACHES ────────────────────────────────────────────────
create table coaches (
  id           uuid primary key references profiles(id) on delete cascade,
  display_name text not null,
  photo_url    text,
  bio          text,
  specialty    text,
  timezone     text not null default 'America/New_York',
  email        text not null,
  is_active    boolean not null default true
);

alter table coaches enable row level security;

-- Public read (coach bios visible to everyone — no auth required)
create policy "coaches: public read"
  on coaches for select
  using (is_active = true);

-- Coaches can update their own record
create policy "coaches: own update"
  on coaches for update
  using (auth.uid() = id);

-- Admins can do everything
create policy "coaches: admin all"
  on coaches for all
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- ─── AVAILABILITY ────────────────────────────────────────────
create table availability (
  id              uuid primary key default gen_random_uuid(),
  coach_id        uuid not null references coaches(id) on delete cascade,
  day_of_week     int not null check (day_of_week between 0 and 6),
  start_time_utc  time not null,
  end_time_utc    time not null,
  constraint availability_times_check check (end_time_utc > start_time_utc)
);

alter table availability enable row level security;

-- Authenticated users can read availability (needed for booking)
create policy "availability: authenticated read"
  on availability for select
  using (auth.role() = 'authenticated');

-- Coaches manage their own availability
create policy "availability: coach manage own"
  on availability for all
  using (auth.uid() = coach_id);

-- Admins can manage all
create policy "availability: admin all"
  on availability for all
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- ─── BOOKINGS ────────────────────────────────────────────────
create table bookings (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references profiles(id),
  coach_id        uuid not null references coaches(id),
  start_time_utc  timestamptz not null,
  end_time_utc    timestamptz not null,
  status          booking_status not null default 'confirmed',
  notes           text,
  created_at      timestamptz not null default now(),
  constraint bookings_duration_check check (end_time_utc > start_time_utc)
);

alter table bookings enable row level security;

-- Clients can read their own bookings
create policy "bookings: client read own"
  on bookings for select
  using (auth.uid() = client_id);

-- Clients can insert (booking engine validates limits via API)
create policy "bookings: client insert"
  on bookings for insert
  with check (auth.uid() = client_id);

-- Coaches can read their bookings
create policy "bookings: coach read own"
  on bookings for select
  using (auth.uid() = coach_id);

-- Admins can read all and update/delete
create policy "bookings: admin all"
  on bookings for all
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- ─── PROMO CODES ─────────────────────────────────────────────
create table promo_codes (
  code          text primary key,
  partner_type  partner_type not null,
  partner_name  text not null,
  assigned_tier plan_tier not null check (assigned_tier in ('free', 'bronze', 'silver')),
  max_uses      int not null default 1,
  uses_count    int not null default 0,
  is_active     boolean not null default true,
  expires_at    timestamptz,
  created_by    uuid references profiles(id),
  created_at    timestamptz not null default now()
);

alter table promo_codes enable row level security;

-- Admins manage all codes
create policy "promo_codes: admin all"
  on promo_codes for all
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Anyone can read a code to validate it at registration (anon OK)
-- Validation logic (max_uses, expiry, is_active) enforced in API route
create policy "promo_codes: public read for validation"
  on promo_codes for select
  using (true);

-- ─── TESTIMONIALS ────────────────────────────────────────────
create table testimonials (
  id           uuid primary key default gen_random_uuid(),
  client_name  text not null,
  quote        text not null,
  plan_tier    plan_tier,
  approved     boolean not null default false,
  submitted_at timestamptz not null default now()
);

alter table testimonials enable row level security;

-- Public can read approved testimonials only
create policy "testimonials: public read approved"
  on testimonials for select
  using (approved = true);

-- Authenticated clients can submit
create policy "testimonials: client insert"
  on testimonials for insert
  with check (auth.role() = 'authenticated');

-- Admins manage all
create policy "testimonials: admin all"
  on testimonials for all
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- ─── GROUP SESSIONS ──────────────────────────────────────────
create table group_sessions (
  id               uuid primary key default gen_random_uuid(),
  session_date     date not null,
  join_link        text,
  coaches_present  uuid[] not null default '{}',
  recording_url    text,
  reminder_sent    boolean not null default false,
  created_at       timestamptz not null default now()
);

alter table group_sessions enable row level security;

-- Authenticated users can read group sessions
create policy "group_sessions: authenticated read"
  on group_sessions for select
  using (auth.role() = 'authenticated');

-- Admins manage all
create policy "group_sessions: admin all"
  on group_sessions for all
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- ─── PARTNERS ────────────────────────────────────────────────
create table partners (
  id             uuid primary key default gen_random_uuid(),
  partner_name   text not null,
  partner_type   partner_type not null,
  contact_name   text,
  contact_email  text,
  model          partner_model,
  created_at     timestamptz not null default now()
);

alter table partners enable row level security;

-- Admins manage all
create policy "partners: admin all"
  on partners for all
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- ─── FUNCTIONS ───────────────────────────────────────────────

-- Auto-create profile on new user signup
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into profiles (id, email, first_name, last_name, role, plan_tier)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'client'),
    coalesce((new.raw_user_meta_data->>'plan_tier')::plan_tier, 'free')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- Monthly session reset (call this via Vercel cron or Supabase scheduled function)
create or replace function reset_monthly_sessions()
returns void
language sql
security definer
as $$
  update profiles
  set sessions_used_this_month = 0
  where role = 'client';
$$;

-- Update last_active_at on profile update
create or replace function update_last_active()
returns trigger
language plpgsql
as $$
begin
  new.last_active_at = now();
  return new;
end;
$$;

create trigger profiles_last_active
  before update on profiles
  for each row execute procedure update_last_active();

-- ─── INDEXES ─────────────────────────────────────────────────
create index idx_profiles_role on profiles(role);
create index idx_profiles_plan_tier on profiles(plan_tier);
create index idx_profiles_last_active on profiles(last_active_at);
create index idx_bookings_client on bookings(client_id);
create index idx_bookings_coach on bookings(coach_id);
create index idx_bookings_start on bookings(start_time_utc);
create index idx_availability_coach on availability(coach_id);
create index idx_promo_codes_active on promo_codes(is_active);
