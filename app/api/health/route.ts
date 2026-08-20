/**
 * Liveness check for the application process.
 *
 * Deliberately narrow: it answers "is this process serving requests?" and
 * nothing else. It makes no AI call and touches no database, so it stays free
 * to call and safe to poll.
 *
 * `docs/TECH.md` section 27.4 also expects a database check here. That arrives
 * with the database itself in BL-071; adding it now would mean checking a
 * dependency the application does not yet have.
 *
 * Route Handlers are uncached by default in Next.js 16, so every request is
 * evaluated by the running process and no `dynamic` config is needed.
 */
export function GET() {
  return Response.json({ status: "ok" });
}
