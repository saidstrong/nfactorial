# BLACKOUT RAID — Acceptance Criteria

## Core game
- /play loads without crashing.
- Player can move with WASD.
- Player can aim/shoot with mouse.
- Player can dash with Space.
- Enemies spawn and move.
- Player bullets damage enemies.
- Enemies damage player.
- Player can die.
- Player can restart.
- Score and kills update.

## Waves/upgrades
- At least 3 waves exist.
- Waves clear when enemies are defeated.
- Upgrade selection appears between waves.
- Selected upgrade changes gameplay stats.
- Wave 3 can include an AI/fallback event modifier.

## Boss
- Final boss appears after waves.
- Boss has visible HP bar.
- Boss has 3 phases.
- Boss uses at least 4 attack patterns total.
- Boss mode changes at phase thresholds.
- Player can win by defeating boss.
- Player can lose by HP reaching 0.
- Boss is hard but attacks are readable.

## AI Director
- Mission briefing appears.
- Room event text appears.
- Boss phase warning appears.
- Final debrief appears.
- Game works if OPENAI_API_KEY is missing.
- AI-selected boss mode/modifier is validated.
- No OpenAI API key appears in client bundle.

## UI/UX
- Landing page clearly explains game.
- HUD shows HP, score, kills, wave, dash cooldown.
- End screen shows victory/wipeout, score, kills, damage taken, upgrades, and debrief.
- Visual style is cohesive and cyber-themed.
- Game is understandable in under 60 seconds.

## Deployment
- npm run lint passes.
- npm run build passes.
- App deploys to Vercel.
- Public link works in another browser/device.
- GitHub has latest code before deadline.
- Demo video is under 1 minute.
