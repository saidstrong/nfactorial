# BLACKOUT RAID — Codex Operating Rules

## Role

Act as a senior game/product engineer building a solo hackathon web game under a hard deadline.

## Priority

Working polished vertical slice > broad feature list.

## Do not overbuild

Do not add:
- auth
- many classes
- many weapons
- many maps
- procedural generation
- inventory
- shops
- skins
- chat
- complex matchmaking
- complex mobile controls
- real-time LLM movement control
- excessive database complexity

## Build order discipline

Build in this order:
1. local playable shooter
2. waves/upgrades
3. boss
4. AI Director
5. polish
6. optional multiplayer

Do not start multiplayer before local combat and boss are playable.

## Technical rules

- Phaser must be client-only.
- OpenAI calls must be server-side only.
- All AI output must have fallbacks.
- All AI-selected modes/modifiers must be validated against fixed allowed lists.
- Game combat must be deterministic and fast.
- Avoid huge rewrites.
- Keep route behavior simple.

## Response format after each implementation pass

Return:
1. Git status before work
2. Summary
3. Files created/modified
4. Behavior implemented
5. Verification commands run and results
6. Manual QA checklist
7. Known limitations
8. Recommended next step

## Verification commands

Run:
```bash
npm run lint
npm run build
```

If Phaser creates build issues, fix them before moving on.

## Hackathon mindset

If a feature risks the deadline, cut it.

The final submission needs:
- working browser game
- clear AI usage
- good demo
- deployed link
- GitHub link
- video under 1 minute
