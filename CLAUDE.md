# CLAUDE.md — Liara AI Assistant

## 1. Purpose

This file defines the permanent working rules for Claude Code on the Liara AI Assistant MVP.

The project must remain:
- MVP-focused
- Simple
- Testable
- Persian and RTL-first at the product layer
- Grounded in Liara documentation
- Easy to deploy and maintain on Liara
- Resistant to unnecessary abstractions and overengineering

When there is a conflict between implementation convenience and the frozen MVP scope, preserve the MVP scope.

---

## 2. Source of Truth

Before making product or architecture decisions, use the project documents in this order:

1. `docs/MVP.md` — frozen MVP scope and product thesis
2. `docs/PRD.md` — product behavior, user journeys, requirements, and acceptance criteria
3. `docs/TECH.md` — approved technical architecture and stack
4. `docs/BACKLOG.md` — implementation order and task status
5. `docs/EVALS.md` — required AI/product quality behavior
6. `docs/DEPLOYMENT.md` — production deployment requirements
7. `docs/DEVLOG.md` — meaningful implementation history and decisions
8. `docs/LIO_CHARACTER_GUIDE.md`, `docs/LIO_SYSTEM_PROMPT.md`,
   `docs/LIO_UI_AND_ANIMATION.md`, `docs/LIO_IMPLEMENTATION_SPEC.md` — the
   assistant's product identity (Lio / لیو): personality, tone, microcopy, and
   mascot usage. Personality layers on top of the grounding rules and never
   relaxes them.

Do not invent product requirements that are not supported by these documents.

If a requested implementation conflicts with the frozen MVP or PRD, report the conflict before expanding scope.

Do not silently modify the product scope.

---

## 3. Product Context

The product is a beginner-first Persian AI support assistant for Liara.

The root problem is not lack of documentation.

The root problem is the gap between:
- the user's goal, error, or current situation
- Liara's service-oriented documentation structure

The product should translate:

**user situation → relevant context → correct next action**

rather than acting only as:

**question → documentation answer**

Liara documentation is the knowledge and correctness layer, not the main user experience.

---

## 4. Frozen MVP Scope

The active frozen MVP is **MVP v1.1**.

The product has one assistant with three behaviors.

### 4.1 Troubleshoot My Problem

The user may paste:
- errors
- logs
- stack traces
- build output
- text-based configuration snippets

The assistant should:
1. Understand the likely context.
2. Ask only a necessary clarifying question.
3. Retrieve relevant Liara documentation.
4. Explain the likely issue in beginner-friendly Persian.
5. Give one concrete fix or next diagnostic action.
6. Provide a source.
7. Ask for the result or next relevant output.

The product may accept broad troubleshooting input, but guaranteed MVP quality is limited to the Troubleshooting Eval Pack in `docs/EVALS.md`.

Do not create separate troubleshooting systems for every framework or service.

### 4.2 Build on Liara + Guided Deployment

The supported application framework for the frozen MVP is:

**Next.js → Liara**

Before deployment guidance, the assistant should perform a lightweight **Build on Liara** planning step:

1. Understand the minimum needs of the user's supported project.
2. Recommend only Liara services that are actually required.
3. Produce a minimal ordered deployment plan.
4. Explain non-obvious service recommendations.
5. Guide the user through the plan one actionable step at a time.

Related Liara services such as DBaaS or Object Storage may be recommended when the user's supported Next.js project genuinely needs them.

Build on Liara is **not**:
- a general cloud architecture advisor
- a cost estimator
- an infrastructure optimizer
- an automatic provisioner

The assistant does not:
- connect to the user's Liara account
- provision services automatically
- deploy automatically
- independently verify deployment through Liara APIs

Deployment completion is based on the user's reported result or pasted successful output.

### 4.3 General Liara Question

The assistant should answer normal Liara questions using retrieved documentation and provide a concise grounded answer with a source.

This is required baseline behavior, but it is not the primary product story.

---

## 5. Explicitly Out of MVP

Do not implement any of the following unless the scope is explicitly reopened:

- Multi-agent architecture
- Agent orchestration frameworks
- Liara account connection
- Automatic access to user logs through Liara API
- Automatic deployment execution
- Automatic infrastructure modification
- Persistent project profile
- Cross-session project memory
- Visual journey-builder subsystem
- CLI finder mode
- Migration translator
- General architecture/cost advisor
- MCP integration
- Public developer API
- File-upload and file-parsing subsystem
- Fine-tuning on Liara documentation
- Broad support for every Liara service or framework
- Complex recommendation engine

A good idea is not automatically an MVP requirement.

---

## 6. Simplicity Rules

These rules are mandatory.

### 6.1 Use the simplest implementation that satisfies the current requirement

