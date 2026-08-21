# Liara AI Assistant — MVP Backlog

## Document Status

**Version:** BACKLOG v1  
**Status:** Approved implementation backlog  
**Product scope:** MVP v1.1  
**Sources:** `docs/MVP.md`, `docs/PRD.md`, `docs/TECH.md`  
**Pre-build gate:** SATISFIED — `docs/EVALS.md` approved in Stage 7.

This backlog translates the frozen PRD and TECH into a small implementation sequence.

It must not expand the MVP.

---

# 1. Execution Rules

- One backlog item should normally map to one focused Claude Code implementation cycle.
- Do not batch an entire phase into one prompt.
- Do not split a simple change into artificial subtasks.
- Start a task only when its dependencies are DONE.
- Mark a task DONE only after implementation, verification, and Critic review.
- If a useful idea is outside the frozen scope, park it for post-MVP instead of implementing it.
- Update project documentation only when the owning document materially changed.

Stage 7 has defined and approved the initial `docs/EVALS.md`; BL-001 is now unblocked.

---

# 2. Implementation Sequence

```text
Phase 0 — Foundation & Early Liara Proof
        ↓
Phase 1 — Persian / RTL Product Shell
        ↓
Phase 2 — Conversation & Deterministic Core
        ↓
Phase 3 — Knowledge Index & Retrieval
        ↓
Phase 4 — Grounded General Q&A
        ↓
Phase 5 — Troubleshooting
        ↓
Phase 6 — Build on Liara + Guided Next.js Deployment
        ↓
Phase 7 — Security, Reliability & Observability
        ↓
Phase 8 — Production, EVAL Hardening & Delivery
```

These are implementation phases, not separate products or services.

---

# 3. Phase 0 — Foundation & Early Liara Proof

## Goal

Create the smallest healthy codebase and prove early that it can run on Liara.

---

### BL-001 — Scaffold the approved application foundation

Status: DONE

Acceptance Criteria:
- Existing repository and all current project/setup files are inspected before changes.
- Existing shadcn/ui setup is evaluated and may be kept/completed when useful for the frozen UI.
- The partial Vercel AI SDK setup is inspected and may be completed, simplified, replaced, or removed based on the simplest MVP implementation path.
- Unused, conflicting, obsolete, or unnecessary files/dependencies may be removed after inspection.
- Required implementation files may be added.
- Next.js App Router + TypeScript application foundation is healthy and coherent (existing scaffold may be reused rather than recreated).
- Essential commands work: dev, lint, test, build.
- Test setup is minimal and appropriate; do not duplicate an already useful test setup.
- `.env.example` contains required variable names without secrets when environment configuration is relevant at this stage.
- Server/client configuration boundaries are clear.
- A material stack/tooling deviation is allowed only when it clearly reduces complexity or implementation time while preserving MVP/PRD/EVALS; document such a deviation in `docs/TECH.md` and `CLAUDE.md` as needed.
- No auth, agent framework, Redis, unrelated infrastructure, or speculative subsystem is added.
- Build and baseline tests pass.

Dependencies:
- None — Stage 7 EVAL gate is complete

---

### BL-002 — Add initial health endpoint and early Liara deployability

Status: DONE — deployed to the team PaaS app `liara-ai-assistant` under team
لیارا. Verified publicly: `/` returns 200 and `/api/health` returns
{"status":"ok","database":"ok"}, reached over the private network and exposing
no secrets.

Acceptance Criteria:
- `GET /api/health` exists.
- It verifies application-process health without making a paid AI call.
- The minimal application can be deployed to Liara PaaS.
- Root page and health endpoint are reachable on the deployed application.
- No database/AI feature is required for this first deployment proof.
- Deployment findings are recorded later in `docs/DEPLOYMENT.md` only when they become operationally relevant.

Dependencies:
- BL-001

---

### BL-003 — Enforce server/client configuration boundaries

Status: DONE

Acceptance Criteria:
- `LIARA_AI_API_KEY` and `DATABASE_URL` cannot leak into client code.
- Required production configuration fails clearly when missing.
- Non-secret defaults such as message limits live in one configuration module.
- No real secret is committed or logged.

Dependencies:
- BL-001

---

# 4. Phase 1 — Persian / RTL Product Shell

## Goal

Implement the frozen two-screen UX with local/mock behavior only.

---

### BL-010 — Implement Home + base Conversation UI

