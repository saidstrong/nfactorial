# BLACKOUT RAID — Build Phases

## Phase 0 — Reset/spec setup
Goal:
Switch project direction from BLACKOUT GRID to BLACKOUT RAID.

Tasks:
- Keep useful Next.js/Tailwind foundation if already created
- Replace landing/game concept
- Add Phaser dependency
- Create new routes/components as needed

Acceptance:
- app runs locally
- BLACKOUT RAID landing appears

## Phase 1 — Local arena prototype
Goal:
Playable single-player shooter.

Tasks:
- Phaser canvas in /play
- player movement
- mouse aim
- shooting
- enemies spawning
- enemy damage
- HP/death
- score/kills
- restart

Acceptance:
- player can move, shoot, kill enemies, take damage, die/restart

## Phase 2 — Waves and upgrades
Goal:
Roguelite loop.

Tasks:
- 3 waves
- wave clear detection
- upgrade selection overlay
- apply upgrade effects
- HUD polish

Acceptance:
- player clears waves and chooses upgrades between waves

## Phase 3 — Boss fight
Goal:
Hard final boss.

Tasks:
- Blackout Core boss
- HP bar
- phase thresholds
- attack patterns
- boss modes
- victory state

Acceptance:
- boss is difficult but beatable
- boss phases are visible
- win/loss works

## Phase 4 — AI Director
Goal:
Visible OpenAI usage.

Tasks:
- mission briefing route
- AI room event route
- AI boss phase route
- AI debrief route
- fallback text and validation
- UI integration

Acceptance:
- game works without API key
- with API key, AI text appears
- AI selects allowed boss modes/modifiers only

## Phase 5 — Polish
Goal:
Demo-ready game.

Tasks:
- landing copy
- HUD polish
- end screen
- README
- deployment readiness
- bug fixes

Acceptance:
- npm run lint passes
- npm run build passes
- public URL works
- 1-minute demo can be recorded

## Phase 6 — Optional multiplayer
Goal:
2-player room-code co-op.

Tasks:
- Supabase schema
- create/join room
- lobby
- Realtime broadcast/presence
- host-authoritative sync

Acceptance:
- only if stable
- otherwise cut from final demo
