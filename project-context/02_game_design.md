# BLACKOUT GRID — Game Design Spec

## Core loop
1. Start mission.
2. Read short mission briefing.
3. Reveal safe nodes.
4. Use numbers to infer corrupted nodes.
5. Quarantine suspected corrupted nodes.
6. Use AI tools carefully.
7. Preserve stability.
8. Win by restoring grid or lose by triggering blackout.
9. Submit score.

## Board
- Size: 10x10
- Corrupted nodes: 15
- Cell states:
  - hidden
  - revealed
  - flagged/quarantined
  - corrupted revealed
  - shield-contained corruption

## Reveal rules
- Clicking hidden safe cell reveals it.
- If adjacent corruption count is 0, recursively reveal neighbors.
- Clicking a corrupted node:
  - if shield is active: shield absorbs, cell becomes contained corruption, stability drops
  - if shield is inactive: game over

## Flag rules
- Player can flag hidden cells.
- Flagging reduces flags remaining.
- Unflagging restores one flag.
- At game end, correct/incorrect flags are counted.
- Optional simple penalty: wrong flag reduces stability when detected, or only counted at end. For MVP, count at end to avoid overcomplication.

## Win condition
All non-corrupted cells are revealed.

## Lose conditions
- Corrupted cell clicked without shield
- Stability <= 0

## Stability
Starts at 100.

Recommended impacts:
- AI Counsel: -8
- Scan Node: -5
- Shield absorption: -25
- Every 30 seconds: -3
- Optional wrong flag penalty: -10 if implemented

If stability reaches 0, the city falls into blackout.

## AI tools

### AI Counsel
- Cost: -8 stability
- Uses current visible board summary
- Returns short tactical advice
- Fallback message if OpenAI fails

### Scan Node
- Cost: -5 stability
- Player activates scan mode, then clicks a hidden cell
- Risk result:
  - LOW
  - MEDIUM
  - HIGH
  - CRITICAL
- Scan can be deterministic from actual board state.
- It may be presented as AI-assisted analysis even if calculated locally.

### Shield Pulse
- One-time tool
- No OpenAI needed
- Activates protection from one corrupted click
- On absorption:
  - shield disabled
  - stability -25
  - cell marked as contained corruption
  - mission continues

## Score
Readable formula:
- +20 per safe node revealed
- +50 per correct flag
- +10 per remaining stability
- -3 per second elapsed
- -100 per AI tool used
- -150 per wrong flag
- Minimum score: 0

## Rank labels
- 2500+: Grid Commander
- 1800+: Senior Operator
- 1000+: Field Analyst
- Below 1000: Trainee Operator