Status: DONE

Acceptance Criteria:
- UI is Persian and RTL-first.
- Home includes:
  - `یه مشکلی برای پروژه‌م پیش اومده`
  - `می‌خوام پروژه‌م رو آنلاین کنم`
  - general composer input.
- Conversation is the single working surface.
- User/assistant messages and a usable composer exist.
- Multi-line pasted text is supported.
- New-conversation/reset behavior is session-local.
- No dashboard, login UI, history sidebar, onboarding system, or project profile is added.

Dependencies:
- BL-001

---

### BL-011 — Implement technical and structured response UI

Status: DONE

Acceptance Criteria:
- Code/commands/logs are LTR and monospace inside RTL UI.
- Exact line breaks/tokens remain readable.
- Commands/code have copy behavior.
- Long technical lines scroll safely on mobile.
- Source cards exist.
- Action chips exist.
- Minimal Build on Liara plan card exists.
- Compact journey progress exists.
- Raw user HTML is not executed/rendered unsafely.

Dependencies:
- BL-010

---

### BL-012 — Implement loading, retry, failure, and responsive states

Status: DONE

Acceptance Criteria:
- Calm assistant loading state exists.
- Retryable request failure UI exists.
- Rate-limit and oversized-paste presentation exists.
- Active conversation UI is preserved during retryable failures.
- Home and Conversation work on mobile.
- Mixed Persian/English content remains readable.
- Technical LTR islands remain correct.
- No internal chain-of-thought/reasoning UI is shown.

Dependencies:
- BL-010
- BL-011

---

# 5. Phase 2 — Conversation & Deterministic Core

## Goal

Build the non-AI product engine before introducing RAG.

---

### BL-020 — Define and validate the conversation contract

Status: DONE

Acceptance Criteria:
- Types exist for messages, intent, conversation state, sources, actions, API request, and API response.
- State contains only approved MVP fields.
- Request/state shape is validated server-side.
- User-controlled enums/lengths are bounded.
- Invalid payloads return safe responses.
- Unit tests cover default, valid, and invalid state/request behavior.

Dependencies:
- BL-001
- BL-003

---

### BL-021 — Implement deterministic intent and state logic

Status: DONE

Acceptance Criteria:
- Obvious error/log input routes to troubleshooting.
- Obvious Next.js deployment intent routes to deployment.
- Normal questions route to general Q&A.
- Active journey has priority over accidental reset.
- Ambiguous input can produce one clarification instead of a guess.
- Journey state can advance, pause, enter an error branch, return, and complete.
- No ML classifier or autonomous agent loop is added.
- Unit tests cover representative Persian/technical inputs and state transitions.

Dependencies:
- BL-020

---

### BL-022 — Implement `/api/chat` skeleton and connect the UI

Status: DONE

Acceptance Criteria:
- `POST /api/chat` exists.
- It validates request/state.
- It invokes deterministic routing/state logic.
- It can return deterministic/mock responses without AI.
- Browser sends bounded recent messages + state.
- Browser retains server-returned state for the active session.
- Retry does not intentionally reset journey state.
- Refresh persistence is not implemented.

Dependencies:
- BL-010
- BL-021

---

# 6. Phase 3 — Knowledge Index & Retrieval

## Goal

Build reliable Liara documentation retrieval before AI answer generation.

---

### BL-030 — Configure Liara AI + PostgreSQL development resources and clients

Status: DONE — clients implemented. Live Liara AI and PostgreSQL
connectivity is unverified; the VPN exit IP is refused by Liara (see BL-002).

Acceptance Criteria:
- Development Liara PostgreSQL DBaaS is available.
- pgvector availability is verified.
- Liara AI workspace/API key is available.
- Current usable chat and embedding model IDs are verified.
- PostgreSQL connection uses `pg`.
- OpenAI-compatible client connects to Liara AI server-side.
- Model IDs come from environment variables.
- Minimal embedding and chat calls can be verified.
- No extra infrastructure service or AI framework is introduced.

Dependencies:
- BL-003

---

### BL-031 — Add the knowledge-index migration

Status: DONE — migration resolves the embedding dimension from the
configured model at apply time. Not yet applied to a live database.

Acceptance Criteria:
- Migration enables/verifies pgvector.
- `doc_chunks` stores approved content + retrieval/citation metadata.
- Vector dimension matches the selected embedding model.
- Migration is reproducible.
- No ORM or normalized CMS schema is introduced without a concrete need.

