# BLACKOUT RAID — Multiplayer Plan

## Important

Multiplayer is desirable but risky. Build it only after the local single-player AI boss raid is complete and stable.

## Target

2-player online co-op with room code.

## User flow

1. Player enters nickname.
2. Player creates room.
3. App generates room code.
4. Friend joins with code.
5. Lobby shows players.
6. Host starts raid.
7. Both players fight in same arena.
8. Host simulates game.
9. Guest sends input.
10. Host broadcasts game state.
11. End screen shows team result and MVP stats.

## Architecture

Host-authoritative:
- host runs game simulation
- guest does not simulate enemies independently
- guest sends inputs
- host broadcasts state snapshots

## Supabase Realtime events

Channel:
```txt
raid-room-{roomCode}
```

Broadcast events:

### guest -> host
```json
{
  "type": "player-input",
  "playerId": "...",
  "input": {
    "up": true,
    "down": false,
    "left": false,
    "right": true,
    "aimX": 420,
    "aimY": 220,
    "shooting": true,
    "dash": false
  }
}
```

### host -> all
```json
{
  "type": "state-snapshot",
  "state": {
    "players": [],
    "enemies": [],
    "bullets": [],
    "boss": {},
    "wave": 2,
    "status": "active"
  }
}
```

### host -> all
```json
{
  "type": "raid-end",
  "summary": {}
}
```

## Simplifications

- Send state snapshots at 10–15 Hz.
- Interpolate player/enemy positions if possible, but not required for MVP.
- No anti-cheat.
- No reconnection system.
- No matchmaking.
- No chat.

## Fallback

If multiplayer is unstable:
- keep single-player as main submission
- keep lobby as experimental or hidden
- do not let broken multiplayer damage final demo

## Acceptance for multiplayer

Only count multiplayer as complete if:
- two browser windows can join same room
- host can start raid
- guest movement appears in host/guest views
- both can shoot or at least guest input affects host simulation
- raid can end without crashing
