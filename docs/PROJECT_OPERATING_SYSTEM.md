# Liara AI Assistant — Project Operating System

## Purpose

This document defines the lightweight operating structure for building the Liara AI Assistant MVP with Claude Code.

The goal is to keep the project:
- Simple
- MVP-focused
- Testable
- Well-documented
- Easy to continue iteratively
- Resistant to unnecessary complexity and overengineering

This structure should remain stable throughout the project unless there is a strong, explicit reason to change it.

---

# 1. Product Development Flow

The project follows this sequence:

Problem
→ MVP Definition
→ PRD
→ Scope Freeze
→ UX Flow
→ Technical Design
→ Backlog & Phases
→ Evals
→ Build
→ Critique
→ Fix / Verify
→ Production Hardening
→ Deploy on Liara
→ Final Evaluation & Demo

---

# 2. Core Project Documents

The documentation structure should remain intentionally small.

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

## 2.1 `docs/MVP.md`

Purpose: define **why the product exists and what the MVP is**.

It should contain:

- Challenge
- Target users
- Root problem
- Product thesis
- MVP definition
- Core user experience
- Golden journeys
- Core capabilities
- Non-goals
- AI behavior
- Knowledge strategy
- UX principles
- Success criteria
- Challenge judging alignment
- Risks and assumptions
- Current decisions
- Open questions

This is the main product source of truth.

---

## 2.2 `docs/PRD.md`

Purpose: define **how the product should behave**.

It should contain:

- Product goals
- User stories
- Functional requirements
- User journeys
- UX flows
- AI behavior requirements
- Error states
- Edge cases
- Acceptance criteria
- MVP scope

The PRD should be detailed enough that implementation tasks can be derived from it without inventing product behavior during development.

---

## 2.3 `docs/TECH.md`

Purpose: define **how the MVP is implemented technically**.

It should contain only necessary technical decisions, including:

- Tech stack
- High-level architecture
- AI / LLM architecture
- RAG / retrieval design
- Conversation state
- Data model
- API structure
- Security
- Rate limiting
- Token and cost controls
- Caching
- Logging
- Monitoring
- Infrastructure
- Important technical decisions

Principle:

> Use the simplest architecture that satisfies the PRD.

Do not design for hypothetical scale before MVP requirements justify it.

---

## 2.4 `docs/BACKLOG.md`

Purpose: define **what should be built and in what order**.

Each item should include only:

- Task
- Status
- Acceptance criteria
- Dependencies, if any

Recommended status values:

- TODO
- IN PROGRESS
- BLOCKED
- DONE

Avoid unnecessary project-management overhead.

---

## 2.5 `docs/EVALS.md`

Purpose: define **how AI quality and product behavior are tested**.

Each evaluation should contain:

- Eval ID
- User input
- Context
- Expected behavior
- Pass criteria
- Fail criteria

Evaluation categories should eventually include:

- Simple questions
- Ambiguous questions
- Guided deployment
- Troubleshooting
- Multi-step conversations
- Missing information
- Hallucination traps
- Unsupported requests
- Source / citation correctness
- Beginner-friendly Persian behavior

This document is especially important because response quality is the largest judging category.

---

## 2.6 `docs/DEVLOG.md`

Purpose: record only **meaningful implementation progress and decisions**.

Recommended format:

```text
## YYYY-MM-DD

### Implemented
...

### Decisions
...

### Problems
...

### Next
...
```

Do not log trivial code changes.

---

## 2.7 `docs/DEPLOYMENT.md`

Purpose: define **how the project runs in production on Liara**.

It should eventually contain:

- Required Liara services
- Environment variables
- Secrets
- Build process
- Deployment process
- Database configuration
- Health checks
- Logging
- Monitoring
- Production verification
- Rollback / failure notes if needed

---

## 2.8 `CLAUDE.md`

Purpose: give Claude Code the project's permanent implementation rules.

It should remain concise and operational.

Recommended sections:

- Product Context
- MVP Scope
- Tech Stack
- Repository Structure
- Development Commands
- Implementation Principles
- Simplicity Rules
- Persian / RTL Requirements
- UI Standards
- AI Implementation Rules
- Security Rules
- Testing Requirements
- Documentation Rules
- Change Discipline
- Definition of Done

A core rule:

> Do not introduce new abstractions, services, agents, libraries, infrastructure components, or architectural patterns unless they are required by the current task.

Another core rule:

> Do not modify unrelated parts of the codebase.

---

# 3. MVP Scope Discipline

Before implementation begins, the PRD must produce three explicit lists:

## MUST HAVE

Required for the challenge MVP.

## SHOULD HAVE

Useful only if the core MVP is stable.

## NOT IN MVP

Explicitly excluded from the current challenge scope.

Any new idea discovered during implementation should be checked against these lists before being added.

Good ideas that are not required should move to post-MVP instead of expanding the active scope.

---

# 4. Definition of Done

A task is DONE only when:

- The feature works as intended.
- Acceptance criteria are satisfied.
- Relevant edge cases are handled.
- Relevant tests pass.
- Existing behavior is not unintentionally broken.
- Persian / RTL behavior is checked when applicable.
- No unnecessary scope or complexity was introduced.
- Documentation is updated if the change affects documented behavior or architecture.

"Implementation completed" is not enough by itself.

---

# 5. Claude Code Collaboration Workflow

The user communicates requirements to ChatGPT in Persian.

ChatGPT acts as:

1. Product Manager
2. Prompt Engineer
3. Structured Critic

Claude Code acts as:

1. Codebase inspector
2. Implementer
3. Tester
4. Technical executor

The workflow is:

```text
User
↓
Requirement / idea in Persian

ChatGPT — PM Mode
↓
Analyze product impact
Clarify internally when possible
Map requirement to MVP / PRD / backlog
Generate English Claude Code prompt

Claude Code
↓
Inspect
Plan
Implement
Verify
Report

User
↓
Send Claude Code output back to ChatGPT

ChatGPT — Critic Mode
↓
Review implementation
Detect real issues
Reject unnecessary complexity
Generate next English Claude Code prompt

Claude Code
↓
Fix / continue / verify
```

Repeat until the task passes.

---

# 6. Standard Claude Code Prompt Shape

Unless a task requires otherwise, implementation prompts should follow:

```text
1. Inspect
2. Plan
3. Implement
4. Verify
```

Typical constraints:

- Do not modify unrelated parts of the codebase.
- Do not introduce unnecessary abstractions.
- Preserve existing working behavior.
- Prefer the simplest implementation that satisfies the requirement.
- Run relevant tests after implementation.
- Update documentation only when the change materially affects it.
- Report exactly what changed.
- Report any unresolved issue explicitly.

---

# 7. Critic System

ChatGPT should review Claude Code output using the following dimensions:

1. Scope Alignment
2. Functional Correctness
3. Simplicity
4. Architecture Consistency
5. UX / Persian / RTL
6. Security
7. Testing
8. Documentation

The critic must not create work merely to make the codebase look more sophisticated.

Unnecessary additions such as:
- New service layers
- Microservices
- Agent orchestration frameworks
- Event-driven architecture
- New infrastructure
- New abstractions
- Additional dependencies

should be rejected unless they solve a concrete current requirement.

## Standard Critic Output

```text
Verdict:
PASS / PASS WITH FIXES / FAIL

Critical Issues:
Only issues that materially require correction.

Non-Critical Notes:
Useful but optional observations.

Scope Check:
Did Claude implement more than requested?

Complexity Check:
Was unnecessary complexity added?

Regression Risk:
What existing behavior may have been affected?

Documentation Impact:
Which project docs need an update, if any?

Next Action:
The exact next step.

Next Claude Code Prompt:
The next implementation prompt in English.
```

---

# 8. Language Contract

## User ↔ ChatGPT

Persian.

## ChatGPT → Claude Code

English only.

## Technical documentation

English.

## Code

English identifiers.

## Code comments

English.

## Technical messages / commit messages

English.

## Product UI

Persian.

## AI user-facing responses

Persian.

## Layout

RTL-first.

Special handling:

- Persian UI text: RTL
- Code blocks: LTR
- Terminal commands: LTR
- URLs: LTR
- Mixed Persian / English content must remain readable
- Responsive behavior must be verified in RTL

---

# 9. Product Principles

The MVP is for beginner Liara users.

Therefore:

- Optimize for task completion, not documentation browsing.
- Prefer step-by-step guidance over long explanations.
- Avoid unnecessary technical jargon.
- Ask only necessary clarifying questions.
- Keep the user in the current task flow.
- Do not reset progress when the user asks a side question.
- Use Liara documentation primarily as the knowledge and correctness layer.
- Sources should support trust, not dominate the experience.
- The assistant should admit uncertainty instead of hallucinating.

---

# 10. Architecture Principles

For the MVP:

- Prefer one capable assistant over multiple agents.
- Prefer explicit state over complicated orchestration.
- Prefer simple functions over frameworks when possible.
- Prefer RAG over fine-tuning for Liara documentation.
- Do not integrate Liara account access until the MVP clearly needs it.
- Do not automatically execute destructive or sensitive actions.
- Cost control and token usage should be considered from the start.
- Production concerns should be added when they become relevant, not prematurely.

---

# 11. Initial Product Phases

These are provisional until the PRD is finalized.

## Phase 0 — Project Foundation

- Repository
- Documentation
- CLAUDE.md
- Base stack
- Environment
- Deployment skeleton

## Phase 1 — Core Conversation

- Conversation UI
- Chat API
- Model integration
- Conversation context

## Phase 2 — Liara Knowledge

- Documentation ingestion
- Chunking
- Retrieval
- Citation
- Basic RAG
- Hallucination protection

## Phase 3 — Guided Deployment

Start with one excellent golden journey before expanding.

Candidate:

Next.js → Liara

## Phase 4 — Troubleshooting

Error
→ Diagnose
→ Explain
→ Fix
→ Verify

## Phase 5 — Additional Guided Journey

Database setup / connection.

## Phase 6 — UX & Quality

- Persian UX
- RTL
- Mobile
- Code blocks
- Loading states
- Error states
- Conversation continuity

## Phase 7 — Production

- Rate limiting
- Token limits
- Logging
- Monitoring
- Cache if necessary
- Security
- Liara deployment

## Phase 8 — Evaluation & Demo

- Eval suite
- Fix failures
- Golden demo flow
- README
- GitHub
- Final deployed version

---

# 12. Demo Strategy

The final demo should tell a complete user story rather than showing disconnected features.

Example:

A beginner has a Next.js project and wants to put it online.

The assistant:

1. Understands the user's goal.
2. Avoids requiring the user to know the term "deploy".
3. Starts a guided journey.
4. Gives one actionable step at a time.
5. Handles an error without losing context.
6. Helps the user continue.
7. Reaches successful deployment.
8. Can still answer a general Liara question with a reliable source.

The demo scenario should be maintained and improved throughout development, not created only at the end.

---

# 13. Documentation Update Policy

Do not update every document after every small code change.

Update documentation only when a meaningful change affects:

- MVP scope
- Product behavior
- Technical architecture
- Backlog status
- Evaluation criteria
- Deployment
- Important implementation decisions

The documentation system must support development, not slow it down.

---

# 14. Current Working Order

The agreed execution order is:

1. Complete `docs/MVP.md`
2. Create `CLAUDE.md` and finalize documentation rules
3. Convert MVP into `docs/PRD.md`
4. Freeze MVP scope and define UX flows
5. Define lean technical design in `docs/TECH.md`
6. Build phases and `docs/BACKLOG.md`
7. Define `docs/EVALS.md` and golden test cases
8. Start implementation with Claude Code
9. Run Build → Critic → Fix → Verify loops
10. Production hardening and Liara deployment
11. Final evaluation, demo, README, and GitHub delivery

---

# 15. Change Control

This operating structure is intentionally stable.

Change it only when:

- A real project problem cannot be solved within the current structure.
- The change clearly reduces risk or complexity.
- The benefit is concrete and immediate.

Do not change the process merely because another structure is more sophisticated.

---

# 16. Documentation Standard

This section defines the permanent documentation ownership rules for the project.

The goal is not to document every action. The goal is to ensure that important product, technical, evaluation, and deployment decisions always have one clear home.

## 16.1 One Decision, One Owner

Every meaningful decision should have one primary document.