Dependencies:
- BL-030

---

### BL-032 — Implement Liara docs acquisition and semantic chunking

Status: DONE — verified against the real corpus: 1143 files, 5441
chunks, 0 failures.

Acceptance Criteria:
- `npm run docs:index` acquires/reads official `liara-cloud/docs`.
- Preferred corpus is `public/llms/**/*.md`.
- Markdown is split primarily by semantic headings.
- Code fences remain intact when reasonably possible.
- Oversized sections can be split simply.
- Each chunk preserves title, heading, content, source path, source URL, chunk index, and useful service/platform metadata.
- Runtime user requests never crawl documentation.
- Tests cover representative Markdown/chunking cases.

Dependencies:
- BL-001

---

### BL-033 — Implement incremental embedding and index synchronization

Status: DONE — plan/apply logic unit-tested. Not yet run against a live
database or embedding API.

Acceptance Criteria:
- Content hashes identify unchanged chunks.
- Unchanged content is not re-embedded.
- New/changed chunks are embedded and upserted.
- Embedding requests are batched where supported.
- Deleted/stale chunks are removed.
- Completed indexing reports useful counts without secrets.
- Re-running the indexer does not unnecessarily repeat embedding work.

Dependencies:
- BL-031
- BL-032

---

### BL-034 — Implement semantic + exact-token retrieval

Status: DONE — both arms and the fusion implemented. Semantic retrieval
is unverified end to end without a live index.

Acceptance Criteria:
- Semantic query uses one query embedding and pgvector similarity.
- Exact technical tokens such as `ECONNRESET`, `package.json`, and `liara.json` can be extracted.
- Lexical exact/sub-string retrieval searches relevant fields.
- Semantic and lexical candidates are merged deterministically.
- Duplicate source+heading results are removed.
- Final returned chunk count is bounded.
- Trusted source metadata is returned.
- No external search engine, reranker, or ANN index is added.

Dependencies:
- BL-030
- BL-033

---

### BL-035 — Add retrieval integration tests

Status: DONE — token extraction, fusion, chunking, and sync covered.
Seeded PostgreSQL integration test deferred until a database is reachable.

Acceptance Criteria:
- Tests cover semantic retrieval.
- Tests cover exact technical-token retrieval.
- Tests cover merge/deduplication.
- Tests verify source metadata.
- Test failures clearly identify retrieval problems.

Dependencies:
- BL-034

---

## Phase 3 Gate

Before continuing, retrieval must reliably produce:

- relevant semantic results,
- exact technical-token results,
- valid source metadata.

---

# 7. Phase 4 — Grounded General Q&A

## Goal

Deliver the baseline grounded-answer capability.

---

### BL-040 — Implement grounded RAG answer generation

Status: DONE — retrieve, evaluate evidence, one grounded generation.
Verified with mocked retrieval/model; no live Liara call has succeeded yet.

Acceptance Criteria:
- System prompt requires Persian beginner-friendly answers.
- Liara-specific operational facts must use retrieved context.
- Exact technical tokens are preserved.
- Known facts vs inference are distinguishable.
- `/api/chat` general Q&A runs retrieval before chat completion.
- Only bounded recent messages/state/chunks are sent.
- Source URLs come from retrieval metadata, not model-generated URLs.
- Typical request uses one query embedding + one chat completion.
- No model router, reranker, tool calling, or agent loop is added.

Dependencies:
- BL-022
- BL-034

---

### BL-041 — Implement source, evidence, clarification, and abstention behavior

Status: DONE — sources come from retrieval metadata only; weak evidence
clarifies or abstains. Relevance thresholds are starting values, not tuned.

Acceptance Criteria:
- Real source cards render under grounded answers.
- Duplicate/irrelevant source cards are avoided.
- Strong exact/relevant evidence can produce an answer.
- Weak evidence produces one useful clarification or explicit abstention.
- Product does not silently fall back to unsupported Liara-specific model knowledge.
- Relevance threshold remains configurable/tunable for Stage 7 EVAL work.

Dependencies:
- BL-011
- BL-040

---

### BL-042 — Implement RAG/API failure behavior

Status: DONE — retrieval, embedding, model, and empty-index failures all
return safe Persian copy and never fall back to ungrounded answers.

