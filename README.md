# BLACKOUT RAID

BLACKOUT RAID is a browser-based cyber roguelite chamber raid built with Next.js, TypeScript, Tailwind, Phaser 3, and Supabase Realtime. The current demo sends the player through four linked rooms, offers weapons and rewards between portals, and ends with the adaptive Blackout Core while an AI Director handles mission framing, crisis events, boss phase guidance, and the final debrief.

## Tech stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Phaser 3
- Supabase (`@supabase/supabase-js`) for co-op rooms and Realtime sync
- OpenAI Responses API through server-side route handlers

## Core loop

1. Load the mission in the browser.
2. Clear the Entry Chamber and draft a reward.
3. Push through the Drone Chamber and prepare for escalation.
4. React to the AI Director Surge Chamber crisis event.
5. Secure the corrupted boss portal and defeat the Blackout Core.
6. Review the AI debrief on victory or wipeout.

## Co-op MVP

The room-code co-op MVP adds:

- `/room` for room creation and joining
- `/room/[code]` lobby and game route
- host-started raid flow
- Supabase-backed room and player records
- Realtime player movement/shooting sync
- host snapshots for enemies, boss, portals, and shared room progress

This pass is intentionally narrow: it is a two-player hackathon build, not a production multiplayer stack.

## Controls

- `WASD`: move
- `Mouse`: aim
- `Left click`: fire
- `Space`: dash
- `R`: restart after defeat or victory

## AI usage

The AI Director lives behind server-only routes:

- `POST /api/ai/mission`
- `POST /api/ai/event`
- `POST /api/ai/boss-phase`
- `POST /api/ai/debrief`

These routes use the OpenAI Responses API on the server only. All outputs are validated before they touch gameplay. If `OPENAI_API_KEY` is missing, the route fails, or the response is too slow, the game falls back to safe local JSON and remains fully playable.

## Environment variables

- `OPENAI_API_KEY`
  Required for live AI Director responses.
- `OPENAI_MODEL`
  Optional. Defaults to `gpt-4.1-mini` in the current implementation.
- `NEXT_PUBLIC_SUPABASE_URL`
  Required for co-op room creation and Realtime sync.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  Required for co-op room creation and Realtime sync.

## Local setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

To enable co-op, apply the SQL in `supabase/schema.sql` to your Supabase project and set the public Supabase env vars locally.

## Build checks

```bash
npm run lint
npm run build
```

## Deployment notes

- Deploy as a standard Next.js app.
- Keep `OPENAI_API_KEY` configured only in the server environment.
- Do not expose OpenAI keys or AI route secrets to client code.
- The Phaser game is client-only and mounts inside the `/play` route shell.
- The app still works without OpenAI because all AI Director routes have local fallbacks.
- The app still works without Supabase because solo `/play` remains available and co-op routes show a clean fallback message.

## Demo explanation

This build is intended as a clean exam/demo slice rather than a full content-complete game. It demonstrates:

- a polished landing page
- a readable mission-control play shell
- a fully playable local chamber raid loop
- weapon and reward choices between rooms
- a multi-phase boss fight
- AI-assisted presentation layered onto deterministic combat systems
