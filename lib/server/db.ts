import "server-only";

import { Pool } from "pg";

import { requireServerEnv } from "./env";

/**
 * PostgreSQL pool for the documentation index (`docs/TECH.md` 21).
 *
 * One shared pool, created on first use. No ORM: the application runs a handful
 * of hand-written queries, and pgvector operators are easier to express in SQL
 * than through a query builder that does not model them.
 *
 * The pool is cached on `globalThis` so Next.js hot reloads in development do
 * not leak a new pool per compile.
 */

const POOL_KEY = Symbol.for("liara.assistant.pgPool");

type PoolHolder = { [POOL_KEY]?: Pool };

export function getPool(): Pool {
  const holder = globalThis as PoolHolder;
  const existing = holder[POOL_KEY];
  if (existing) return existing;

  const pool = new Pool({
    connectionString: requireServerEnv().databaseUrl,
    // Conservative for a single MVP instance; Liara DBaaS connection limits are
    // modest and nothing here is throughput-bound.
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

  // Never let a background client error take down the process.
  pool.on("error", (error) => {
    console.error(
      JSON.stringify({ event: "pg_pool_error", message: error.message }),
    );
  });

  holder[POOL_KEY] = pool;
  return pool;
}

/**
 * Whether a database is configured at all.
 *
 * Lives here so the secret is read only inside the server boundary; callers
 * learn configured-or-not without touching `process.env` themselves.
 */
export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

/** Cheap round trip for health checks. Throws if the database is unreachable. */
export async function pingDatabase(): Promise<void> {
  await getPool().query("SELECT 1");
}

export async function closePool(): Promise<void> {
  const holder = globalThis as PoolHolder;
  const pool = holder[POOL_KEY];
  if (!pool) return;
  delete holder[POOL_KEY];
  await pool.end();
}
