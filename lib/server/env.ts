import "server-only";

/**
 * Server-only access to the environment contract from `docs/TECH.md` section 34.
 *
 * The `server-only` import above makes importing this module from a Client
 * Component a build error, so secrets cannot reach the client bundle.
 *
 * Values are read but not validated here. Required-configuration validation and
 * failure behavior belong to BL-003.
 */
export const serverEnv = {
  databaseUrl: process.env.DATABASE_URL,
  liaraAiApiKey: process.env.LIARA_AI_API_KEY,
  liaraAiBaseUrl: process.env.LIARA_AI_BASE_URL,
  liaraChatModel: process.env.LIARA_CHAT_MODEL,
  liaraEmbeddingModel: process.env.LIARA_EMBEDDING_MODEL,
} as const;
