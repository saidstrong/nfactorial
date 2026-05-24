import { NextResponse } from "next/server";
import { AI_DEBRIEF_FALLBACK } from "@/lib/ai/fallbacks";
import { createAiJsonResponse } from "@/lib/ai/openaiResponses";
import { AI_PROMPTS, AI_SCHEMAS } from "@/lib/ai/prompts";
import { validateDebriefOutput } from "@/lib/ai/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const input = await request.json();
    const output = await createAiJsonResponse({
      input,
      prompt: AI_PROMPTS.debrief,
      schema: AI_SCHEMAS.debrief,
    });

    if (!output) {
      return NextResponse.json(AI_DEBRIEF_FALLBACK);
    }

    return NextResponse.json(validateDebriefOutput(output));
  } catch {
    return NextResponse.json(AI_DEBRIEF_FALLBACK);
  }
}
