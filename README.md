# دستیار لیارا — Liara AI Assistant

A Persian, RTL-first assistant that gets a beginner from *"something is broken"*
or *"I want my project online"* to the **next concrete result**.

It is not a documentation search box. Liara's docs are organised by service; a
stuck beginner arrives with an error message or a goal, not with the name of the
service that documents it. This product does the translation:

> user's situation → relevant context → the one thing to do next

Everything it says about Liara is grounded in Liara's own documentation, with the
source shown. When the docs do not support an answer, it says so instead of
guessing.

---

## What it does

**Troubleshooting** — paste an error, log, stack trace, build output, or config
snippet. It reads what you actually sent, grounds the diagnosis in Liara's docs,
and gives one concrete next action with a source.

**Build on Liara** — describe the project; it recommends the minimum Liara
services required and nothing more. A service only appears when you described a
need for it, and each non-obvious one carries a reason.

**Guided Next.js deployment** — a step-by-step path from a local project to a
running app, one action at a time. It never runs a command for you; it shows the
command and waits for your result.

**Grounded Q&A** — normal Liara questions, answered from retrieved documentation
with sources.

All four happen in one conversation. Asking a side question mid-deployment does
not lose your place, and an error mid-deployment moves into troubleshooting and
comes back to the step you were on.

---

## Architecture

```text
Browser (Persian, RTL)
   │
   ▼
Next.js App Router  ──  deterministic intent + journey state
   │                      (no agent loop, no model call)
   ├──▶ retrieval ──▶ Liara PostgreSQL + pgvector
   │                    semantic (cosine) + exact-token, fused by RRF
   └──▶ Liara AI ────  one grounded generation
```

One assistant, one endpoint, three Liara resources. Deliberately not here:
multi-agent orchestration, an agent framework, Redis, an external vector
database, a reranker, a model router, or authentication.

The parts that can be deterministic are: intent routing, journey transitions,
service planning, and every guided step's content. Those cost **zero** model
calls. The model is used only where judgement is genuinely needed — explaining a
grounded answer — and exactly once per request.

Sources are attached by the server from retrieval metadata. The model never
emits a URL, so a fabricated citation is impossible rather than discouraged.

Implementation detail: the Vercel AI SDK (`ai`, `@ai-sdk/react`) with its
OpenAI-compatible provider pointed at Liara AI.

---

## Local development

```bash
npm install
```

```bash
npm run dev
```

Open http://localhost:3000.

The UI and the deterministic journeys work without any Liara credentials.
Grounded answers need a database and an AI key — without them the assistant
reports that it cannot reach its sources rather than answering ungrounded.

---

## Environment

Copy `.env.example` to `.env.local` and fill it in. Names only; never commit
values.

```text
DATABASE_URL
LIARA_AI_API_KEY
LIARA_AI_BASE_URL
LIARA_CHAT_MODEL
LIARA_EMBEDDING_MODEL
```

All are server-only and read through a single `server-only` module, so a build
fails if client code ever imports them.

---

## Knowledge index

```bash
npm run db:migrate
```

```bash
npm run docs:index
```

The indexer shallow-clones the official `liara-cloud/docs` repository, chunks
`public/llms/**/*.md` by heading, and embeds only new or changed chunks. Add
`-- --dry-run` to parse and chunk without a database or any embedding cost.

---

## Testing

```bash
npm test
```

```bash
npm run lint
```

```bash
npm run build
```

---

## Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the production runbook.

---

## Live deployment

Running on Liara PaaS under the team **لیارا**:

```text
https://liara-ai-assistant.liara.run
```

Verified: the root page returns 200 and `/api/health` returns
`{"status":"ok","database":"ok"}`, reaching PostgreSQL over Liara's private
network. Deployment is pinned to the team in `liara.json` (`team-id` plus app
id), so a stray `liara deploy` cannot land in a personal account.

Grounded answers are not live yet: the Liara AI workspace API key is issued
through the console only, and until it is set the assistant reports that it
cannot reach its sources rather than answering ungrounded. The deterministic
halves — guided deployment, Build on Liara planning, and clarification on
ambiguous errors — are fully live and make no model call.

## Demo

See [docs/DEMO.md](docs/DEMO.md) for a short reproducible walkthrough.
