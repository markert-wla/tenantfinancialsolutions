-- Migration: contact_submissions
-- Run in Supabase SQL Editor after migration_affiliate_codes.sql

create table contact_submissions (
  id                uuid        primary key default gen_random_uuid(),
  name              text        not null,
  email             text        not null,
  phone             text,
  inquiry_type      text,
  message           text        not null,
  status            text        not null default 'new'
    check (status in ('new', 'read', 'assigned', 'resolved')),
  assigned_coach_id uuid        references coaches(id) on delete set null,
  submitted_at      timestamptz not null default now()
);

alter table contact_submissions enable row level security;

-- Admins can do everything
create policy "contact_submissions: admin all"
  on contact_submissions for all
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Coaches can read submissions assigned to them
create policy "contact_submissions: coach read assigned"
  on contact_submissions for select
  using (auth.uid() = assigned_coach_id);
