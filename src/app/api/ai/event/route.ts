import { NextResponse } from "next/server";
import { AI_EVENT_FALLBACK } from "@/lib/ai/fallbacks";
import { createAiJsonResponse } from "@/lib/ai/openaiResponses";
import { AI_PROMPTS, AI_SCHEMAS } from "@/lib/ai/prompts";
import { validateAiEventOutput } from "@/lib/ai/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const input = await request.json();
    const output = await createAiJsonResponse({
      input,
      prompt: AI_PROMPTS.event,
      schema: AI_SCHEMAS.event,
    });

    if (!output) {
      return NextResponse.json(AI_EVENT_FALLBACK);
    }

    return NextResponse.json(validateAiEventOutput(output));
  } catch {
    return NextResponse.json(AI_EVENT_FALLBACK);
  }
}
