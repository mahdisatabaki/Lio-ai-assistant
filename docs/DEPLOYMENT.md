# Deployment Runbook

Production for the Liara AI Assistant. Three Liara resources, nothing else:

1. one **Next.js PaaS application**
2. one **PostgreSQL DBaaS** instance with `pgvector`
3. one **Liara AI** workspace / API key

No Redis, no external vector database, no separate backend, no queue.

---

## 1. Environment variables

All are server-only. None carries a `NEXT_PUBLIC_` prefix, and none may be
committed. `lib/server/env.ts` is the only module that reads them.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `LIARA_AI_API_KEY` | Liara AI key |
| `LIARA_AI_BASE_URL` | Liara AI OpenAI-compatible base URL |
| `LIARA_CHAT_MODEL` | Chat model id |
| `LIARA_EMBEDDING_MODEL` | Embedding model id |

Optional:

| Variable | Purpose |
|---|---|
| `LIARA_EMBEDDING_DIMENSIONS` | Skips the probe when the width is already known |

Non-secret tuning values (message limits, rate limit, chunk counts) are plain
constants in `lib/config.ts`, not environment variables — Next.js inlines only
`NEXT_PUBLIC_` names into client JavaScript, so a limit read from `process.env`
would silently fall back to its default in the browser.

Missing configuration fails loudly and names every missing variable at once,
without printing any value.

---

## 2. Production sequence

Run in this order. Steps 4–7 need database and AI access from wherever you run
them; steps 8–11 are the deployment itself.

### 1. Prepare PostgreSQL

Create a PostgreSQL DBaaS instance in the Liara console, then take its
connection string.

### 2. Verify pgvector

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

The migration runs this itself, but confirming first turns a confusing migration
failure into an obvious one.

### 3. Configure the application environment

Set the five variables above — locally in `.env.local` for indexing, and in the
Liara application's environment for runtime.

### 4. Run the migration

```bash
npm run db:migrate
```

This resolves the embedding width from the configured model (one probe
embedding) and substitutes it into the `vector(...)` column, because pgvector
fixes a column's dimension at creation time. Set
`LIARA_EMBEDDING_DIMENSIONS` to skip the probe. The migration is idempotent.

### 5. Build the documentation index

```bash
npm run docs:index
```

Shallow-clones `liara-cloud/docs`, chunks `public/llms/**/*.md` by heading, and
embeds only new or changed chunks. Safe to re-run — unchanged text is never
re-embedded.

Use `npm run docs:index -- --dry-run` to parse and chunk without touching the
database or spending any embedding call.

### 6. Verify the index

```sql
SELECT count(*) FROM doc_chunks;
SELECT count(DISTINCT source_path) FROM doc_chunks;
```

A healthy index is in the thousands of chunks across ~1,100 source files. Zero
means the index was never built; the assistant will report that rather than
answering ungrounded.

### 7. Sample retrieval

Confirm both arms work:

```sql
-- exact-token arm
SELECT source_url, heading FROM doc_chunks
 WHERE lower(content) LIKE '%econnreset%' LIMIT 3;

-- semantic arm requires an embedding; easiest through the running app
```

### 8. Deploy the application

```bash
liara deploy --app=<app-id> --platform=next
```

`liara.json` already sets `platform: "next"`, and `.liaraignore` keeps
`node_modules`, build output, and local env files out of the upload. Liara runs
`npm install` and the `build` script, then `start`.

**The npm mirror is disabled in `liara.json`.** The first real deployment failed
during `npm ci` on Liara's builder with `npm error Exit handler never called!`
while installing through the Liara mirror. Adding the documented opt-out fixed it
and the next deploy succeeded unchanged:

```json
{ "next": { "mirror": false } }
```

This is the same failure mode the assistant's own T-02 eval covers, and the same
documented fix it recommends.

### 9. Verify the root page

```bash
curl -sI https://<app-id>.liara.run/ | head -1
```

### 10. Verify health

```bash
curl -s https://<app-id>.liara.run/api/health
```

Expected: `{"status":"ok","database":"ok"}`. A `"degraded"` status with
`"database":"unreachable"` means the app is serving but cannot reach PostgreSQL.
`"unconfigured"` means `DATABASE_URL` is not set in the application environment.

### 11. Smoke and EVAL checks

Send one grounded question, one error paste, and one deployment request through
`/api/chat`, and confirm sources are attached and no Liara command was invented.
`docs/EVALS.md` is the acceptance contract.

---

## 3. PostgreSQL access during indexing

The indexer runs from wherever you invoke it and needs to reach the database
directly. Prefer, in order:

1. **Run the indexer from inside Liara's network** if a suitable path exists —
   nothing is exposed.
2. **Temporarily enable public access** on the DBaaS instance, run the index,
   then **disable it again**. Keep the window as short as the run.

Do not leave public access on after indexing, and do not widen access rules
permanently for a step that runs occasionally.

---

## 4. Operational notes

- **Logs**: structured JSON to stdout, visible in Liara's application logs. They
  carry request id, intent, journey step, latency, sizes, and status — never user
  message content, retrieved text, embeddings, or secrets.
- **Rate limiting**: in-memory, per-IP, 20 requests/minute. Resets on restart and
  is not shared across instances. Adequate for one instance; revisit before
  scaling horizontally.
- **Re-indexing**: run `npm run docs:index` again when Liara's documentation
  changes. There is no scheduled sync.
- **Model changes**: change `LIARA_CHAT_MODEL` or `LIARA_EMBEDDING_MODEL` in the
  environment. Changing the *embedding* model changes the vector width, which
  requires a new migration and a full re-index.