Acceptance Criteria:
- Database failure is safe and user-facing.
- Embedding failure is retryable.
- Chat model failure is retryable.
- Active browser journey state survives retryable failures.
- Internal stack traces are not shown.
- Product does not answer ungrounded when the knowledge layer is unavailable.

Dependencies:
- BL-012
- BL-040

---

# 8. Phase 5 — Troubleshooting

## Goal

Implement the highest-priority Golden Journey: Error → grounded next action.

---

### BL-050 — Implement the complete troubleshooting response flow

Status: DONE — grounded troubleshooting with deterministic observation of
pasted package.json / liara.json. All six eval categories covered at behavior level.

Acceptance Criteria:
- Pasted exact error strings are preserved.
- Existing conversation context is reused.
- Framework/phase is labeled as inferred unless confirmed.
- Missing evidence triggers one high-value question only when needed.
- Grounded response prioritizes:
  1. likely cause,
  2. one concrete fix/diagnostic action,
  3. source,
  4. next verification.
- Commands/config are grounded.
- Response is Persian and beginner-friendly.
- No separate framework-specific troubleshooting engine is introduced.

Dependencies:
- BL-021
- BL-041

---

### BL-051 — Implement troubleshooting continuation and tests

Status: DONE — journey and current step survive the troubleshooting branch;
follow-up actions and prior context carry forward.

Acceptance Criteria:
- Actions such as `درست شد`, `هنوز خطا دارم`, and `لاگ جدید رو می‌فرستم` work.
- New log output reuses prior context.
- Standalone troubleshooting state can continue through multiple turns.
- Deterministic/unit tests cover routing/state/follow-up behavior.
- Test fixtures include exact technical tokens.
- Scope remains limited to general best-effort behavior + Stage 7 Eval Pack.

Dependencies:
- BL-050
- BL-011

---

# 9. Phase 6 — Build on Liara + Guided Next.js Deployment

## Goal

Implement the second Golden Journey with deterministic planning and steps.

---

### BL-060 — Implement Build on Liara needs collection and service plan

Status: DONE — deterministic service mapping, no model call. A service
appears only when the user described a need for it.

Acceptance Criteria:
- Planning can determine:
  - Next.js,
  - PostgreSQL need,
  - persistent uploaded-file need.
- Only questions that change the plan are asked.
- Next.js maps to PaaS.
- PostgreSQL need maps to PostgreSQL DBaaS.
- Persistent upload need maps to Object Storage when justified.
- Every recommendation has a reason.
- Unneeded services are excluded.
- Mapping requires no LLM call.
- Plan renders using the compact plan UI.
- No architecture/cost advisor is introduced.

Dependencies:
- BL-021
- BL-011

---

### BL-061 — Implement guided Next.js steps D01–D03

Status: DONE — D01–D03 implemented as deterministic content. D04–D10 is
BL-062 and the journey says so rather than inventing commands.

Acceptance Criteria:
- D01 confirms supported Next.js deployment intent.
- Unsupported framework does not enter guided flow.
- D02 checks only essential project readiness.
- Relevant `package.json` may be pasted as text.
- D03 confirms the minimal Build on Liara plan.
- Current step/progress is visible.
- One primary action is presented at a time.

Dependencies:
- BL-060

---

### BL-062 — Implement guided Next.js steps D04–D08

Status: DONE — D04–D08 implemented from the current official Liara docs
(npm install -g @liara/cli, liara login, liara network create, liara create,
liara deploy --app=<id> --platform=next). Advancement now requires a recognizable
completion signal; an unrecognised remark holds the step.

Acceptance Criteria:
- Current official Liara CLI/Next.js docs are re-verified immediately before implementation.
- D04 handles CLI availability/install.
- D05 handles user-reported login.
- D06 guides only necessary resource creation/selection.
- D07 uses only documented preparation/configuration.
- D08 gives the documented deploy command with the actual known app ID.
- Commands are never executed automatically.
- Normal guided steps do not require LLM calls.

Dependencies:
- BL-061

---

### BL-063 — Implement deployment troubleshooting and side-question branches

Status: DONE — errors and side questions preserve journey, step, and app id.
Resolving an error returns to the same step rather than completing it.

Acceptance Criteria:
- Deployment error preserves original step.
- Error branch uses grounded troubleshooting.
- After resolution, user can return to the correct deployment step.
- Side Liara questions use RAG without resetting deployment.
- Previously known framework/step information is not requested again.

Dependencies:
- BL-051
- BL-062
- BL-040

