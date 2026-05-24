# BLACKOUT GRID — Technical Architecture

## Stack
- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase
- OpenAI API
- Vercel

## App structure
Recommended route structure:

```txt
src/
  app/
    page.tsx
    play/page.tsx
    leaderboard/page.tsx
    api/
      ai/
        briefing/route.ts
        counsel/route.ts
        debrief/route.ts
      leaderboard/route.ts
  components/
    game/
      GameBoard.tsx
      GameCell.tsx
      MissionControl.tsx
      StabilityMeter.tsx
      AiPanel.tsx
      EndMissionPanel.tsx
    landing/
      LandingHero.tsx
      HowItWorks.tsx
    leaderboard/
      LeaderboardTable.tsx
  lib/
    game/
      engine.ts
      scoring.ts
      types.ts
    ai/
      fallbacks.ts
      prompts.ts
    supabase/
      client.ts
      server.ts
```

## Client/server split
Client:
- game state
- board interactions
- timer
- UI rendering
- calling API routes

Server:
- OpenAI calls
- Supabase leaderboard reads/writes if using server API route

## Environment variables
```txt
OPENAI_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Optional:
```txt
NEXT_PUBLIC_APP_URL=
```

## Supabase usage
Use anon key with RLS policies allowing public leaderboard insert/select.

No service role required for MVP.

## Deployment
Deploy to Vercel.

Required checks before submit:
- npm run lint
- npm run build
- manual gameplay test
- public URL works in incognito/browser
- GitHub pushed
