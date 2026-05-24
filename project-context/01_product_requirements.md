# BLACKOUT GRID — Product Requirements

## Must-have features

### Landing
- Hero title: BLACKOUT GRID
- Subtitle explaining the crisis
- Primary CTA: Start Mission
- Secondary CTA: How It Works
- Optional CTA/link: Leaderboard
- Three short feature cards:
  - AI Tactical Counsel
  - Stability-Based Crisis System
  - Corrupted Grid Logic

### Game
- 10x10 grid
- 15 corrupted nodes
- Reveal cell on click
- Flag/quarantine cell
- Auto-reveal empty connected areas
- Show nearby corruption count
- Win when all safe cells are revealed
- Lose when:
  - player clicks corrupted node without shield
  - stability reaches 0
- Timer
- Stability meter
- Flags remaining
- Score
- Restart mission

### AI
Use OpenAI API server-side only. Never expose API key to client.

AI features:
1. Mission briefing before/at mission start
2. Tactical counsel during game
3. Post-game debrief

All AI calls must have local fallback strings so the app remains playable if OpenAI fails.

### Supabase
Use only for leaderboard:
- Submit score
- Display top scores

No auth. No user accounts. No profiles.

### Demo readiness
The game must be explainable in under 60 seconds:
1. It is Minesweeper reimagined as a city power-grid crisis.
2. Hidden corrupted nodes must be quarantined.
3. Stability drops when you use AI or make mistakes.
4. AI gives mission briefings, tactical counsel, and final debrief.
5. Scores go to the leaderboard.

## Non-goals
Do not build:
- Auth
- Multiplayer
- Admin panel
- Complex difficulty system
- Payment
- Complex animations before core gameplay
- Real-time database subscriptions
- Custom user profiles
