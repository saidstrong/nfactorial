# BLACKOUT GRID — Acceptance Criteria

## Gameplay
- Player can start and restart a mission.
- Board is 10x10.
- There are 15 corrupted nodes.
- Player can reveal hidden cells.
- Player can flag/quarantine cells.
- Empty safe regions auto-reveal.
- Numbers correctly show adjacent corrupted nodes.
- Player loses when corrupted node is clicked without shield.
- Player wins when all safe nodes are revealed.
- Stability reaching 0 triggers loss.

## Mission systems
- Timer starts when mission starts.
- Stability starts at 100.
- AI tools reduce stability.
- Shield Pulse protects from one corrupted click.
- Score is calculated and visible.
- Rank label is displayed at mission end.

## AI
- Mission briefing appears.
- AI Counsel gives short tactical advice.
- End-game debrief appears.
- App has fallbacks if OpenAI API fails or key is missing.
- OpenAI key is never exposed to client code.

## Leaderboard
- Player can submit score after game ends.
- Leaderboard displays submitted entries.
- Entries are ordered by score descending.
- Public insert/select are controlled by RLS.
- App degrades gracefully if Supabase is not configured.

## UX
- Landing page explains game quickly.
- Rules are understandable without external explanation.
- Game is playable on desktop.
- Mobile has a flag mode or equivalent.
- Buttons have disabled/loading states where needed.
- End screen is clear.

## Deployment
- App deployed to Vercel.
- Public link works from another browser/device.
- Code pushed to GitHub before deadline.
- README includes setup, env vars, and project explanation.
