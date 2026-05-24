# BLACKOUT GRID — AI Features Spec

## Principle
AI must improve the product story without making gameplay fragile.

OpenAI is used for text intelligence only:
- mission briefing
- tactical counsel
- end-game debrief

Game rules, scoring, win/lose conditions, and scan results must remain deterministic.

## API routes

### POST /api/ai/briefing
Input:
- difficulty
- boardSize
- corruptionCount

Output:
```json
{
  "briefing": "short mission briefing text"
}
```

Fallback:
"District power flow is unstable. Hidden corrupted nodes have appeared across the grid. Reveal safe nodes, quarantine threats, and preserve city stability."

### POST /api/ai/counsel
Input:
- visible board summary
- flags remaining
- stability
- elapsed seconds
- revealed count
- recent events

Output:
```json
{
  "advice": "short tactical advice"
}
```

Rules:
- 1 to 3 sentences.
- Do not reveal the exact full solution.
- Give useful tactical direction.
- Keep tone like a command-center AI.

Fallback:
"Analyze numbered clusters first. If a revealed number already touches enough quarantined nodes, nearby hidden cells may be safe."

### POST /api/ai/debrief
Input:
- result
- score
- timeSeconds
- stability
- aiToolsUsed
- safeRevealed
- correctFlags
- wrongFlags

Output:
```json
{
  "debrief": "short final report"
}
```

Fallback:
"Mission complete. Review your flag discipline, AI usage, and stability preservation to improve your next run."

## OpenAI implementation guidance
- Use server-side route handlers.
- Read API key from OPENAI_API_KEY.
- If key missing, return fallback without throwing.
- Keep temperature moderate: 0.7 for briefing/debrief, 0.3-0.5 for counsel.
- Keep max output short.
- Validate output with simple fallback guard.

## Prompt tone
The AI should sound like:
- tactical
- concise
- serious
- mission-control oriented

Avoid:
- jokes
- long paragraphs
- over-explanation
- exact hidden-cell solution
