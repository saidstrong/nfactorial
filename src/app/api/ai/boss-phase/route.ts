import { NextResponse } from "next/server";
import { AI_BOSS_PHASE_FALLBACK } from "@/lib/ai/fallbacks";
import { createAiJsonResponse } from "@/lib/ai/openaiResponses";
import { AI_PROMPTS, AI_SCHEMAS } from "@/lib/ai/prompts";
import { validateBossPhaseOutput } from "@/lib/ai/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const input = await request.json();
    const output = await createAiJsonResponse({
      input,
      prompt: AI_PROMPTS.bossPhase,
      schema: AI_SCHEMAS.bossPhase,
    });

    if (!output) {
      return NextResponse.json(AI_BOSS_PHASE_FALLBACK);
    }

    return NextResponse.json(validateBossPhaseOutput(output));
  } catch {
    return NextResponse.json(AI_BOSS_PHASE_FALLBACK);
  }
}