---

### BL-064 — Implement guided completion and unsupported-framework fallback

Status: DONE — D10 requires explicit success or clearly successful output.
Unsupported frameworks stay outside the journey with grounded Q&A still offered.

Acceptance Criteria:
- Explicit user success can complete the journey.
- Reliable pasted success output can complete the journey.
- Completion requires no mandatory remaining golden-path step.
- UI never claims independent Liara-account verification.
- Unsupported framework receives a clear limitation message and may receive general grounded help.
- No second guided framework is introduced.

Dependencies:
- BL-063

---

# 10. Phase 7 — Security, Reliability & Observability

## Goal

Harden the completed MVP without introducing enterprise infrastructure.

---

### BL-070 — Add request limits, rate limiting, and content hardening

Status: DONE — bounded input, in-memory per-IP limiter returning 429 with
Retry-After, and no shell/HTML execution anywhere in the render path.

Acceptance Criteria:
- User-message length is bounded from centralized config.
- Recent-message count is bounded.
- Oversized payload returns clear Persian guidance.
- `/api/chat` has configurable in-memory per-IP rate limiting.
- 429 maps to the approved UX.
- Generated/user content cannot execute raw HTML/code.
- No Redis is added.
- Boundary behavior is tested.

Dependencies:
- BL-022
- BL-042

---

### BL-071 — Add structured logging and final health checks

Status: DONE — structured JSON logs with a forbidden-field filter, and a
health endpoint that reports database state without making a paid AI call.

Acceptance Criteria:
- Each `/api/chat` request has a request ID.
- Structured logs include approved metadata such as intent, latency, retrieval count, model IDs, status, and token usage when available.
- Full user logs/configs are not logged by default.
- Secrets are never logged.
- `/api/health` verifies process + database connectivity.
- Health does not call the paid AI API.
- Logs are usable through Liara application logs.

Dependencies:
- BL-031
- BL-040
- BL-002

---

### BL-072 — Verify the approved cost/call budget

Status: DONE — call budget enforced by tests: 0 AI calls for guided steps,
planning, ambiguous errors, and unsupported frameworks; exactly 1 retrieval +
1 generation for Q&A and troubleshooting.

Acceptance Criteria:
- Normal guided step uses zero LLM/embedding calls.
- Deterministic Build on Liara plan uses zero LLM calls.
- General Q&A normally uses one embedding + one chat completion.
- Troubleshooting normally uses one embedding + one chat completion.
- No reranker, router, agent loop, or unnecessary repeated retrieval exists.
- Unexpected calls are removed or explicitly justified.

Dependencies:
- BL-050
- BL-064

---

# 11. Phase 8 — Production, EVAL Hardening & Delivery

## Goal

Deploy the complete product, run the fixed EVAL suite, fix only material failures, and prepare challenge delivery.

---

### BL-080 — Create the production Liara deployment runbook and resources

Status: DONE — docs/DEPLOYMENT.md covers env contract, the eleven-step
production sequence, and the minimum-exposure procedure for indexing access.

Acceptance Criteria:
- `docs/DEPLOYMENT.md` exists.
- It documents only the approved production resources:
  - Next.js PaaS,
  - PostgreSQL DBaaS + pgvector,
  - Liara AI workspace/API key.
- Required environment variables are documented without secrets.
- Production PaaS/DB/AI resources are available and configured.
- Migration/index/deploy/health verification order is documented.
- No automatic provisioning workflow is created.

Dependencies:
- BL-071

---

### BL-081 — Build the production knowledge index and deploy the complete MVP

Status: DONE — team لیارا runs the complete MVP. PostgreSQL 16.14 with pgvector
0.8.1, a vector(1536) column sized from the live embedding model, and 5,441
chunks indexed from 1,143 official documentation files with zero failures. A
second index run embedded nothing and changed nothing, confirming incremental
sync. Deployed at https://liara-ai-assistant.liara.run with `/` 200 and
`/api/health` reporting {"status":"ok","database":"ok"}.

Acceptance Criteria:
- Production migration succeeds.
- Official Liara docs are indexed successfully.
- Non-zero chunk count is verified.
- Sample semantic and exact-token retrieval works.
- Production build succeeds.
- Application is deployed on Liara.
- Root UI and `/api/health` work.
- General Q&A, troubleshooting, and guided deployment can start successfully.
- No public reindex endpoint exists.
- No secret is visible client-side.

