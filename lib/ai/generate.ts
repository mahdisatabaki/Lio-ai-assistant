import "server-only";

import { generateText } from "ai";

import { chatModel } from "@/lib/server/ai";

import { buildPrompt, type PromptInput } from "./prompts";

/**
 * One grounded generation per request (`docs/TECH.md` 19).
 *
 * No tools, no agent loop, no streaming, no model router — a single
 * `generateText` call. The typical General Q&A turn stays at one embedding,
 * one retrieval, one generation.
 */

export type GenerationKind = "general" | "troubleshooting";

export async function generateGroundedAnswer(
  systemPrompt: string,
  input: PromptInput,
): Promise<string> {
  const { text } = await generateText({
    model: chatModel(),
    system: systemPrompt,
    prompt: buildPrompt(input),
    // Low but not zero: wording should stay natural, facts come from context.
    temperature: 0.3,
  });

  const answer = text.trim();
  if (answer.length === 0) {
    throw new Error("Model returned an empty answer.");
  }

  return answer;
}
