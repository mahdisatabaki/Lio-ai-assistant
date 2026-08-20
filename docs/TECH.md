# Liara AI Assistant — Lean Technical Design

## Document Status

**Version:** TECH v1  
**Status:** Approved for MVP implementation planning  
**Product scope:** MVP v1.1  
**Principle:** Use the simplest architecture that satisfies the frozen PRD and EVALS.

This document defines the approved technical baseline for the MVP.

It must not be used as permission to add systems that are outside the product scope.

## Repository-aware optimization rule

The actual project directory may already contain partially adopted tooling or infrastructure. The implementation agent must inspect the repository before enforcing this baseline mechanically.

It may revise a technical choice when doing so clearly reduces implementation time or complexity while preserving the frozen MVP, PRD, and EVALS. Examples include completing an already useful shadcn/ui setup or deciding whether an existing partial Vercel AI SDK installation should be completed or removed.

Any material deviation from this technical baseline must be justified and documented in this file in the same implementation change.

Do not redesign the architecture for preference alone.

---

# 1. Architecture Summary

The MVP uses a deliberately small architecture:

```text
Browser
  │
  │ HTTPS
  ▼
Next.js Application on Liara PaaS
  │
  ├── Deterministic Journey / Intent Logic
  │
  ├── RAG Retrieval
  │       │
  │       ▼
  │   Liara PostgreSQL DBaaS + pgvector
  │
  └── Liara AI API
          ├── Chat model
          └── Embedding model
```

There are only three runtime infrastructure dependencies:

1. **Liara PaaS** — application
2. **Liara PostgreSQL DBaaS + pgvector** — documentation knowledge index
3. **Liara AI API** — chat completions and embeddings

No Redis, queue, external vector database, agent framework, separate backend service, or user-account database is required for MVP v1.1.

---

# 2. Approved Stack

## 2.1 Application

- **Next.js**
- **App Router**
- **TypeScript**
- **React**
- **Tailwind CSS v4 + shadcn/ui** (revised in BL-001 — see section 35)
- Native `fetch` and server Route Handlers where possible

Version rule:

> Use the current stable Next.js version available and compatible with Liara at the time the repository is scaffolded, then pin it in `package.json`.

Do not upgrade framework versions during the challenge without a concrete reason.

## 2.2 AI Client

Use the **Vercel AI SDK** as the application-level AI abstraction.

Dependencies:

- `ai`
- `@ai-sdk/react`
- `@ai-sdk/openai-compatible` — added when the Liara provider is wired up (BL-030)

Liara is reached through the AI SDK's OpenAI-compatible provider, pointed at
`LIARA_AI_BASE_URL`. This keeps the original reasoning intact — Liara exposes
OpenAI-compatible chat and embedding behavior, and no orchestration framework is
involved — while giving the conversation UI a client layer it would otherwise
need hand-written.

Reason for choosing it over the standalone `openai` client:

- `ai` and `@ai-sdk/react` are already installed and in use.
- `@ai-sdk/react` covers the conversation UI directly.
- It speaks OpenAI-compatible endpoints, so nothing about the Liara integration changes.
- Maintaining both this and a separate `openai` client would duplicate the same job.

The AI SDK is used as a client library, not as an agent framework. Its agent,
workflow, and multi-step tool-loop features stay out of the MVP.

Do not add:

- LangChain
- LlamaIndex
- multi-agent SDKs
- workflow engines
- AI tool orchestration frameworks

unless a later approved requirement proves they are necessary.

### Status

`ai`, `@ai-sdk/react`, and `@ai-sdk/openai-compatible` are installed.
`lib/server/ai.ts` builds the Liara provider from `LIARA_AI_BASE_URL` and
`LIARA_AI_API_KEY` and exposes `chatModel()` and `embeddingModel()`, both named
only from configuration.

Nothing calls a chat model yet — answer generation is BL-040. Embeddings are
called by the indexer and by query-time retrieval.

**Not yet verified against live Liara AI.** The development machine's VPN exit
IP is refused by Liara, so no request has reached the API. See BL-002.

## 2.3 Database

Use:

- **Liara PostgreSQL DBaaS**
- **pgvector extension**
- `pg` as the Node PostgreSQL client

The PostgreSQL database is used only for the documentation knowledge index in MVP v1.1.

Do not store user accounts or persistent conversation history.

## 2.4 Embeddings

Use Liara AI Embeddings API.

Initial embedding model:

- **`text-embedding-3-small`** as the cost-conscious default candidate

The exact model identifier must be verified against Liara's current model catalog before implementation is locked.

Keep it configurable through:

```text
LIARA_EMBEDDING_MODEL
```

Do not hardcode a provider-specific identifier throughout the codebase.

## 2.5 Chat Model

Use one Liara AI chat model for MVP.

Initial candidate:

