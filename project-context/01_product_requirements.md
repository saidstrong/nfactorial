# BLACKOUT RAID — Product Requirements

## Must-have MVP

### Pages
- Landing page
- Play page
- End screen
- Optional leaderboard page shell

### Landing page
- Title: BLACKOUT RAID
- Subtitle: Survive the AI-directed dungeon.
- CTA: Start Raid
- Secondary CTA: How It Works
- Explanation of AI Director

### Game
- Top-down arena shooter
- WASD movement
- Mouse aiming
- Left-click shooting
- Space dash
- Player HP
- Enemy HP
- Bullet collisions
- Score
- Kills
- Damage taken
- 3 enemy waves
- 1 final boss
- Victory and defeat states
- Restart

### Enemies
- Crawler: melee, chases player
- Shooter Drone: ranged, fires slow projectiles

### Boss
- The Blackout Core
- Large HP bar
- 3 phases
- At least 4 attack patterns:
  - aimed shot
  - radial burst
  - summon minions
  - dash strike or charge
- AI-directed phase/mode selection at phase changes
- Fallback deterministic phase selection if AI fails

### Upgrades
After each wave, show simple upgrade choices:
- Overclocked Barrel: fire rate +20%
- Reinforced Armor: max HP +25
- Emergency Dash: dash cooldown -20%
- Piercing Pulse: bullets pierce one enemy
- Stabilizer Core: heal 20 HP
- Critical Firmware: small chance for double damage

MVP can show 3 random choices from this fixed list.

### AI features
OpenAI is used server-side for:
1. Mission briefing
2. Room/event text
3. Boss phase Director
4. Final debrief

All AI features must have local fallbacks.

## Nice-to-have after MVP
- Supabase room-code lobby
- 2-player online co-op
- Supabase Realtime host-authoritative sync
- Leaderboard
- Sound effects
- Screen shake
- Health pickups
- Better particle effects

## Non-goals
Do not build:
- inventory
- many weapons
- many maps
- procedural dungeon generation
- skins
- account system
- payment
- chat
- complex mobile controls
- real-time LLM boss movement
- full MMO-style networking

## Hard rule
A complete single-player AI boss game is better than broken multiplayer.

Build order must preserve a playable game at every step.
