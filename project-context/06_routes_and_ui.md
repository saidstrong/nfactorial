# BLACKOUT RAID — Routes and UI Spec

## Routes

### /
Landing page.

Must include:
- BLACKOUT RAID title
- one-line explanation
- Start Raid CTA
- How it Works section
- AI Director explanation
- optional Join Room form later

### /play
Single-player raid.

Must include:
- Phaser game canvas
- HUD
- mission briefing panel
- upgrade selection overlay
- boss phase warning overlay
- end raid panel

### /leaderboard
Optional shell initially.
Can say leaderboard coming soon if not implemented.

### /room/[code]
Optional multiplayer route.
Should be added only after local game is complete.

## Landing copy

Title:
BLACKOUT RAID

Subtitle:
Survive the AI-directed dungeon.

Description:
Enter a corrupted digital arena, clear hostile bots, collect upgrades, and fight the Blackout Core — a hard final boss whose phases are selected by an AI Director based on your performance.

Feature cards:
1. AI Mission Director
2. Roguelite Upgrade Choices
3. Adaptive Boss Fight
4. Optional Online Co-op

## HUD

Show:
- HP bar
- current wave
- score
- kills
- dash cooldown
- current upgrade/modifier
- boss HP bar during boss fight
- short mission log

## Upgrade overlay

After each wave:
- pause combat
- show 3 upgrade cards
- player selects one
- apply effect
- next wave begins

## AI event overlay

Before Wave 3:
- show event title
- show event text
- show modifier effect

Example:
"POWER SURGE — Hostile bots move 15% faster."

## Boss phase overlay

At 70% and 35% boss HP:
- show phase title
- show AI Director warning
- show selected boss mode

Example:
"ADAPTIVE OVERLOAD — The Core detected aggressive movement. Summoner mode activated."

## End screen

Show:
- Victory / Wipeout
- score
- kills
- damage taken
- rooms cleared
- upgrades selected
- boss modes faced
- AI final debrief
- Restart button

## Visual style

Use:
- dark background
- electric blue player/projectiles
- orange/red enemies and danger
- clean white/gray UI text
- neon borders
- subtle glow
- cyber grid background

Avoid:
- childish/cartoon UI
- cluttered dashboard
- unreadable tiny text