- **GPT-5 Mini**, if it is available under the current Liara model catalog and passes the EVALS quality threshold.

The exact model ID remains environment-configurable:

```text
LIARA_CHAT_MODEL
```

Do not create model routing for MVP.

If the initial model fails quality/cost evaluation, compare one alternative and choose a single replacement.

---

# 3. Why This Stack

The chosen stack minimizes moving parts while matching Liara's own infrastructure.

Liara currently exposes:

- OpenAI-compatible chat completions,
- model listing,
- embeddings,
- AI request/workspace usage information,
- managed PostgreSQL,
- pgvector support.

Therefore, using an external vector database or separate AI platform is unnecessary for the challenge MVP.

The architecture also strengthens the final challenge story:

> The assistant for Liara is itself deployed using Liara PaaS, Liara DBaaS, and Liara AI.

---

# 4. Explicitly Rejected Technical Choices

These choices are intentionally rejected for MVP v1.1.

## 4.1 Separate frontend and backend services

Rejected.

Next.js Route Handlers are sufficient.

Revisit only if a concrete backend requirement cannot be supported cleanly inside the application.

## 4.2 Redis

Rejected.

There is no persistent session requirement and no measured cache requirement yet.

## 4.3 External vector database

Rejected.

PostgreSQL + pgvector is sufficient for the expected documentation corpus.

## 4.4 Agent framework

Rejected.

The product has one assistant and deterministic journey state.

## 4.5 Multi-agent architecture

Rejected.

It does not solve a current product requirement.

## 4.6 Persistent conversation storage

Rejected.

Cross-session memory is outside MVP.

## 4.7 Authentication

Rejected for MVP.

There is no user-specific privileged action.

## 4.8 Streaming responses

Not required for the first implementation.

Start with normal request/response.

Revisit only if measured UX shows waiting feels unacceptable.

## 4.9 Approximate-nearest-neighbor vector index

Not required initially.

The corpus is small enough to begin with exact pgvector similarity search.

Add HNSW/IVFFlat only if measured retrieval latency requires it.

## 4.10 Reranker model

Rejected initially.

Start with semantic + exact-token retrieval.

Add reranking only if EVALS demonstrates retrieval failures that cannot be fixed more simply.

---

# 5. Runtime Request Architecture

The main backend entry point is:

```text
POST /api/chat
```

Conceptual request:

```ts
type ChatRequest = {
  message: string;
  recentMessages: ConversationMessage[];
  state: ConversationState;
};
```

Conceptual response:

```ts
type ChatResponse = {
  message: string;
  state: ConversationState;
  sources?: SourceReference[];
  actions?: NextAction[];
  meta?: {
    intent: Intent;
    requestId: string;
  };
};
```

This schema is conceptual.

Implementation may refine field names but must preserve the behavior.

---

# 6. Stateless Conversation Architecture

MVP conversation state is **session-scoped**, not persistent.

## 6.1 Browser Responsibility

The browser keeps:

- visible conversation messages,
- active journey state returned by the server.

On every request it sends:

- current message,
- a bounded window of recent messages,
- structured journey state.

## 6.2 Server Responsibility

The server:

1. validates the incoming payload,
2. determines the current behavior,
3. performs deterministic state transitions,
4. runs retrieval/LLM calls only when needed,
5. returns the updated state.

## 6.3 No Conversation Database

Do not store conversation history in PostgreSQL for MVP.

A page refresh may reset the conversation.

This is acceptable because cross-session persistence is explicitly outside MVP scope.

## 6.4 Why Client-Carried State Is Acceptable

The state does not authorize privileged actions.

The product does not:

- provision infrastructure,
- access Liara user accounts,
- execute commands.

Therefore, client-carried state is a simple and acceptable MVP tradeoff.

The backend must still validate enums, lengths, and state shape.

---

# 7. Conversation State

Use a small explicit state object.

Example:

```ts
type Intent =
  | "troubleshooting"
  | "deployment"
  | "general"
  | "unknown";

type ConversationState = {
  intent: Intent;
  activeJourney: "nextjs-deploy" | null;
  framework: "nextjs" | null;
  deploymentMethod: "cli" | null;
  requiredServices: Array<
    "paas-nextjs" | "postgresql" | "object-storage"
  >;
  currentStep: string | null;
  completedSteps: string[];
  lastUserResult: string | null;
  activeError: string | null;
  attemptedFix: string | null;
};
```

Keep the state intentionally narrow.

Do not add fields for hypothetical future journeys.

---

# 8. Intent Routing

Intent routing should be **deterministic-first**.

## 8.1 Priority

If an active journey exists:

1. preserve the journey,
2. detect whether the new input is an error/side question/result,
3. route accordingly.

For a new conversation:

1. detect obvious log/error input,
2. detect obvious Next.js deployment intent,
3. otherwise route to general Q&A.

