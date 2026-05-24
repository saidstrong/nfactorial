# BLACKOUT GRID — Build Phases

## Phase 0 — Project setup
Goal:
Set up clean Next.js app with Tailwind.

Tasks:
- Create app
- Install Supabase client and OpenAI SDK if needed
- Configure environment placeholders
- Create basic routes: /, /play, /leaderboard
- Add dark visual foundation

Acceptance:
- App runs locally
- Routes load
- Build passes

## Phase 1 — Core game engine
Goal:
Working Minesweeper-like gameplay.

Tasks:
- Board generator
- Corruption placement
- Adjacent count calculation
- Reveal logic
- Flood reveal for empty cells
- Flag toggle
- Win/loss detection
- Restart

Acceptance:
- Game is playable without AI or Supabase

## Phase 2 — Mission systems
Goal:
Make it BLACKOUT GRID, not generic Minesweeper.

Tasks:
- Stability meter
- Timer
- Score calculation
- Flags remaining
- Rank labels
- Shield Pulse
- Scan Node
- Mission log

Acceptance:
- Stability and score update correctly
- Win/loss screens show stats

## Phase 3 — AI routes
Goal:
Add visible AI value safely.

Tasks:
- /api/ai/briefing
- /api/ai/counsel
- /api/ai/debrief
- Fallbacks
- Client integration

Acceptance:
- Game works with and without OPENAI_API_KEY
- AI text appears in UI
- No API key exposed client-side

## Phase 4 — Leaderboard
Goal:
Persist scores.

Tasks:
- Supabase schema
- Leaderboard submit
- Leaderboard page
- Error handling

Acceptance:
- Scores can be submitted
- Leaderboard loads
- App still works if Supabase env is missing, with graceful fallback

## Phase 5 — Polish and demo readiness
Goal:
Make it presentable.

Tasks:
- Responsive layout
- Better empty/loading/error states
- Better copy
- Visual polish
- README
- Demo script
- Deployment checklist

Acceptance:
- Public URL works
- GitHub pushed
- 1-minute demo can be recorded