Prefer:
- one assistant over multiple agents
- explicit state over orchestration frameworks
- small functions over premature abstraction
- direct application logic over unnecessary layers
- measured optimization over speculative optimization

### 6.2 Do not introduce unnecessary architecture

Do not introduce new:
- services
- agents
- queues
- event buses
- service layers
- repositories
- frameworks
- infrastructure components
- caching systems
- background workers
- dependencies
- abstractions

unless the current approved requirement clearly needs them.

### 6.3 Do not design for hypothetical scale

Build for the challenge MVP and production-quality demo.

Do not solve problems that have not appeared in:
- PRD requirements
- EVALS
- deployment requirements
- observed implementation constraints

### 6.4 Do not refactor unrelated code

A task should change the smallest reasonable surface area.

Preserve existing working behavior.

Do not perform opportunistic rewrites unless they are necessary to complete the task safely.

---

## 7. Approved Technical Stack

The approved MVP technical design is owned by `docs/TECH.md`.

Current stack:

- Next.js App Router
- TypeScript + React
- Tailwind CSS v4 + shadcn/ui with RTL mode enabled
- Next.js Route Handlers for backend endpoints
- Liara AI API for chat completions and embeddings
- Vercel AI SDK (`ai`, `@ai-sdk/react`) as the AI client layer, reaching Liara through its OpenAI-compatible provider
- Liara PostgreSQL DBaaS
- pgvector extension
- `pg` Node PostgreSQL client
- Vitest for focused logic/integration tests

Infrastructure is limited to:

1. one Liara PaaS Next.js application
2. one Liara PostgreSQL DBaaS instance with pgvector
3. one Liara AI workspace/API key

Architecture rules:

- no Redis initially
- no external vector database
- no separate backend service
- no LangChain/LlamaIndex/agent framework
- no persistent conversation database
- no authentication in MVP
- no streaming response requirement initially
- no reranker initially
- no ANN vector index unless measured latency requires it

Model IDs remain environment-configurable and must be verified against Liara's current catalog.

Treat these choices as the approved baseline, not as an obstacle to a materially simpler implementation.

You may revise a baseline technical choice after inspecting the actual repository when all of the following are true:

- the alternative is clearly simpler, faster to ship, or removes unnecessary duplication,
- it still satisfies the frozen MVP/PRD/EVALS,
- it does not add speculative infrastructure or product scope,
- the repository already contains a partially adopted tool/library that makes the alternative materially more efficient, or the baseline choice is clearly unnecessary,
- you explain the reason and tradeoff,
- you update `docs/TECH.md` and any other owning documentation in the same change so code and docs remain consistent.

Do not change architecture merely for preference, novelty, or elegance.

---

## 8. Repository Structure

The documentation structure is:

```text
/
├── CLAUDE.md
├── README.md
│
└── docs/
    ├── MVP.md
    ├── PRD.md
    ├── TECH.md
    ├── BACKLOG.md
    ├── EVALS.md
    ├── DEVLOG.md
    └── DEPLOYMENT.md
```

`docs/DEVLOG.md` and `docs/DEPLOYMENT.md` do not exist yet. Create each one when
there is something real to record in it.

Application code lives at the repository root — `app/`, `components/`, `lib/` —
not under `src/`. The `@/*` TypeScript alias resolves to the repository root.
`docs/TECH.md` section 31 owns the full code layout.

Secrets are read only through `lib/server/env.ts`, which is marked
`import "server-only"`. Never read `process.env` for a secret anywhere else, and
never give a secret a `NEXT_PUBLIC_` name.

Tests sit next to the module they cover as `*.test.ts`.

Do not create a large folder hierarchy before it is required.

---

## 9. Development Commands

The approved stack is defined in `docs/TECH.md`.

Once the application is scaffolded, the repository must maintain a small, stable command surface equivalent to:

```text
npm install
npm run dev
npm run lint
npm test
npm run build
```

After the documentation indexer is implemented:

```text
npm run docs:index
```

Use the actual `package.json` scripts as the source of truth once they exist.

Do not create duplicate commands or tooling aliases without a concrete need.

If type-checking is not already covered by the build/lint setup and proves useful, add one explicit type-check command rather than another toolchain.

---

## 10. Standard Task Execution

Unless a prompt explicitly requires a different approach, use this sequence.

### 10.1 Inspect

Before editing:
- read the relevant project docs
- inspect the existing implementation
- identify the smallest affected surface
- identify relevant tests

Do not assume the repository structure or existing behavior.

### 10.2 Plan

Provide a short implementation plan.

The plan should:
- stay inside the task scope
- identify files likely to change
- identify tests or verification steps
- avoid speculative future work

Do not turn the plan into a redesign proposal.

### 10.3 Implement

Implement only the requested behavior.

Requirements:
- preserve unrelated behavior
- use existing patterns where reasonable
- avoid new dependencies unless required
- keep code readable
- prefer explicitness over cleverness

