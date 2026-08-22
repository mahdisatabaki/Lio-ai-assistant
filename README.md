# Lio — لیو، دستیار هوشمند لیارا

**A technical teammate for Liara beginners: it diagnoses your error and walks you
to a deployed app — without making you search the documentation.**

### ▶ Live demo — https://liara-ai-assistant.liara.run

> **Note:** the live deployment currently runs commit `2d9616e`. Commit `0b42ac7`
> (compact feature tiles and a bottom-anchored composer) is verified locally at
> 1280/768/375 but not yet deployed — Liara's daily deployment quota was exhausted
> by two builder-side timeouts. Everything else described below is live.

📄 [Challenge submission](docs/CHALLENGE_SUBMISSION.md) · 🎬 [Demo script](docs/DEMO_SCRIPT.md)

---

## Why it is different

Most doc assistants hand you a link. Lio reads the page and hands you the
answer.

Retrieval searches broadly, then narrows to **one** document *before* the model
sees anything — so the reply commits to one diagnosis, one next action, and one
source instead of hedging across pages. When the documentation cannot support an
answer, Lio says so rather than inventing a config key.

| | |
|---|---|
| Live evals | **18/18 pass** against production |
| Retrieval | **Source@5 = 5/5**, each expected source ranked first |
| Knowledge | 1,143 official doc files → 5,441 indexed chunks |
| Tests | 398 |
| Guided deployment cost | **0** model calls per step |

---

## The two features

**عیب‌یابی با لیو** — paste an error, log, or build output. Lio preserves the
exact token (`ECONNRESET`, `liara.json`), finds the canonical Liara page, and
gives one diagnosis with one next action.

**دیپلوی با لیو** — a step-by-step path from project to deployed app. An error
mid-journey branches into troubleshooting *and returns to the same step*; a
stray remark never advances progress; nothing is declared done without the
user's confirmation.

**Grounded Q&A** — any other Liara question, from the main composer.

---

## Try it in 30 seconds

1. Open the [live demo](https://liara-ai-assistant.liara.run)
2. Click **عیب‌یابی با لیو** and paste: `Error: read ECONNRESET`
3. Click **دیپلوی با لیو**, answer a couple of steps, then paste that same error —
   watch the deployment step survive

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

```text
https://liara-ai-assistant.liara.run
```

Running on Liara PaaS under the team **لیارا**, backed by Liara PostgreSQL with
pgvector and Liara AI. `/api/health` reports
`{"status":"ok","database":"ok"}`. Deployment is pinned to the team in
`liara.json`, so a stray `liara deploy` cannot land in a personal account.

The knowledge index holds **5,441 chunks from 1,143 official documentation
files**. Re-running the indexer re-embeds nothing unless the documentation
changed.

| | |
|---|---|
| Chat model | `openai/gpt-4o-mini` |
| Embedding model | `openai/text-embedding-3-small` (1536 dimensions) |
| Live evals | 18/18 pass |
| Retrieval | Expected Source @5 = 5/5, each ranked first |
| Answer shape | one document, one diagnosis, one action, one source |
| Tests | 398 |

Lio's personality is a behavior contract in the system prompt, not a label:
`docs/LIO_CHARACTER_GUIDE.md` and its companions are the source of truth, and
`lib/conversation/persona.test.ts` guards it.

## Demo

See [docs/DEMO.md](docs/DEMO.md) for a short reproducible walkthrough.
