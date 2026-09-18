-- Luminaria: foundation for persistent profiles and live rooms.
-- Run this entire file in Supabase: SQL Editor -> New query -> Run.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null check (char_length(nickname) between 2 and 24),
  avatar text not null default '☽',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9]{6}$'),
  host_id uuid not null references auth.users(id) on delete cascade,
  deck_id text not null default 'moonlit-archive',
  status text not null default 'lobby' check (status in ('lobby', 'playing', 'finished')),
  created_at timestamptz not null default now()
);

create table if not exists public.room_players (
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  is_ready boolean not null default false,
  score integer not null default 0,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.room_players enable row level security;

create policy "profiles are visible to signed-in players" on public.profiles
  for select to authenticated using (true);
create policy "players create their own profile" on public.profiles
  for insert to authenticated with check (auth.uid() = id);
create policy "players update their own profile" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create policy "signed-in players can read rooms" on public.rooms
  for select to authenticated using (true);
create policy "hosts create rooms" on public.rooms
  for insert to authenticated with check (auth.uid() = host_id);
create policy "hosts update their rooms" on public.rooms
  for update to authenticated using (auth.uid() = host_id);

create policy "signed-in players can read room rosters" on public.room_players
  for select to authenticated using (true);
create policy "players join rooms as themselves" on public.room_players
  for insert to authenticated with check (auth.uid() = user_id);
create policy "players update their own seat" on public.room_players
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "players leave their own seat" on public.room_players
  for delete to authenticated using (auth.uid() = user_id);

-- Realtime room updates.
alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.room_players;
