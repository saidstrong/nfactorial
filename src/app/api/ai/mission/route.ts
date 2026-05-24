import { NextResponse } from "next/server";
import { AI_MISSION_FALLBACK } from "@/lib/ai/fallbacks";
import { createAiJsonResponse } from "@/lib/ai/openaiResponses";
import { AI_PROMPTS, AI_SCHEMAS } from "@/lib/ai/prompts";
import { validateMissionOutput } from "@/lib/ai/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const input = await request.json();
    const output = await createAiJsonResponse({
      input,
      prompt: AI_PROMPTS.mission,
      schema: AI_SCHEMAS.mission,
    });

    if (!output) {
      return NextResponse.json(AI_MISSION_FALLBACK);
    }

    return NextResponse.json(validateMissionOutput(output));
  } catch {
    return NextResponse.json(AI_MISSION_FALLBACK);
  }
}
