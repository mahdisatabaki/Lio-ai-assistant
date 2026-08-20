import "server-only";

import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

import { requireServerEnv } from "./env";

/**
 * Liara AI access through the AI SDK's OpenAI-compatible provider
 * (`docs/TECH.md` 2.2).
 *
 * Liara exposes an OpenAI-compatible surface, so no Liara-specific client is
 * needed. Model IDs stay in configuration and are read here only — nothing
 * downstream should name a model.
 *
 * No routing, no fallback chain, no tools, no agent loop.
 */

function liaraProvider() {
  const env = requireServerEnv();

  return createOpenAICompatible({
    name: "liara",
    baseURL: env.liaraAiBaseUrl,
    apiKey: env.liaraAiApiKey,
  });
}

export function chatModel() {
  return liaraProvider().chatModel(requireServerEnv().liaraChatModel);
}

export function embeddingModel() {
  return liaraProvider().textEmbeddingModel(requireServerEnv().liaraEmbeddingModel);
}
