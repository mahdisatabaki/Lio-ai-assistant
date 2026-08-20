/**
 * Health check (`docs/TECH.md` 27.4).
 *
 * Reports process liveness always, and database reachability when a database is
 * actually configured. It makes no AI call — health must stay free to poll.
 *
 * A missing `DATABASE_URL` is reported as "not configured" rather than an error,
 * because that is the normal state of a local foundation environment and
 * crashing here would take the whole app down over a dev-machine detail.
 */

type DbStatus = "ok" | "unconfigured" | "unreachable";

async function databaseStatus(): Promise<DbStatus> {
  // Imported lazily so a build with no database configured never constructs a
  // pool, and so the secret stays read behind the server-only boundary.
  const { isDatabaseConfigured, pingDatabase } = await import("@/lib/server/db");

  if (!isDatabaseConfigured()) return "unconfigured";

  try {
    await pingDatabase();
    return "ok";
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "health_db_unreachable",
        error_type: error instanceof Error ? error.name : typeof error,
      }),
    );
    return "unreachable";
  }
}

export async function GET(): Promise<Response> {
  const database = await databaseStatus();

  // Degraded only when a configured database cannot be reached. The process is
  // serving requests either way, which is what a liveness probe asks.
  const status = database === "unreachable" ? "degraded" : "ok";

  return Response.json({ status, database }, { status: 200 });
}
