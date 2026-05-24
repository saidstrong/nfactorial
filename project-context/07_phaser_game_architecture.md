# BLACKOUT RAID — Phaser Game Architecture

## Goal

Build a responsive top-down arena shooter in Phaser 3 that can run inside a Next.js client component.

## Main objects

### Player
Properties:
- x, y
- hp, maxHp
- speed
- dashCooldown
- lastDashAt
- fireRateMs
- lastShotAt
- bulletDamage
- upgrades
- score
- kills
- damageDealt
- damageTaken

### Bullet
Properties:
- owner: player/enemy/boss
- velocity
- damage
- pierceRemaining
- lifetime

### Enemy
Types:
- crawler
- shooter

Common:
- hp
- speed
- damage
- scoreValue

### Boss
Properties:
- hp, maxHp
- phase
- mode
- attackCooldown
- shielded
- modeHistory

## Phaser systems

### update loop
- read input
- move player
- handle dash
- handle shooting
- update bullets
- update enemies
- update boss
- check collisions
- update HUD callback
- check wave/boss/end conditions

### collision logic
- player bullets vs enemies
- player bullets vs boss
- enemy bullets vs player
- enemy body vs player
- boss attacks vs player

## Scene lifecycle

Possible states:
- briefing
- wave
- upgrade
- event
- boss
- ended

## React communication

Phaser scene can call React callbacks:
- onHudUpdate(state)
- onUpgradeChoices(choices)
- onEventTriggered(event)
- onBossPhaseChange(phaseData)
- onRaidEnd(summary)

React can call Phaser methods through refs:
- startRaid()
- chooseUpgrade(id)
- restartRaid()

## Implementation shortcut

For hackathon speed, a single Phaser scene file is acceptable if clean enough.

Recommended files:
```txt
src/components/game/PhaserRaidGame.tsx
src/lib/game/types.ts
src/lib/game/constants.ts
src/lib/game/upgrades.ts
src/lib/game/bossModes.ts
src/lib/game/scoring.ts
```

## Performance

Avoid:
- too many projectiles
- complex pathfinding
- per-frame React state updates

Update React HUD at throttled intervals, e.g. 5–10 times per second, not every frame if it causes lag.

## Assets

MVP can use Phaser graphics primitives:
- circles
- rectangles
- simple glowing shapes

Do not block on custom art.
