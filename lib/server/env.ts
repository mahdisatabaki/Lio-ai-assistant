import "server-only";

/**
 * Server-only access to the secret environment contract from `docs/TECH.md`
 * section 34.
 *
 * Two protections apply here:
 *
 * 1. The `server-only` import makes importing this module from a Client
 *    Component a build error, so these values cannot reach the client bundle.
 * 2. None of these names carry a `NEXT_PUBLIC_` prefix, so Next.js will not
 *    inline them into client JavaScript even if one is read elsewhere.
 *
 * Validation is lazy — it runs when configuration is first read, not when this
 * module is imported. A production build must succeed on a machine that holds
 * no secrets, so requiring them at import time would break `next build`.
 */

const REQUIRED_VARS = [
  "DATABASE_URL",
  "LIARA_AI_API_KEY",
  "LIARA_AI_BASE_URL",
  "LIARA_CHAT_MODEL",
  "LIARA_EMBEDDING_MODEL",
] as const;

type RequiredVar = (typeof REQUIRED_VARS)[number];

export type ServerEnv = {
  databaseUrl: string;
  liaraAiApiKey: string;
  liaraAiBaseUrl: string;
  liaraChatModel: string;
  liaraEmbeddingModel: string;
};

/** Names of the variables that are missing or blank, in declaration order. */
export function missingServerEnvVars(): RequiredVar[] {
  return REQUIRED_VARS.filter((name) => !process.env[name]?.trim());
}

/**
 * Reads the required server configuration, or throws naming everything that is
 * missing.
 *
 * The error reports variable *names* only. Values are never included, so this
 * is safe to let reach a log.
 */
export function requireServerEnv(): ServerEnv {
  const missing = missingServerEnvVars();

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable${missing.length > 1 ? "s" : ""}: ` +
        `${missing.join(", ")}. ` +
        "Copy .env.example to .env.local and provide values. " +
        "See docs/TECH.md section 34.",
    );
  }

  return {
    databaseUrl: process.env.DATABASE_URL as string,
    liaraAiApiKey: process.env.LIARA_AI_API_KEY as string,
    liaraAiBaseUrl: process.env.LIARA_AI_BASE_URL as string,
    liaraChatModel: process.env.LIARA_CHAT_MODEL as string,
    liaraEmbeddingModel: process.env.LIARA_EMBEDDING_MODEL as string,
  };
}