### 10.4 Verify

Run the relevant available verification:
- tests
- lint
- type-check
- build
- targeted manual verification when automated coverage is unavailable

Do not claim success without verification.

If verification cannot be run, state exactly why.

### 10.5 Report

At the end, report:

1. What changed
2. Files changed
3. Verification performed
4. Any unresolved issue
5. Documentation updated, if applicable

Keep the report concise and factual.

---

## 11. AI Behavior Rules

### 11.1 Ground important technical answers

Important operational claims should be grounded in Liara documentation.

Do not invent:
- configuration fields
- commands
- environment variables
- versions
- ports
- service capabilities
- platform behavior

If evidence is insufficient, the assistant should say so.

### 11.2 Retrieval must support technical exactness

The final retrieval design must support:
- natural-language meaning
- exact technical terms such as error names, filenames, commands, and config keys

How this is implemented belongs in `docs/TECH.md`.

### 11.3 Minimize unnecessary LLM work

Avoid:
- redundant model calls
- unnecessary agent loops
- excessive context
- repeated retrieval when existing conversation evidence is sufficient

Prefer deterministic application logic for deterministic tasks.

### 11.4 Preserve conversation context

Within the active conversation, retain relevant user-provided context such as:
- framework
- relevant framework version
- database choice
- required Liara services
- current deployment step
- previous error
- previous attempted fix
- user-confirmed result

Do not ask again for information already available in the current conversation.

Do not implement cross-session memory for the MVP.

---

## 12. Guided Journey Rules

When the user is inside a procedural journey:

- Give one actionable step at a time.
- Keep the current goal and step visible in state.
- Allow side questions without losing journey state.
- If an error occurs, temporarily enter troubleshooting.
- After the error is resolved, return to the original journey.
- Do not dump a long documentation procedure into one message.

For Build on Liara:

- Recommend the minimum required Liara services.
- Do not recommend a service without a concrete project need.
- Keep the plan small.
- Do not turn the flow into broad infrastructure consulting.

---

## 13. Persian and RTL Requirements

The product is Persian and RTL-first.

### 13.1 Language

User-facing:
- UI text: Persian
- AI responses: Persian

Engineering:
- source code identifiers: English
- code comments: English
- technical documentation: English
- Claude Code prompts: English
- technical logs/messages: English unless they are user-facing

### 13.2 Beginner-first writing

Prefer user language over platform jargon.

For example, prefer:

> پروژه‌م رو آنلاین کنم

over:

> Deploy Application

when speaking to a beginner.

Use technical terms when necessary, but explain them naturally.

### 13.3 RTL implementation

Verify:
- Persian text uses RTL correctly
- layout works RTL-first
- code blocks remain LTR
- terminal commands remain LTR
- URLs remain LTR
- mixed Persian/English text remains readable
- numbers and punctuation remain readable
- mobile layout works in RTL

Do not consider RTL complete merely because `dir="rtl"` was added.

---

## 14. UI Rules

The UI should optimize for task completion, not feature discovery.

Primary entry points should emphasize:

- **یه مشکلی برای پروژه‌م پیش اومده**
- **می‌خوام پروژه‌م رو آنلاین کنم**

A general input should remain available for Liara questions and pasted errors.

UI principles:
- simple
- low cognitive load
- clear current step
- clear next action
- readable code
- concise sources
- useful loading states
- useful error states
- responsive
- accessible enough for normal keyboard/mobile use

Do not build dashboard complexity unless the PRD explicitly requires it.

---

## 15. Security Rules

At minimum:

- Never expose API keys or secrets to the client unnecessarily.
- Store secrets in environment variables or approved secret configuration.
- Never commit secrets.
- Validate and bound user input where appropriate.
- Apply rate limiting as defined in the technical design.
- Bound log/config text sizes to avoid uncontrolled token usage.
- Do not execute user-provided code, shell commands, or configuration.
- Treat pasted logs/configs as untrusted input.
- Avoid logging sensitive user content unless explicitly required and safely handled.
- Return safe user-facing errors without exposing internal stack traces.

Security should be appropriate for an MVP, not a reason to add unnecessary infrastructure.

---

## 16. Cost and Token Rules

The challenge explicitly evaluates cost efficiency.

Therefore:

- Keep retrieved context small and relevant.
- Avoid sending full documentation pages when small passages are sufficient.
- Avoid duplicate retrieval/model requests.
- Use deterministic intent/state logic when appropriate.
- Add caching only after a measured repeated-work case justifies it.
- Do not add complex model routing until `TECH.md` or EVALS justify it.
- Track token/cost behavior when the chosen stack supports it.

Optimize for the combination of:
- correctness
- latency
- cost

not cost alone.

---

## 17. Testing Requirements