## 8.2 Error Detection

Use lightweight signals such as:

- multi-line technical output,
- known error-like tokens,
- stack-trace patterns,
- explicit Persian error language,
- deployment/build failure language.

Do not build a machine-learning classifier.

## 8.3 Ambiguous Inputs

If deterministic rules cannot distinguish between materially different actions:

- use one short clarification, or
- optionally use one small LLM classification call if the implementation proves it improves UX.

Do not run a classifier model on every request.

---

# 9. Deterministic Guided Journey

The Next.js guided journey is a state machine implemented with normal TypeScript logic.

Do not implement it as an autonomous agent loop.

## 9.1 Golden Journey Steps

Use the PRD step IDs:

```text
D01_CONFIRM_PROJECT
D02_CHECK_READINESS
D03_BUILD_PLAN
D04_ENSURE_CLI
D05_AUTHENTICATE
D06_CREATE_RESOURCES
D07_PREPARE_INPUTS
D08_DEPLOY
D09_TROUBLESHOOT_IF_NEEDED
D10_DONE
```

## 9.2 Normal Step Behavior

For a normal guided step:

- server determines the current step,
- returns one action,
- optionally returns a command,
- waits for user result,
- transitions only after user evidence/confirmation.

Do not automatically execute commands.

## 9.3 Standard Step Content

For the golden path, standard deployment instructions should be represented in a small typed configuration/module.

Example concept:

```ts
type JourneyStep = {
  id: string;
  titleFa: string;
  bodyFa: string;
  command?: string;
  sourceUrl?: string;
};
```

This avoids an LLM call for every predictable deployment step.

It also reduces hallucination and cost.

## 9.4 Side Questions

If the user asks a normal Liara question during a journey:

- answer using the RAG path,
- preserve current journey state,
- return to the current step afterward.

## 9.5 Error Branch

If user output indicates failure:

- preserve the current deployment step,
- switch response behavior to troubleshooting,
- after resolution continue the original step.

---

# 10. Build on Liara Planning

Build on Liara should be deterministic for the frozen supported scope.

Do not use a separate planning agent.

## 10.1 Minimum Inputs

For the first implementation, the plan only needs to know:

- framework: Next.js?
- database required?
- persistent user-uploaded files required?

Optional context may include environment variables/external APIs if directly relevant.

## 10.2 Service Mapping

Initial mapping:

```text
Next.js
  → Liara PaaS / Next.js

Needs PostgreSQL
  → Liara DBaaS / PostgreSQL

Needs persistent uploaded files
  → Liara Object Storage
```

Every recommendation must have a reason.

## 10.3 Golden Project

The guaranteed deployment golden project uses:

```text
Next.js PaaS only
```

No database or object storage is required for the main end-to-end deployment eval.

Build on Liara planning for PostgreSQL/Object Storage is tested as a planning scenario, not a full provisioning workflow.

---

# 11. Knowledge Source

Primary source:

```text
https://github.com/liara-cloud/docs
```

Preferred machine-readable corpus inside the official repository:

```text
public/llms/**/*.md
```

The indexer should use the official repository rather than scraping rendered HTML when possible.

Benefits:

- stable source paths,
- clean Markdown,
- headings/code preserved,
- source URLs can be derived,
- repository content can be versioned/hash-compared.

---

# 12. Documentation Ingestion

Use one reproducible Node/TypeScript script:

```text
npm run docs:index
```

Possible location:

```text
scripts/index-docs.ts
```

## 12.1 Process

```text
Shallow clone official liara-cloud/docs
        ↓
Read public/llms/**/*.md
        ↓
Parse document metadata
        ↓
Split by semantic headings
        ↓
Split oversized sections if necessary
        ↓
Hash chunks
        ↓
Embed only new/changed chunks
        ↓
Upsert PostgreSQL rows
        ↓
Delete chunks no longer present
```

## 12.2 No Runtime Crawler

Do not crawl documentation during user requests.

The knowledge index is prepared separately.

## 12.3 No Scheduled Sync Initially

Do not add cron/background jobs for MVP.

Run indexing manually when needed during development and before the final demo.

A scheduled sync can be added post-MVP.

---

# 13. Chunking Strategy

Do not use arbitrary fixed-token chunks as the first strategy.

Use heading-aware Markdown sections.

## 13.1 Preserve

Each chunk should preserve:

- title
- heading path
- prose
- nearby code block when it belongs to the section
- source path
- source URL
- service/platform metadata

## 13.2 Large Sections

If one heading section is too large:

- split by paragraphs/subsections,
- keep code fences intact,
- use small overlap only when context would otherwise be lost.

Do not add a tokenizer dependency only for chunk sizing unless necessary.

A simple character-size guard is acceptable initially.

## 13.3 Suggested Initial Size

Start around:

