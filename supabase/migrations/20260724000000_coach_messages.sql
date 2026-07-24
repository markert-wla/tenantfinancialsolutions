-- Coach messages: coaches can send notes to their clients via the portal
create table coach_messages (
  id         uuid primary key default gen_random_uuid(),
  coach_id   uuid not null references profiles(id) on delete cascade,
  client_id  uuid not null references profiles(id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 2000),
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

alter table coach_messages enable row level security;

-- Coaches can insert their own messages
create policy "coach_messages: coach insert own"
  on coach_messages for insert
  with check (auth.uid() = coach_id);

-- Coaches can read messages they sent
create policy "coach_messages: coach read own"
  on coach_messages for select
  using (auth.uid() = coach_id);

-- Clients can read messages sent to them
create policy "coach_messages: client read own"
  on coach_messages for select
  using (auth.uid() = client_id);

-- Clients can mark messages as read
create policy "coach_messages: client update read_at"
  on coach_messages for update
  using (auth.uid() = client_id)
  with check (auth.uid() = client_id);

-- Admins full access
create policy "coach_messages: admin all"
  on coach_messages for all
  using (get_my_role() = 'admin');