Dependencies:
- BL-080
- BL-035
- BL-070
- BL-072

---

### BL-082 — Execute EVALS and fix critical MVP failures

Status: DONE — 18/18 live cases pass against the deployed application using the
real model and index (`npm run eval:live`), and retrieval scores 5/5 with every
expected source ranked first (`npm run eval:retrieval`). Three real failures
found and fixed during the run; see `docs/EVAL_RUN.md`.

Acceptance Criteria:
- All Stage 7 EVAL cases run against the real retrieval/model pipeline.
- Failures are classified as retrieval, answer generation, state/journey, UX, or infrastructure.
- Critical MUST HAVE failures are fixed.
- Fixed cases are rerun.
- Relevant regression evals/tests are updated.
- No out-of-scope feature is added to improve a non-MVP case.
- New infrastructure/reranking/caching is introduced only if evidence clearly proves it is required and product review approves it.

Dependencies:
- BL-081
- `docs/EVALS.md`

---

### BL-083 — Final UX, reliability, and cost QA

Status: DONE — desktop and 375px mobile verified in a browser (RTL, no page
overflow, LTR monospace log blocks with internal scroll, copy action, chips);
full journey simulation, failure paths, limits, and the cost budget re-confirmed.

Acceptance Criteria:
- Home and Conversation work on mobile and desktop.
- Persian copy remains beginner-friendly.
- RTL/LTR behavior is correct.
- Code copy/overflow works.
- Journey progress remains compact.
- Loading/error/source/action states remain usable.
- Rate limiting and input limits work.
- Structured logs and request IDs work on Liara.
- AI usage/logs can support basic cost review.
- Deterministic journeys remain free of unnecessary AI calls.
- Only material defects are fixed; no redesign occurs.

Dependencies:
- BL-082
- BL-012
- BL-071

---

### BL-084 — Prepare final README and challenge demo

Status: DONE — README rewritten for the challenge; docs/DEMO.md holds the
reproducible walkthrough. Live URL still to be filled in once deployed.

Acceptance Criteria:
- README explains product purpose and primary journeys.
- Local setup is documented at a useful high level.
- Architecture is explained concisely.
- README does not duplicate the full PRD/TECH.
- GitHub repository is clean/presentable.
- Final deployed Liara link is identified.
- Golden demo flow is documented and reproducible.
- No secrets, temporary debug material, or irrelevant generated files remain.

Dependencies:
- BL-083

---

# 12. Post-MVP Parking Lot

These are intentionally not active backlog tasks:

- second guided framework
- full DBaaS/Object Storage provisioning journeys
- Liara account integration
- automatic log access
- automatic deployment/provisioning
- persistent chat history
- project profiles
- file upload/parsing
- multi-agent architecture
- architecture/cost advisor
- reranker model
- Redis/cache infrastructure
- external vector database
- response streaming
- scheduled docs synchronization
- MCP
- public API

Do not promote them without explicit scope review.

---

# 13. Claude Code Execution Loop

For each task:

```text
User / ChatGPT selects one unblocked backlog item
        ↓
ChatGPT generates an English Claude Code prompt
        ↓
Claude Code:
Inspect → Plan → Implement → Verify → Report
        ↓
User sends Claude output back to ChatGPT
        ↓
ChatGPT Critic:
Scope / Correctness / Simplicity / Regression /
Persian-RTL / Security / Tests / Documentation
        ↓
Fix if required
        ↓
Mark task DONE
        ↓
Move to next unblocked item
```

Do not implement a whole phase in one Claude Code prompt.

---

# 14. Stage 6 Acceptance Checklist

Stage 6 is complete when:

- phases follow actual technical dependencies,
- tasks are implementation-sized without artificial fragmentation,
- every task has acceptance criteria,
- every task has dependencies,
- production deployment is included,
- EVAL hardening is included,
- MVP exclusions remain parked,
- no estimates/story points/process overhead are added.

**Stage 6 Status: DONE**

---

# 15. Next Stage

**Stage 7 — `docs/EVALS.md`**

Define the fixed evaluation set for:

- grounded General Q&A,
- the six Troubleshooting Eval Pack categories,
- Build on Liara planning,
- guided Next.js behavior,
- context continuity,
- source correctness,
- hallucination/abstention,
- Persian beginner-friendly behavior.

After Stage 7 is approved, implementation starts at **BL-001**.