- target: approximately 2,000–3,500 characters
- maximum: approximately 5,000 characters

These are implementation starting values, not permanent product requirements.

Tune only if EVALS show a retrieval problem.

---

# 14. Knowledge Schema

Use one main table for MVP.

Conceptual schema:

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE doc_chunks (
  id              bigserial PRIMARY KEY,
  source_path     text NOT NULL,
  source_url      text NOT NULL,
  title           text NOT NULL,
  heading         text,
  service         text,
  platform        text,
  chunk_index     integer NOT NULL,
  content         text NOT NULL,
  content_hash    text NOT NULL,
  embedding       vector(<embedding_dimensions>) NOT NULL,
  indexed_at      timestamptz NOT NULL DEFAULT now(),

  UNIQUE (source_path, chunk_index)
);
```

The embedding dimension must be taken from the selected embedding model.

Do not hardcode an incorrect dimension before the actual model is verified.

Implemented as `db/migrations/001_knowledge_index.sql` with an
`{{EMBEDDING_DIMENSIONS}}` placeholder. `npm run db:migrate` substitutes it,
resolving the width by embedding one probe string against the configured model,
or from `LIARA_EMBEDDING_DIMENSIONS` when set. pgvector fixes a column's
dimension at creation time, so a guessed value would only surface as a failure
after the first insert. No migration framework: one idempotent SQL file and a
short script are enough at this size.

## 14.1 Why One Table

The MVP does not need a normalized CMS-like document model.

A single chunk table contains all retrieval and citation metadata required by the product.

---

# 15. Incremental Indexing

Do not regenerate embeddings for unchanged text.

Use:

```text
source_path + chunk_index + content_hash
```

to identify unchanged chunks.

Workflow:

- unchanged hash → keep existing embedding,
- new/changed hash → request new embedding,
- deleted source/chunk → delete stale row.

Batch embedding requests because Liara's embeddings endpoint supports arrays.

This provides meaningful cost optimization without adding infrastructure.

---

# 16. Retrieval Design

The MVP uses **two simple retrieval signals**.

## 16.1 Semantic Retrieval

For every RAG request:

1. create one query embedding,
2. perform pgvector cosine similarity search,
3. retrieve a small candidate set.

Initial candidate count:

```text
8 semantic candidates
```

No ANN vector index is required initially.

## 16.2 Exact Technical Token Retrieval

Technical error tokens are important.

Extract code-like tokens from the query, such as:

- `ECONNRESET`
- `npm ERR!`
- `package.json`
- `liara.json`
- configuration keys
- CLI fragments

When such tokens exist:

- run a case-insensitive exact/sub-string query against:
  - title,
  - heading,
  - content.

Initial candidate count:

```text
up to 8 lexical candidates
```

Do not build a full search engine for this.

## 16.3 Merge

Merge semantic and exact-token candidates using simple deterministic ranking.

Implemented as Reciprocal Rank Fusion in `lib/rag/merge.ts` with K = 60. RRF
fuses by rank rather than score, which matters because cosine similarity and
substring-match counts are not comparable numbers; normalising them into one
scale would be invented weighting. A chunk found by both arms therefore
outranks one found by either alone. Ties break by best arm rank, then row id,
so repeated queries return a stable order.

The lexical arm weights *where* a token matched — title 3, heading 2, content 1
— rather than counting matches flatly. Liara's docs put `## فایل liara.json` on
every platform page, and flat counting ranked an unrelated page above the
Next.js one; weighting fixed it without adding a search engine.

Deduplicate by source URL + heading.

Return approximately:

```text
4–6 final chunks
```

to the answer generator.

## 16.4 No Reranker Initially

Do not call another model to rerank results.

Revisit only after EVALS demonstrate a measurable need.

---

# 17. Retrieval Confidence / Abstention

The assistant must have a reliable "not enough evidence" path.

Initial logic:

```text
Strong exact match exists
OR
semantic retrieval is above tuned relevance threshold
    → answer from retrieved context

otherwise
    → ask clarification or abstain
```

The actual semantic threshold must be determined empirically during `docs/EVALS.md` work.

Do not invent a permanent threshold before evaluation.

---

# 18. RAG Answer Generation

RAG is used for:

- troubleshooting,
- general Q&A,
- side questions during guided deployment,
- explanations that are not already deterministic journey content.

## 18.1 Prompt Rules

The system prompt must instruct the model to:

- answer in Persian,
- be beginner-friendly,
- use retrieved Liara context for Liara-specific facts,
- preserve exact technical tokens,
- distinguish inference from known facts,
- give one primary next action for troubleshooting,
- avoid inventing commands/config,
- explicitly admit when evidence is insufficient.

## 18.2 Context

Send:

- current user message,
- bounded recent conversation,
- structured conversation state,
- 4–6 retrieved chunks,
- source identifiers.