Testing depth should match the feature risk.

At minimum, verify:

### Product behavior
- intent behavior
- guided Next.js journey
- Build on Liara planning
- troubleshooting behavior
- conversation continuity
- uncertainty behavior
- source rendering

### AI quality
Use `docs/EVALS.md`.

Do not judge AI quality only by manually trying a few friendly prompts.

### UI
Verify:
- Persian
- RTL
- LTR code blocks
- responsive behavior
- loading state
- error state

### Regression
Run existing relevant tests before declaring a task complete.

Do not create a huge testing framework before the actual application requires it.

---

## 18. Documentation Rules

Documentation must remain small and useful.

### `docs/MVP.md`

Update only when:
- MVP scope changes explicitly
- a frozen product decision changes
- a core capability or non-goal changes

Do not modify frozen scope as part of ordinary implementation work.

### `docs/PRD.md`

Update when:
- product behavior changes
- a user journey changes
- acceptance criteria change
- a required edge/error state changes

### `docs/TECH.md`

Update when:
- stack changes
- architecture changes
- data model changes materially
- retrieval design changes materially
- infrastructure/security/monitoring design changes materially
- a significant technical decision is made

### `docs/BACKLOG.md`

Update when:
- task scope/order changes materially
- status changes among TODO / IN PROGRESS / BLOCKED / DONE
- acceptance criteria or dependency changes

Do not turn BACKLOG into a detailed activity log.

### `docs/EVALS.md`

Update when:
- a required evaluation is added/changed
- a production AI failure should become a regression test
- expected behavior or pass/fail criteria changes

### `docs/DEVLOG.md`

Update only for meaningful:
- implementation milestones
- technical decisions
- blockers
- resolved problems
- next major step

Do not log trivial file edits or every command.

### `docs/DEPLOYMENT.md`

Update when:
- environment variables change
- Liara services change
- build/start/deployment procedure changes
- production health/monitoring behavior changes
- a production-specific failure mode is discovered

### `README.md`

Keep focused on:
- what the project is
- how to run it
- how to deploy/use it at a high level
- final demo/repository information

Do not duplicate the full MVP, PRD, or technical design in README.

---

## 19. Documentation Discipline

Use these rules for every task:

1. First ask: **Did this task materially change documented behavior, architecture, scope, evals, deployment, or backlog status?**
2. If no, do not edit documentation.
3. If yes, edit only the owning document.
4. Do not duplicate the same decision across multiple documents unless one document needs a short reference.
5. Prefer updating an existing section over creating a new document.
6. Do not create new permanent documentation files without a concrete need.

The documentation system exists to preserve decisions, not to record everything.

---

## 19.1 Repository Cleanup and Existing Tooling

The project directory may contain existing infrastructure files, experiments, generated files, partially installed dependencies, and setup work created before the current implementation phase.

Known examples include:

- shadcn/ui setup for frontend UI components,
- a partially installed Vercel AI SDK setup,
- other infrastructure/project setup files.

Before adding or replacing tooling:

1. inspect what is already present,
2. determine whether it helps the frozen MVP,
3. keep and finish it if it is the simplest useful path,
4. remove it if it is unused, conflicting, broken, or adds unnecessary complexity.

You may delete unnecessary project files and dependencies after inspection.

Do not delete the core product/source-of-truth documents (`CLAUDE.md`, `docs/MVP.md`, `docs/PRD.md`, `docs/TECH.md`, `docs/BACKLOG.md`, `docs/EVALS.md`) unless the user explicitly changes the documentation system.

You may add the files you genuinely need for the implementation.

---

## 20. Change Discipline

Before changing code, ask:

- Is this required by the current task?
- Is it inside the frozen MVP?
- Is there already a simpler implementation?
- Am I touching unrelated code?
- Am I adding a dependency or abstraction that can be avoided?
- Does this change require documentation or eval updates?

If an implementation reveals a better future idea, report it as an optional note.

Do not implement it unless requested.

---

## 21. Definition of Done

A task is DONE only when:

- The requested behavior works.
- Acceptance criteria are satisfied.
- Relevant edge cases are handled.
- Relevant tests/checks pass.
- Existing behavior is not unintentionally broken.
- Persian/RTL behavior is checked when applicable.
- No unnecessary complexity or scope was added.
- Relevant documentation is updated only if necessary.
- Unresolved problems are explicitly reported.

"Implementation completed" is not sufficient by itself.

---

## 22. Final Rule

When uncertain between a more sophisticated solution and a simpler solution that satisfies the current approved requirement:

> Choose the simpler solution.

When uncertain whether a new feature belongs in the MVP:

> Do not add it. Report it for product review.

---

## 23. Framework Agent Rules

Next.js maintains its own agent guidance in `AGENTS.md` at the repository root.

@AGENTS.md