| Information | Owning document |
|---|---|
| Why the product exists, frozen scope, capabilities, non-goals | `docs/MVP.md` |
| User behavior, journeys, requirements, acceptance criteria | `docs/PRD.md` |
| Stack, architecture, AI/RAG design, state, security, infrastructure | `docs/TECH.md` |
| Tasks, status, dependencies, implementation order | `docs/BACKLOG.md` |
| AI/product test cases, expected behavior, pass/fail rules | `docs/EVALS.md` |
| Meaningful implementation milestones, blockers, decisions | `docs/DEVLOG.md` |
| Liara production setup, env vars, build/deploy/runbook | `docs/DEPLOYMENT.md` |
| Permanent Claude Code working rules | `CLAUDE.md` |
| High-level project setup and public repository usage | `README.md` |

Do not duplicate full decisions across multiple files.

When another document needs the information, reference the owning document or repeat only the minimum necessary summary.

## 16.2 What Must Be Documented

Document a change when it materially affects one of these:

- MVP scope
- Product behavior
- User journey
- Acceptance criteria
- Technical architecture
- Tech stack
- Retrieval/LLM behavior
- Data/state model
- Security
- Rate limiting
- Cost/token controls
- Monitoring
- Infrastructure
- Backlog status or dependency
- Evaluation criteria
- Production deployment
- Important implementation decision
- Meaningful blocker or resolved incident

## 16.3 What Should Not Be Documented

Do not permanently document:

- trivial file edits
- formatting-only changes
- every shell command
- obvious implementation details visible directly in code
- temporary debugging attempts with no lasting impact
- speculative future architecture
- ideas that are outside the MVP unless they materially affect planning

## 16.4 Documentation Update Trigger

After each meaningful implementation task, ask:

> Did this task change scope, behavior, architecture, backlog status, evals, deployment, or an important technical decision?

If the answer is **no**, do not edit project documentation.

If the answer is **yes**, update only the owning document.

## 16.5 DEVLOG Standard

Use `docs/DEVLOG.md` only for meaningful milestones.

Format:

```text
## YYYY-MM-DD

### Implemented
- Meaningful completed capability or milestone

### Decisions
- Important decision made and why

### Problems
- Material blocker or issue, if any

### Next
- Next meaningful project step
```

Do not write a diary of every coding action.

## 16.6 Technical Decision Standard

Important technical decisions belong in `docs/TECH.md`.

For a meaningful non-obvious decision, record:

```text
### Decision: <short title>

Context:
Why a decision was needed.

Decision:
What was chosen.

Reason:
Why this is the simplest appropriate choice for the MVP.

Tradeoff:
The important limitation accepted.

Revisit when:
The concrete condition that would justify reconsidering it.
```

Do not create a separate ADR system for the MVP.

## 16.7 Backlog Standard

Each backlog item should contain only:

```text
### <Task ID> — <Task title>

Status: TODO | IN PROGRESS | BLOCKED | DONE

Acceptance Criteria:
- ...

Dependencies:
- None
```

Add dependencies only when real.

Do not add story points, estimates, epics, labels, or process fields unless they become genuinely useful.

## 16.8 Eval Standard

Each eval should use:

```text
### EVAL-XXX — <scenario>

Category:
...

User Input:
...

Context:
...

Expected Behavior:
- ...

Pass:
- ...

Fail:
- ...
```

When an AI behavior fails in a meaningful way and is fixed, consider adding it as a regression eval.

## 16.9 Documentation Language

All technical/project documentation is written in English.

The product remains Persian and RTL-first.

Persian text may appear in documentation when it is:
- an exact UI label
- an example user message
- an example assistant response
- necessary for an RTL/Persian acceptance criterion

## 16.10 Documentation File Creation Rule

Prefer updating existing documents.

Do not create new permanent documentation files unless:

1. the information does not fit an existing owner document,
2. it will be maintained throughout the project,
3. creating it reduces confusion rather than increasing process overhead.

The default answer to "should we create another project document?" is **no**.

---

# 17. Stage Status

- Stage 1 — MVP Definition: **DONE**
- Stage 2 — Claude Code Rules & Documentation Standard: **DONE**
- Stage 3 — PRD: **DONE**
- Stage 4 — Scope Confirmation & UX Flow: **DONE**
- Stage 5 — Lean Technical Design: **DONE**
- Stage 6 — Phases & Backlog: **DONE**
- Stage 7 — Evals & Golden Test Cases: **DONE**
- Stage 8 — Implementation with Claude Code: **IN PROGRESS — BL-001**