Do not send the entire documentation page or full conversation.

## 18.3 Citations

The backend returns source metadata separately from the generated text.

Example:

```ts
type SourceReference = {
  title: string;
  heading?: string;
  url: string;
};
```

The UI renders source cards below the answer.

Do not rely on the LLM to fabricate source URLs.

---

# 19. LLM Call Budget

Avoid unnecessary calls.

## 19.1 General Q&A

Typical request:

```text
1 query embedding
1 retrieval
1 chat completion
```

## 19.2 Troubleshooting

Typical request:

```text
1 query embedding
1 retrieval
1 chat completion
```

## 19.3 Normal Guided Deployment Step

Typical request:

```text
0 LLM calls
0 embedding calls
```

Use deterministic step content.

## 19.4 Build on Liara Golden Planning

Typical supported plan:

```text
0 LLM calls
```

Use deterministic service mapping.

## 19.5 Ambiguous Intent

At most:

```text
0 or 1 short classification call
```

Only when deterministic routing cannot safely decide.

This call must not become mandatory for all requests.

---

# 20. Model Configuration

Environment variables:

```text
LIARA_AI_API_KEY
LIARA_AI_BASE_URL
LIARA_CHAT_MODEL
LIARA_EMBEDDING_MODEL
```

Do not expose the API key to client-side JavaScript.

Model IDs should be configured once through environment variables.

Do not scatter model names throughout the codebase.

---

# 21. Database Configuration

Environment variable:

```text
DATABASE_URL
```

The production application should connect to Liara PostgreSQL through the appropriate Liara network configuration.

Use a connection pool with conservative settings appropriate for a single MVP instance.

Do not introduce a separate database proxy or pooler unless Liara deployment behavior requires it.

---

# 22. API Surface

Keep the application API intentionally small.

Required:

```text
POST /api/chat
GET  /api/health
```

Development/operator-only indexing is a CLI script, not a public endpoint:

```text
npm run docs:index
```

Do not create a public admin/reindex API for MVP.

---

# 23. `/api/chat` Processing Flow

```text
Validate request
      ↓
Apply size / rate limits
      ↓
Read conversation state
      ↓
Determine behavior
      │
      ├── deterministic guided step
      │       ↓
      │    return response
      │
      ├── Build on Liara plan
      │       ↓
      │    deterministic mapping
      │       ↓
      │    return response
      │
      └── RAG-needed request
              ↓
           retrieve
              ↓
        evidence sufficient?
          ┌───┴────┐
         yes       no
          │         │
          ▼         ▼
       LLM call   clarify/abstain
          │
          ▼
      return answer + sources + updated state
```

No autonomous agent loop exists.

---

# 24. Input Limits

Initial server-side safeguards:

- current user message: start around **12,000 characters max**
- recent conversation messages: start around **10 messages max**
- reject obviously excessive payloads
- do not send complete long logs to the model if only a relevant section is needed

These values are reasonable MVP defaults and can be adjusted during testing.

All limits should live in one configuration module.

---

# 25. Rate Limiting

Do not add Redis for rate limiting.

For the initial single-instance MVP:

- use an in-memory per-IP sliding/fixed window limiter,
- return a clear 429 response,
- use conservative limits suitable for demo/public testing.

Suggested starting point:

```text
20 chat requests / minute / IP
```

Tune if needed.

Tradeoff:

- state resets on process restart,
- not globally coordinated across multiple instances.

This is acceptable for the MVP while deployed as one application instance.

Revisit only when horizontal scaling is introduced.

---

# 26. Security

## 26.1 Secrets

Server-only environment variables:

- AI API key
- database URL

Never expose them in:

- client bundle,
- logs,
- source control,
- API responses.

## 26.2 User Input

Treat all user text as untrusted.

Do not:

- execute shell commands,
- execute code,
- evaluate config,
- render unescaped HTML from user content.

## 26.3 Markdown Rendering

If Markdown is rendered:

- use a safe renderer,
- do not allow raw HTML by default.

## 26.4 Logging

Do not log full pasted user logs/configs by default.

Prefer metadata:

- request id,
- payload size,
- intent,
- retrieval candidate count,
- latency,
- model ID,
- token usage if returned,
- error category.

## 26.5 Prompt Injection from Documentation

Documentation is trusted only as content, not as executable instruction.

The system prompt must clearly separate:

- system behavior,
- retrieved documentation content.

Do not allow retrieved text to redefine application rules.

---

# 27. Observability

Keep observability native and small.

## 27.1 Application Logs

Use structured JSON logs to stdout/stderr.

Each `/api/chat` request should have a request ID.

Suggested fields:

```text
request_id
intent
active_journey
latency_ms
retrieval_count
used_exact_match
chat_model
embedding_model
input_size
output_size
token_usage (when available)
status
error_code
```

