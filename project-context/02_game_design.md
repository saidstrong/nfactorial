# BLACKOUT RAID — Game Design Spec

## Core loop

1. Player starts raid.
2. AI generates mission briefing.
3. Player fights Wave 1.
4. Player chooses upgrade.
5. Player fights Wave 2.
6. AI generates crisis event for Wave 3.
7. Player fights modified Wave 3.
8. Final boss appears.
9. Boss adapts at phase thresholds using AI Director.
10. Player wins or dies.
11. AI generates final debrief.

## Controls

Desktop-first:
- WASD: move
- Mouse: aim
- Left click: shoot
- Space: dash
- E: choose/interact if needed
- R: restart after end

## Player

Default class: Operator

Stats:
- max HP: 100
- move speed: 240
- dash distance/speed: short burst
- dash cooldown: 1.5 seconds
- bullet damage: 18
- fire rate: 300ms
- score: 0
- kills: 0
- damage dealt: 0
- damage taken: 0

## Weapon

Pulse Blaster:
- projectile-based
- medium speed
- medium damage
- visible electric/blue bullet
- no ammo limit

## Arena

One rectangular cyber arena.
- visible boundaries
- simple obstacles optional
- spawn enemies at edges
- keep layout readable

MVP should not use complex tilemaps unless Codex can implement quickly.

## Waves

### Wave 1
- 8 Crawlers
- low pressure
- teaches movement/shooting

### Wave 2
- 8 Crawlers
- 4 Shooter Drones
- introduces ranged threats

### Wave 3 — AI Event Wave
AI Director creates event text and selects/previews modifier.

Possible fixed modifiers:
- POWER_SURGE: enemies move 15% faster
- DRONE_SWARM: extra drones spawn
- EMERGENCY_CACHE: health pickups appear
- OVERCHARGED_WEAPONS: player bullet damage +20%
- SYSTEM_LAG: dash cooldown +25%
- LOW_VISIBILITY: darker arena overlay

## Boss: The Blackout Core

The boss has 3 phases.

### Phase 1: Detection
HP 100% to 70%
- aimed shots
- slow movement
- occasional crawler spawn

### Phase 2: Adaptation
HP 70% to 35%
- AI Director chooses boss mode based on player performance
- allowed modes:
  - hunter
  - sniper
  - summoner
  - bullet_hell
  - shield_core
  - berserker

### Phase 3: Overload
HP 35% to 0%
- faster attack cadence
- radial bursts
- more minion pressure
- warning message

## Boss modes

### hunter
- moves toward player aggressively
- uses dash/charge attack

### sniper
- keeps distance
- fires aimed projectile volleys

### summoner
- spawns crawlers/drones
- boss attacks slower but creates crowd pressure

### bullet_hell
- radial bursts and rotating shots
- lower movement speed

### shield_core
- temporary shield
- shield drops after minions are killed or after timeout

### berserker
- faster movement
- faster attack rate
- less downtime

## Hard but fair rules

Boss difficulty must come from:
- readable patterns
- visible wind-ups
- dodge windows
- phase messages
- escalating pressure

Do not make the boss randomly unavoidable.
