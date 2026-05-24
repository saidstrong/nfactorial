# BLACKOUT GRID — Supabase Schema

## Purpose
Supabase is used only for public leaderboard storage.

No authentication.

## SQL

```sql
create table if not exists public.leaderboard_entries (
  id uuid primary key default gen_random_uuid(),
  player_name text not null check (char_length(player_name) between 1 and 32),
  score integer not null check (score >= 0),
  time_seconds integer not null check (time_seconds >= 0),
  result text not null check (result in ('win', 'loss')),
  rank_label text not null,
  stability integer not null check (stability >= 0 and stability <= 100),
  ai_tools_used integer not null check (ai_tools_used >= 0),
  correct_flags integer not null check (correct_flags >= 0),
  wrong_flags integer not null check (wrong_flags >= 0),
  created_at timestamptz not null default now()
);

alter table public.leaderboard_entries enable row level security;

drop policy if exists "Public leaderboard read" on public.leaderboard_entries;
create policy "Public leaderboard read"
on public.leaderboard_entries
for select
to anon, authenticated
using (true);

drop policy if exists "Public leaderboard insert" on public.leaderboard_entries;
create policy "Public leaderboard insert"
on public.leaderboard_entries
for insert
to anon, authenticated
with check (
  char_length(player_name) between 1 and 32
  and score >= 0
  and time_seconds >= 0
  and result in ('win', 'loss')
  and stability >= 0
  and stability <= 100
  and ai_tools_used >= 0
  and correct_flags >= 0
  and wrong_flags >= 0
);

create index if not exists leaderboard_entries_score_idx
on public.leaderboard_entries (score desc, time_seconds asc, created_at asc);
```

## Leaderboard query
Order by:
1. score descending
2. time_seconds ascending
3. created_at ascending

Limit: top 20 or top 50.

## Input hygiene
Before submit:
- trim player name
- max 32 chars
- default empty invalid name to "Operator"
- submit score only after game end