Do not log secrets.

## 27.2 Liara Logs

Use Liara application logs as the first operational log surface.

Do not add Sentry or another observability SaaS initially.

## 27.3 Liara AI Logs

Liara AI provides workspace/request logging and usage data.

Use it as supporting evidence for:

- token usage,
- model activity,
- request failures.

## 27.4 Health Check

`GET /api/health` should verify:

- application process is alive,
- database connection succeeds.

Do not call the paid AI API from every health check.

This arrives in two steps. BL-002 implements the process-liveness half, which
returns `{"status":"ok"}` and touches no dependency. The database check is added
by BL-071, once there is a database to check.

---

# 28. Cost Controls

MVP cost controls are intentionally simple.

## 28.1 Embeddings

- embed docs only when new/changed,
- batch document embeddings,
- one query embedding per RAG request.

## 28.2 Chat

- one chat completion for a normal RAG answer,
- no LLM for normal guided journey steps,
- no LLM for deterministic Build on Liara mapping,
- no model router,
- no reranker,
- no autonomous loops.

## 28.3 Context

Keep only:

- bounded recent messages,
- structured journey state,
- 4–6 retrieved chunks.

## 28.4 Caching

Do not implement Redis/application caching initially.

If repeated identical queries appear during measurement, consider a small in-memory cache later.

Do not add it preemptively.

---

# 29. Failure Handling

## 29.1 Database Unavailable

Return a safe Persian error.

Do not attempt an ungrounded Liara-specific answer.

## 29.2 Embedding API Failure

Return retryable failure for RAG-dependent requests.

Preserve client conversation state.

## 29.3 Chat Model Failure

Return retryable failure.

Do not lose the journey state.

## 29.4 No Retrieval Evidence

Clarify or abstain.

Do not fall back to unsupported Liara-specific model knowledge.

## 29.5 Index Missing

Health/diagnostic logs should make an empty documentation index obvious.

Do not silently run the assistant as a generic chatbot.

---

# 30. Testing Strategy

Use a small testing stack.

Recommended initial test runner:

- **Vitest**

Do not add full E2E infrastructure before it is useful.

## 30.1 Unit Tests

Prioritize pure deterministic modules:

- intent routing
- technical-token extraction
- candidate merge/RRF
- conversation state transitions
- Build on Liara service mapping
- guided journey transitions
- input validation

## 30.2 Retrieval Integration Tests

Test against a small seeded database/index:

- exact token retrieval
- semantic retrieval
- deduplication
- source metadata

## 30.3 EVALS

AI quality lives in:

```text
docs/EVALS.md
```

EVALS are not ordinary unit tests.

They should test the real model + retrieval pipeline before final delivery.

## 30.4 UI

Initially use:

- component-level checks where useful,
- manual responsive/RTL verification.

Add Playwright only if later regression risk justifies it.

---

# 31. Repository Structure

Keep the initial codebase small.

Application code lives at the repository root rather than under `src/`. This is
what the existing scaffold and the shadcn/ui `components.json` aliases already
use, and the `@/*` path alias resolves to the repository root.

Target structure:

```text
/
├── CLAUDE.md
├── README.md
├── AGENTS.md                 # Next.js-managed agent rules
├── package.json
├── next.config.ts
├── tsconfig.json
├── vitest.config.mts
├── components.json           # shadcn/ui configuration
├── .env.example
│
├── docs/
│   ├── MVP.md
│   ├── PRD.md
│   ├── TECH.md
│   ├── BACKLOG.md
│   ├── EVALS.md
│   ├── DEVLOG.md
│   └── DEPLOYMENT.md
│
├── db/
│   └── migrations/
│       └── 001_knowledge_index.sql
│
├── scripts/
│   └── index-docs.ts
│
├── app/
│   ├── api/
│   │   ├── chat/route.ts
│   │   └── health/route.ts
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
│
├── components/
│   └── ui/                   # shadcn/ui components
│
└── lib/
    ├── utils.ts              # cn() class merge helper
    ├── server/
    │   └── env.ts            # server-only environment access
    ├── ai/
    │   ├── client.ts
    │   └── prompts.ts
    ├── db.ts
    ├── journey/
    │   ├── intent.ts
    │   ├── nextjs.ts
    │   └── state.ts
    └── rag/
        ├── retrieve.ts
        ├── tokens.ts
        └── types.ts
```

This is a guide, not permission to create placeholder files.

Create files only when the implementation reaches the feature that needs them.

## 31.1 Server/Client Boundary

Secrets are read only through `lib/server/env.ts`, which begins with
`import "server-only"`.

Importing that module from a Client Component fails the production build with an
explicit import trace, so an API key or database URL cannot reach the client
bundle by accident.

Tests live next to the module they cover as `*.test.ts`.

---

# 32. Deployment Architecture

