import OpenAI from "openai";
import type { ResponseFormatTextConfig } from "openai/resources/responses/responses";
import { AI_DIRECTOR_SYSTEM_PROMPT } from "./prompts";
import { parseJsonOutput } from "./validation";

let openaiClient: OpenAI | null = null;

type JsonResponseRequest = {
  prompt: string;
  input: unknown;
  schema: ResponseFormatTextConfig;
  maxOutputTokens?: number;
};

export async function createAiJsonResponse({
  prompt,
  input,
  schema,
  maxOutputTokens = 260,
}: JsonResponseRequest): Promise<unknown | null> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return null;
  }

  openaiClient ??= new OpenAI({ apiKey });

  const response = await openaiClient.responses.create(
    {
      input: JSON.stringify(input),
      instructions: `${AI_DIRECTOR_SYSTEM_PROMPT}\n\n${prompt}`,
      max_output_tokens: maxOutputTokens,
      model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
      store: false,
      text: {
        format: schema,
        verbosity: "low",
      },
    },
    {
      maxRetries: 0,
      timeout: 1800,
    },
  );

  return parseJsonOutput(response.output_text);
}
