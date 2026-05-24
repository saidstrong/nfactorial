# BLACKOUT RAID — Technical Architecture

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Phaser 3 for game canvas
- OpenAI API for AI Director
- Supabase for optional lobby/multiplayer/leaderboard
- Vercel deployment

## Recommended package choices

Core:
- next
- react
- react-dom
- typescript
- tailwindcss
- phaser
- zod
- openai
- @supabase/supabase-js

Use npm unless project already uses another package manager.

## Route structure

```txt
src/
  app/
    page.tsx
    play/page.tsx
    leaderboard/page.tsx
    room/[code]/page.tsx              optional multiplayer
    api/
      ai/
        mission/route.ts
        event/route.ts
        boss-phase/route.ts
        debrief/route.ts
      leaderboard/route.ts            optional
  components/
    game/
      RaidShell.tsx
      PhaserRaidGame.tsx
      GameHud.tsx
      EndRaidPanel.tsx
    landing/
      LandingHero.tsx
      HowItWorks.tsx
    lobby/
      CreateRoomForm.tsx              optional
      JoinRoomForm.tsx                optional
  lib/
    game/
      types.ts
      constants.ts
      scoring.ts
      upgrades.ts
      bossModes.ts
    ai/
      fallbacks.ts
      validation.ts
      prompts.ts
    supabase/
      client.ts                       optional
```

## Phaser integration

Phaser must run only on the client.

Use dynamic import or a client component:
- `PhaserRaidGame.tsx` with `"use client"`
- initialize Phaser inside `useEffect`
- destroy game instance on unmount

Avoid SSR issues:
- never import browser-only Phaser code into server components without dynamic/client guard

## Game architecture

Recommended:
```txt
lib/game/       pure constants/types/helpers
components/game Phaser wrapper and UI
game scene      Phaser scene class or factory
```

MVP can keep the Phaser scene inside a client component if faster, but avoid unreadable huge files if possible.

## AI routes

Server-side only:
- read `OPENAI_API_KEY`
- if missing, return fallback
- validate allowed modifiers/modes
- return short JSON payload

## Multiplayer architecture

Only after local game works.

Use host-authoritative model:
- host browser runs simulation
- guest sends inputs via Supabase Realtime broadcast
- host broadcasts state snapshots
- DB stores lobby/room metadata

Do not write every player position to database rows.

## Deployment

Vercel-compatible.

Pre-submit checks:
```bash
npm run lint
npm run build
```

Manual check:
- game loads on deployed URL
- no OpenAI key required for fallback
- if OpenAI key configured, AI text appears