Production uses Liara-native services.

```text
Liara PaaS
└── Next.js application
      │
      ├── Private/managed connection → Liara PostgreSQL DBaaS
      │                                  └── pgvector
      │
      └── HTTPS → Liara AI API
```

Required production resources:

1. one Next.js PaaS application
2. one PostgreSQL DBaaS instance with pgvector
3. one Liara AI workspace/API key

No other production service is required for the MVP.

---

# 33. Documentation Index Deployment Process

Initial operational approach:

1. Create PostgreSQL DBaaS.
2. Enable/verify pgvector.
3. Apply database migration.
4. Run `npm run docs:index` against the target database.
5. Verify chunk count and sample retrieval.
6. Deploy/start application.
7. Run EVAL smoke tests.

Do not create a public indexing endpoint.

If local access to the database requires temporary public-network access, document the secure procedure in `docs/DEPLOYMENT.md` and disable it afterward when possible.

---

# 34. Environment Variables

Initial environment contract:

```text
DATABASE_URL=

LIARA_AI_API_KEY=
LIARA_AI_BASE_URL=
LIARA_CHAT_MODEL=
LIARA_EMBEDDING_MODEL=
```

Optional implementation configuration may include:

```text
CHAT_RATE_LIMIT_PER_MINUTE=
MAX_MESSAGE_CHARS=
RAG_FINAL_CHUNK_COUNT=
```

Do not create a large environment-variable surface.

Use sensible application defaults for non-secret tuning values.

BL-003 implements this split. The five required variables above are read through
`lib/server/env.ts`, which carries the `server-only` marker and validates lazily,
naming every missing variable without ever printing a value. The optional tuning
values are plain constants in `lib/config.ts` rather than environment variables:
Next.js inlines only `NEXT_PUBLIC_` names into client JavaScript, so a limit read
from `process.env` would silently fall back to its default in the browser while
working correctly on the server.

---

# 35. Technical Decisions

## Decision: Tailwind CSS v4 + shadcn/ui instead of CSS Modules

Context:
TECH v1 proposed CSS Modules with a small global CSS layer. The repository was
already scaffolded with Tailwind CSS v4, a configured shadcn/ui installation
(`components.json`, `lib/utils.ts`, `components/ui/button.tsx`, Base UI
primitives), and a shadcn MCP server plus skill for adding components.

Decision:
Keep the existing Tailwind + shadcn/ui setup and enable its RTL mode
(`"rtl": true` in `components.json`).

Reason:
The frozen UI needs source cards, next-action chips, code blocks, a composer,
and step indicators. Those are exactly what shadcn/ui provides as ready
components, and the setup already works. Replacing it with CSS Modules would
mean deleting working configuration and hand-writing the same components.

With RTL mode enabled, the shadcn CLI emits logical spacing utilities and `rtl:`
variants, which the Persian RTL-first product needs on every component it adds.

Tradeoff:
More styling dependencies than a plain CSS layer, and utility classes in markup
rather than separate stylesheets.

Revisit when:
The component surface stays small enough that the dependency is not paying for
itself.

---

## Decision: No AI client dependency during foundation work

Context:
BL-001 was expected to find a partially installed Vercel AI SDK. Inspection found
none: no `ai` or `@ai-sdk/*` entry in `package.json`, none in the lockfile, and
no import anywhere in the source.

Decision:
Install no AI client in BL-001. Leave the `openai` choice in section 2.2 intact
and add the dependency in BL-030.

Reason:
There was no partial setup to complete or remove, and no code calls a model yet.
Adding a client now would be an unused dependency chosen before the code that
uses it exists.

Tradeoff:
The AI client choice is confirmed against the real Liara AI API later than the
rest of the stack.

Revisit when:
BL-030 configures the Liara AI client, at which point the OpenAI-compatible
client and the Vercel AI SDK can be compared against actual usage.

---

## Decision: Vitest with a node environment only

Context:
The repository had no test setup at all.

Decision:
Add Vitest with a single `vitest.config.mts`, a node environment, and the `@/`
path alias. No DOM environment and no component-testing library.

Reason:
Section 30.1 prioritizes pure deterministic modules — intent routing, token
extraction, candidate merging, state transitions. None of those need a DOM.

Tradeoff:
Component-level tests require adding a DOM environment first.

Revisit when:
A UI behavior is worth testing automatically rather than manually.

---

## Decision: One Next.js full-stack application

Context:
The product has a small UI and a small HTTP API.

Decision:
Use one Next.js application with Route Handlers.

Reason:
Smallest deployment and repository surface.

Tradeoff:
Frontend and backend are coupled.

Revisit when:
A backend requirement cannot be supported cleanly within the Next.js application.

---

## Decision: Vercel AI SDK as the AI client layer

Context:
The repository already carried `ai` and `@ai-sdk/react` before the AI batch
began, while this document specified the standalone `openai` client.

