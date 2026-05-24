# BLACKOUT RAID — Supabase Multiplayer Schema

## Purpose

Supabase is optional until the single-player AI boss slice works.

Use Supabase for:
- room creation
- lobby/player list
- optional leaderboard
- Realtime broadcast/presence for multiplayer

No auth.

## Minimal DB schema

```sql
create extension if not exists pgcrypto;

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (char_length(code) between 4 and 8),
  status text not null default 'waiting' check (status in ('waiting', 'active', 'finished')),
  host_player_id uuid,
  mission_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);

create table if not exists public.room_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  nickname text not null check (char_length(nickname) between 1 and 24),
  is_host boolean not null default false,
  score integer not null default 0,
  kills integer not null default 0,
  damage_taken integer not null default 0,
  joined_at timestamptz not null default now()
);

alter table public.rooms enable row level security;
alter table public.room_players enable row level security;

drop policy if exists "public rooms read" on public.rooms;
create policy "public rooms read"
on public.rooms for select
to anon, authenticated
using (true);

drop policy if exists "public rooms insert" on public.rooms;
create policy "public rooms insert"
on public.rooms for insert
to anon, authenticated
with check (char_length(code) between 4 and 8);

drop policy if exists "public rooms update" on public.rooms;
create policy "public rooms update"
on public.rooms for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "public players read" on public.room_players;
create policy "public players read"
on public.room_players for select
to anon, authenticated
using (true);

drop policy if exists "public players insert" on public.room_players;
create policy "public players insert"
on public.room_players for insert
to anon, authenticated
with check (char_length(nickname) between 1 and 24);

drop policy if exists "public players update" on public.room_players;
create policy "public players update"
on public.room_players for update
to anon, authenticated
using (true)
with check (true);

create index if not exists rooms_code_idx on public.rooms(code);
create index if not exists room_players_room_id_idx on public.room_players(room_id);
```

## Optional leaderboard

```sql
create table if not exists public.leaderboard_entries (
  id uuid primary key default gen_random_uuid(),
  player_name text not null check (char_length(player_name) between 1 and 32),
  score integer not null check (score >= 0),
  result text not null check (result in ('victory', 'wipeout')),
  rooms_cleared integer not null check (rooms_cleared >= 0),
  kills integer not null check (kills >= 0),
  damage_taken integer not null check (damage_taken >= 0),
  created_at timestamptz not null default now()
);

alter table public.leaderboard_entries enable row level security;

create policy "public leaderboard read"
on public.leaderboard_entries for select
to anon, authenticated
using (true);

create policy "public leaderboard insert"
on public.leaderboard_entries for insert
to anon, authenticated
with check (
  char_length(player_name) between 1 and 32
  and score >= 0
  and result in ('victory', 'wipeout')
  and rooms_cleared >= 0
  and kills >= 0
  and damage_taken >= 0
);

create index if not exists leaderboard_score_idx
on public.leaderboard_entries(score desc, created_at asc);
```

## Realtime model

Do not persist every position frame.

Use Supabase Realtime broadcast channels:
- `raid-room-{code}`

Events:
- `player-input`
- `state-snapshot`
- `raid-start`
- `raid-end`

Presence:
- track players online in lobby/game

## Host-authoritative rule

Host simulates:
- enemy AI
- bullets
- boss state
- damage
- wave progression
- pickups

Guest sends:
- movement input
- aim direction
- shoot pressed
- dash pressed

Host broadcasts:
- player positions
- enemy positions
- bullets
- HP
- score
- current wave
- boss HP
