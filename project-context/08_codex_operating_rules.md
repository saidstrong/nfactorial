# BLACKOUT GRID — Codex Operating Rules

## General instruction
Act as a senior product engineer building a solo hackathon game under a hard deadline. Prefer narrow, safe, complete implementation over architectural ambition.

## Do not overbuild
Do not add:
- auth
- multiplayer
- admin dashboard
- unnecessary database tables
- complex animation framework
- external game engine
- payment
- advanced analytics
- user profiles
- complicated difficulty customization

## Preferred behavior
- Make the app work first.
- Keep changes small and testable.
- Preserve current architecture unless there is a clear reason.
- Use TypeScript types for game state.
- Keep game logic deterministic.
- Put OpenAI behind server API routes only.
- Add fallbacks for every AI and Supabase failure path.
- Prioritize deployability.

## Response format after each implementation pass
Codex should respond with:

1. Git status before work
2. Summary
3. Files changed
4. Behavior added
5. Verification commands run
6. Manual QA checklist
7. Known limitations / next recommended step

## Verification commands
Use available package manager. Prefer:
```bash
npm run lint
npm run build
```

If tests are added:
```bash
npm test
```

## Acceptance attitude
If a fancy feature threatens deadline stability, cut it.
Working game > clever architecture.
Polished UI > extra backend.
Clear demo > hidden complexity.
