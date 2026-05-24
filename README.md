# BLACKOUT RAID

BLACKOUT RAID is a browser-based cyber roguelite arena shooter built with Next.js, TypeScript, Tailwind, and Phaser 3. The current demo asks the player to survive three enemy waves, draft upgrades, and defeat the adaptive Blackout Core while an AI Director handles mission framing, crisis events, boss phase guidance, and the final debrief.

## Tech stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Phaser 3
- OpenAI Responses API through server-side route handlers

## Core loop

1. Load the mission in the browser.
2. Survive three escalating breach waves.
3. Choose one upgrade after Wave 1 and Wave 2.
4. React to the AI Director Wave 3 crisis event.
5. Defeat the Blackout Core boss.
6. Review the AI debrief on victory or wipeout.

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

## Local setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

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

## Demo explanation

This build is intended as a clean exam/demo slice rather than a full content-complete game. It demonstrates:

- a polished landing page
- a readable mission-control play shell
- a fully playable local combat loop
- upgrade choices between waves
- a multi-phase boss fight
- AI-assisted presentation layered onto deterministic combat systems
