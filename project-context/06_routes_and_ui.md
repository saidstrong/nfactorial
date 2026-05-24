# BLACKOUT GRID — Routes and UI Spec

## Routes

### /
Landing page.
- Hero
- Start Mission CTA
- How It Works
- Feature cards
- Leaderboard preview or link

### /play
Main game.
- Game board
- Mission control panel
- AI tools
- Mission log
- End panel/modal

### /leaderboard
Leaderboard.
- Top scores
- Result
- Score
- Time
- Rank
- Stability
- AI tools used

## Landing page copy

Title:
BLACKOUT GRID

Subtitle:
Restore the city grid before the blackout spreads.

Description:
A rogue signal has corrupted hidden nodes inside the city power network. Reveal safe nodes, quarantine threats, and use AI counsel carefully — every decision costs stability.

CTA:
Start Mission

Secondary:
View Leaderboard

## How it works
1. Reveal nodes to restore the grid.
2. Numbers show nearby corrupted nodes.
3. Quarantine suspected threats.
4. Use AI tools carefully; they reduce stability.
5. Restore all safe nodes before the city blacks out.

## Game UI layout

Desktop:
```txt
[Board: 10x10] [Mission Control Panel]
```

Mobile:
```txt
[Mission Summary]
[Board]
[AI Tools / Log]
```

## Mission control contents
- Result/status
- Timer
- Stability meter
- Flags remaining
- Score
- AI tools:
  - AI Counsel
  - Scan Node
  - Shield Pulse
- Mission briefing
- Latest AI message / mission log

## Cell visual states
- Hidden: dark tile with subtle border
- Revealed safe: muted blue/gray
- Numbered: stronger text
- Flagged/quarantined: orange marker
- Corrupted: red/orange danger
- Shield-contained: blue/orange mixed state

## UX details
- Board must be obvious and clickable.
- Right click toggles flag on desktop.
- Add a visible "Flag Mode" toggle for mobile.
- Add visible "Scan Mode" state when scan is active.
- Disable AI tool buttons after game over.
- End screen must clearly show win/loss and score.
