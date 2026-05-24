# BLACKOUT RAID — AI Director Spec

## Principle

OpenAI must not control real-time movement or frame-by-frame combat.

Bad:
- every frame asks OpenAI where the boss should move

Good:
- OpenAI selects mission text, event flavor, boss mode, phase warning, and final report
- game code executes real-time combat deterministically

## AI features

### 1. Mission briefing

Route:
POST /api/ai/mission

Input:
```json
{
  "playerName": "Operator",
  "mode": "solo",
  "difficulty": "hard"
}
```

Output:
```json
{
  "missionTitle": "Nightfall Relay",
  "briefing": "A rogue signal has entered the city's underground power grid...",
  "bossName": "The Blackout Core",
  "threatLine": "Destroy the core before the system collapses."
}
```

Fallback:
```json
{
  "missionTitle": "Nightfall Relay",
  "briefing": "A rogue signal has seized the city grid. Enter the corrupted system, clear hostile bots, and destroy the Blackout Core.",
  "bossName": "The Blackout Core",
  "threatLine": "The blackout spreads every second you hesitate."
}
```

### 2. AI room event

Route:
POST /api/ai/event

Input:
```json
{
  "wave": 3,
  "playerHp": 72,
  "kills": 18,
  "damageTaken": 34,
  "selectedUpgrades": ["Overclocked Barrel"]
}
```

Output:
```json
{
  "eventTitle": "Power Surge",
  "eventText": "Voltage instability accelerates hostile bots in the chamber.",
  "modifier": "POWER_SURGE"
}
```

Allowed modifiers:
- POWER_SURGE
- DRONE_SWARM
- EMERGENCY_CACHE
- OVERCHARGED_WEAPONS
- SYSTEM_LAG
- LOW_VISIBILITY

If AI returns anything else, use fallback modifier.

### 3. AI boss phase director

Route:
POST /api/ai/boss-phase

Input:
```json
{
  "bossHpPercent": 70,
  "playerHp": 84,
  "kills": 24,
  "damageDealt": 1800,
  "damageTaken": 42,
  "accuracyEstimate": 0.41,
  "fightDurationSeconds": 38,
  "currentMode": "detection"
}
```

Output:
```json
{
  "phaseTitle": "Adaptive Overload",
  "message": "The Core detected aggressive pressure and deployed defensive drones.",
  "bossMode": "summoner"
}
```

Allowed boss modes:
- hunter
- sniper
- summoner
- bullet_hell
- shield_core
- berserker

Validation:
- If bossMode is invalid, use deterministic fallback.
- Keep message short.
- Never trust AI output directly for arbitrary code/state.

### 4. Final debrief

Route:
POST /api/ai/debrief

Input:
```json
{
  "result": "victory",
  "score": 4200,
  "kills": 39,
  "damageTaken": 88,
  "roomsCleared": 4,
  "bossModeHistory": ["summoner", "bullet_hell"],
  "upgrades": ["Overclocked Barrel", "Reinforced Armor"]
}
```

Output:
```json
{
  "debrief": "Operator performance was aggressive and effective. Heavy damage was taken during the drone swarm, but sustained pressure broke the Blackout Core before overload stabilized."
}
```

Fallback:
"Raid complete. Review your movement, damage taken, and upgrade choices to improve your next run."

## Prompt style

AI should sound:
- tactical
- concise
- cyber-operations oriented
- serious

Avoid:
- jokes
- long lore dumps
- exact hidden implementation details
- random unvalidated mechanics

## Environment

Use:
```txt
OPENAI_API_KEY=
```

The game must still work when OPENAI_API_KEY is missing.
