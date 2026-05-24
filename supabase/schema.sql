create extension if not exists pgcrypto;

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  status text not null default 'waiting' check (status in ('waiting', 'active', 'finished')),
  host_player_id uuid null,
  created_at timestamptz not null default timezone('utc', now()),
  started_at timestamptz null,
  finished_at timestamptz null
);

create table if not exists public.room_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  nickname text not null check (char_length(trim(nickname)) between 1 and 24),
  is_host boolean not null default false,
  joined_at timestamptz not null default timezone('utc', now())
);

create index if not exists room_players_room_id_idx on public.room_players(room_id);

alter table public.rooms enable row level security;
alter table public.room_players enable row level security;

drop policy if exists "hackathon public access rooms" on public.rooms;
create policy "hackathon public access rooms"
on public.rooms
for all
using (true)
with check (true);

drop policy if exists "hackathon public access room_players" on public.room_players;
create policy "hackathon public access room_players"
on public.room_players
for all
using (true)
with check (true);

alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.room_players;