Decision:
Adopt the Vercel AI SDK, reaching Liara through its OpenAI-compatible provider.
Drop the separate `openai` client baseline.

Reason:
It is already installed, `@ai-sdk/react` serves the conversation UI, and it
speaks the same OpenAI-compatible API Liara exposes. Keeping both would mean
maintaining two clients for one job.

Tradeoff:
A larger dependency than `openai`, and its agent/workflow surface must be left
unused on purpose so the MVP does not drift toward an agent framework.

Revisit when:
The AI SDK blocks a required Liara behavior, or its provider layer cannot be
pointed at Liara cleanly.

---

## Decision: Liara PostgreSQL + pgvector

Context:
The product needs a persistent documentation vector index.

Decision:
Use Liara PostgreSQL DBaaS with pgvector.

Reason:
Avoids a separate vector database and keeps infrastructure inside Liara.

Tradeoff:
Retrieval features are limited to what we implement in PostgreSQL/application logic.

Revisit when:
Measured corpus size/latency or retrieval quality requires a different search system.

---

## Decision: No persistent user/conversation database

Context:
Cross-session memory is not an MVP requirement.

Decision:
Carry state in the browser/session request.

Reason:
Eliminates user/session persistence complexity.

Tradeoff:
Refresh/new session loses conversation.

Revisit when:
Persistent chat history becomes an approved product requirement.

---

## Decision: Deterministic journey logic

Context:
The Next.js deployment journey is known and testable.

Decision:
Implement state transitions and normal steps in TypeScript rather than an autonomous agent.

Reason:
Lower hallucination, lower cost, easier testing.

Tradeoff:
Less flexible for unsupported journeys.

Revisit when:
More guided journeys are approved and duplication becomes a real maintenance problem.

---

## Decision: Semantic + exact-token retrieval

Context:
Natural-language questions need semantic retrieval while errors/config names need exact matching.

Decision:
Use pgvector similarity plus a lightweight exact-token retrieval arm.

Reason:
Addresses the two actual query types without a search platform.

Tradeoff:
Less sophisticated than a fully tuned hybrid search/reranker system.

Revisit when:
EVALS show retrieval misses.

---

## Decision: No reranker initially

Context:
The corpus and candidate set are modest.

Decision:
Use deterministic candidate merging first.

Reason:
One fewer model/service call and lower latency/cost.

Tradeoff:
Potentially lower precision on difficult multi-document questions.

Revisit when:
Retrieval EVALS show repeated top-k ordering failures.

---

## Decision: No streaming initially

Context:
Streaming improves perceived responsiveness but adds API/UI complexity.

Decision:
Ship request/response first.

Reason:
Not required for product correctness or challenge MVP.

Tradeoff:
Users wait for the complete answer.

Revisit when:
Measured latency makes the UX unacceptable.

---

## Decision: Native structured logging

Context:
The challenge requires monitoring but not a dedicated observability platform.

Decision:
Use structured app logs + Liara logs + Liara AI usage/logs.

Reason:
No extra SaaS or SDK required.

Tradeoff:
Less advanced tracing/alerting.

Revisit when:
Production debugging cannot be performed from these signals.

---

# 36. Implementation Order Implications

This technical design suggests the implementation should be built in this dependency order:

```text
1. App shell + Persian/RTL UI
2. Conversation types/state
3. Deterministic intent/journey logic
4. Database + pgvector migration
5. Docs indexer
6. Retrieval
7. Liara AI client
8. General RAG Q&A
9. Troubleshooting
10. Build on Liara
11. Guided Next.js deployment
12. Security/rate limiting
13. Logging/health
14. Liara deployment
15. EVAL hardening
```

The actual phased backlog belongs in `docs/BACKLOG.md`.

---

# 37. What Is Intentionally Still Open

Only implementation-tuning decisions remain open.

They do not change architecture.

Examples:

- exact pinned Next.js version
- exact Liara chat model ID
- final embedding model ID/dimension
- exact retrieval relevance threshold
- exact rate limit after testing
- exact chunk size after retrieval evaluation
- final visual styling details

These should be resolved through implementation evidence, current Liara model catalog, and EVALS.

They must not be used to reopen the MVP scope.

---

# 38. Stage 5 Acceptance Checklist

Stage 5 is complete when:

- application stack is chosen,
- infrastructure is limited to required Liara services,
- RAG design is explicit,
- indexing strategy is explicit,
- conversation state strategy is explicit,
- deterministic guided journey approach is explicit,
- model configuration approach is explicit,
- API surface is small and explicit,
- security baseline is explicit,
- monitoring baseline is explicit,
- cost controls are explicit,
- deployment architecture is explicit,
- unnecessary technical systems are explicitly rejected.

**Stage 5 Status: DONE**
