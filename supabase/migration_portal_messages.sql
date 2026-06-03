-- Portal messages: clients can send notes to their coach via the portal
create table portal_messages (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references profiles(id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 2000),
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

alter table portal_messages enable row level security;

-- Clients can insert and read their own messages
create policy "portal_messages: client insert own"
  on portal_messages for insert
  with check (auth.uid() = client_id);

create policy "portal_messages: client read own"
  on portal_messages for select
  using (auth.uid() = client_id);

-- Coaches can read all messages (filtered by client on the query side)
create policy "portal_messages: coach read"
  on portal_messages for select
  using (get_my_role() = 'coach');

-- Coaches can mark messages as read
create policy "portal_messages: coach update"
  on portal_messages for update
  using (get_my_role() = 'coach')
  with check (get_my_role() = 'coach');

-- Admins full access
create policy "portal_messages: admin all"
  on portal_messages for all
  using (get_my_role() = 'admin');
