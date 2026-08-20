# Liara AI Assistant — Product Requirements Document

## Document Status

**Version:** PRD v1  
**Status:** Approved for MVP planning  
**Product scope:** Liara AI Assistant MVP v1.1  
**Product language:** Persian, RTL-first  
**Engineering/documentation language:** English

This PRD defines product behavior only.

Technical stack, model selection, retrieval architecture, storage, caching, and infrastructure decisions belong in `docs/TECH.md`.

---

# 1. Product Summary

Liara AI Assistant is a beginner-first Persian assistant that helps users make progress on Liara without requiring them to understand Liara's documentation taxonomy first.

The product translates:

**user goal / error / situation → relevant Liara context → correct next action**

It is not primarily a documentation chatbot.

The MVP has one conversational assistant with three behaviors:

1. **Troubleshoot My Problem**
2. **Build on Liara + Guided Next.js Deployment**
3. **General Liara Q&A**

Liara documentation is the knowledge and correctness layer behind all three behaviors.

---

# 2. Product Objective

The MVP should reduce the effort required for a beginner to:

- understand what to do next after a technical error,
- understand which minimal Liara services a supported project needs,
- deploy a simple Next.js application to Liara through a guided CLI journey,
- ask a normal Liara question and receive a grounded answer.

The product should optimize for **task progress**, not documentation consumption.

---

# 3. Primary User

## 3.1 User Profile

The primary user is a beginner or relatively inexperienced Liara user who:

- understands their own project better than Liara's platform,
- may know their framework but not Liara service names,
- may not know the right keyword to search,
- prefers a concrete next action over a long explanation,
- often arrives with an error/log instead of a well-formed question.

## 3.2 Primary Jobs

### Job A — Fix a problem

> "Something failed. Tell me what it likely means and what I should do next."

### Job B — Put a project online

> "I have a Next.js project. Help me get it online on Liara."

### Job C — Understand what Liara services I need

> "I know what my app does, but I don't know which Liara services match those needs."

### Supporting Job — Ask a Liara question

> "Answer my question without making me search through documentation."

---

# 4. Product Principles

The following principles are requirements, not optional style preferences.

## 4.1 Beginner-first

Do not require the user to know Liara terminology before receiving help.

Prefer user language such as:

> پروژه‌م رو آنلاین کنم

over platform-first labels such as:

> Deploy Application

when user-facing.

## 4.2 One actionable step at a time

Inside procedural journeys, do not dump the full procedure in one response.

## 4.3 Grounded over confident

If reliable evidence is unavailable, the assistant must not invent operational details.

## 4.4 Minimum necessary questions

Ask a follow-up only when the answer materially changes the next action.

## 4.5 Preserve progress

A side question or temporary error must not reset the active journey.

## 4.6 Minimum required services

Build on Liara must recommend only services justified by the user's stated project needs.

## 4.7 One assistant

Different behaviors are modes of the same assistant, not separate user-facing agents.

---

# 5. MVP Scope

## 5.1 MUST HAVE

- Persian RTL-first UI
- One conversational assistant
- Free-text input
- Text paste for errors, logs, stack traces, commands, and config snippets
- Intent recognition for:
  - troubleshooting
  - guided Next.js deployment
  - general Liara question
- Liara documentation grounding
- Source citation
- Explicit uncertainty behavior
- Conversation-scoped context
- Build on Liara planning
- One guided deployment path:
  - **Next.js → Liara via Liara CLI**
- Troubleshooting within the same conversation
- Contextual next-action suggestions
- Responsive UI
- Safe user-facing failure states
- Rate limiting
- Secret safety
- Basic logging/monitoring
- Deployment of the product itself on Liara
- Core evaluation set

## 5.2 SHOULD HAVE

Only after MUST HAVE is stable:

- second guided application framework
- deeper database setup guidance
- richer project-context extraction from pasted text
- retrieval reranking improvements
- caching when justified by measurement

## 5.3 NOT IN MVP

- multi-agent architecture
- agent orchestration framework
- Liara account integration
- automatic reading of user Liara logs
- automatic deployment
- automatic service provisioning
- automatic infrastructure modification
- cross-session project memory
- persistent project profiles
- file upload/parsing subsystem
- general architecture consulting
- cost estimation
- CLI finder mode
- migration translator
- MCP
- public developer API
- fine-tuning on Liara docs
- broad guided deployment coverage across frameworks

---

# 6. Main Experience

## 6.1 Home

The home screen should emphasize two primary actions:

- **یه مشکلی برای پروژه‌م پیش اومده**
- **می‌خوام پروژه‌م رو آنلاین کنم**

A general input remains visible:

> **هر سؤال یا خطایی درباره لیارا داری اینجا بنویس...**

The user does not need to select a mode before typing.

The assistant should infer the likely intent when possible.

## 6.2 Conversation

All behaviors happen in one conversation surface.

The conversation may display lightweight structured elements such as:

- current journey/step
- deployment plan
- code/command blocks
- source cards
- next-action chips
- error/retry states

Do not create a separate dashboard for the MVP.

---

# 7. Intent Behavior

The product recognizes three top-level intents.

## INTENT-01 — Troubleshooting

Typical signals:

- multi-line logs
- stack trace
- explicit error code/message
- "خطا"
- "ارور"
- "کار نمی‌کنه"
- failed build/deploy output

Expected behavior:

Enter the troubleshooting flow.

## INTENT-02 — Deployment / Build on Liara

Typical signals:

- "می‌خوام پروژه‌م رو آنلاین کنم"
- "چطور پروژه Next رو روی لیارا ببرم؟"
- user describes a Next.js project and asks what Liara services are needed

Expected behavior:

Enter Build on Liara planning, then the guided deployment flow when applicable.

## INTENT-03 — General Question

Typical signals:

- conceptual question
- definition
- normal how-to question outside the active guided journey

Expected behavior:

Return a concise grounded answer with source.

## INTENT-04 — Ambiguous

If the user message could reasonably map to multiple materially different actions, ask one short clarifying question.

Do not ask the user to choose from technical internal modes unless necessary.

---

# 8. Functional Requirements — Troubleshooting

## FR-T01 — Accept troubleshooting text

The user can paste:

- error messages
- logs
- stack traces
- build output
- deployment output
- text configuration snippets

No file-upload system is required.

### Acceptance Criteria

- Multi-line text is accepted.
- Technical tokens remain readable.
- Code/log content renders LTR inside the Persian UI.

---

## FR-T02 — Identify useful context

The assistant should infer context supported by the pasted content, such as:

- Next.js / Node-related context
- likely deployment/build/runtime phase
- exact error token
- relevant Liara topic

The assistant must distinguish inference from confirmed facts.

### Acceptance Criteria

- The assistant does not claim a framework/version when evidence does not support it.
- Exact error strings are preserved during diagnosis.
- Already-known conversation context is reused.

---

## FR-T03 — Ask only necessary clarification

If one missing fact prevents a reliable next action, ask one focused question.

Examples:

- "این خطا موقع build رخ می‌ده یا بعد از بالا آمدن برنامه؟"
- "این پروژه Next.js هست؟"

### Acceptance Criteria

- The assistant does not ask generic questionnaires.
- It does not ask for facts already available in the conversation.
- If enough evidence exists, it proceeds without clarification.

---

## FR-T04 — Ground diagnosis

The assistant must use relevant Liara documentation to support operational diagnosis.

### Acceptance Criteria

- Important Liara-specific claims are grounded.
- A relevant source is shown.
- If no reliable source/evidence is found, the assistant says so rather than fabricating a fix.

---

## FR-T05 — Give one concrete next action

A troubleshooting response should prioritize:

1. likely cause,
2. one concrete fix or diagnostic action,
3. source,
4. next verification.

Do not provide a large list of speculative fixes unless the evidence genuinely requires alternatives.

### Acceptance Criteria

A successful response makes it obvious what the user should do next.

---

## FR-T06 — Verify outcome

After giving a fix, the assistant should request a simple result:

- **درست شد**
- **هنوز خطا دارم**
- **لاگ جدید رو می‌فرستم**

If a new log is provided, continue from the same context.

---

# 9. Troubleshooting Eval Pack — Product Boundary

The troubleshooting input remains broad.

However, MVP quality is explicitly evaluated against a small initial pack.

The exact prompts and expected answers will be written in `docs/EVALS.md`.

The PRD requires coverage for these six categories:

## TEP-01 — `ECONNRESET`

The assistant should recognize the exact technical token and retrieve the relevant Liara guidance.

Liara's current Next.js documentation contains a dedicated `ECONNRESET` common-error page.

## TEP-02 — Package/network/mirror failure

Example class:

- `npm ERR! network`
- dependency installation failure related to package access/mirror behavior

The assistant should connect the artifact to Liara's package/mirror guidance when supported.

## TEP-03 — Next.js project readiness

Examples:

- missing/invalid `package.json`
- missing required `start` behavior
- build/start script issue

The assistant should ground the response in the documented Next.js deployment requirements.

## TEP-04 — Liara deployment configuration issue

Examples:

- incorrect or suspicious `liara.json` configuration
- app/platform-related deployment configuration mismatch

The assistant should avoid inventing fields and use documentation evidence.

## TEP-05 — Ambiguous failure

The log is insufficient to choose a reliable fix.

Expected behavior:

Ask one high-value clarifying question rather than guessing.

## TEP-06 — Unsupported / undocumented detail

The user requests a detail that cannot be reliably established from the available Liara source.

Expected behavior:

Explicit uncertainty / abstention.

### Boundary

The MVP does not promise deep framework-specific troubleshooting outside this eval pack.

Other errors may still receive best-effort grounded answers.

---

# 10. Functional Requirements — Build on Liara

## FR-B01 — Understand project needs

For a supported Next.js deployment request, collect only the minimum project information required to plan.

Possible needs include:

- application framework
- database requirement
- persistent/user-uploaded file requirement
- relevant environment variables/external services

Do not ask about optional infrastructure that does not affect the plan.

---

## FR-B02 — Recommend minimum Liara services

The assistant should map needs to the smallest reasonable Liara service set.

Examples:

- Next.js app → Liara PaaS
- PostgreSQL requirement → Liara DBaaS PostgreSQL
- user-uploaded persistent files → Object Storage when appropriate

### Acceptance Criteria

- Every recommended service has a reason.
- Unnecessary services are not recommended.
- The assistant does not recommend services merely to make the architecture look complete.

---

## FR-B03 — Produce a simple deployment plan

Before step-by-step execution, show a short ordered plan.

Example:

```text
پلن پیشنهادی:
1. آماده‌بودن پروژه Next.js رو چک کنیم
2. برنامه Next.js رو در لیارا بسازیم
3. تنظیمات لازم رو آماده کنیم
4. پروژه رو Deploy کنیم
5. نتیجه Deploy رو بررسی کنیم
```

If the project requires related Liara services, mention them in the plan.

### Boundary

Build on Liara planning does not automatically provision those services.

Deep guided setup for DBaaS/Object Storage is not required for the first golden journey.

---

# 11. Guided Deployment Golden Journey

## 11.1 Supported Golden Path

The guaranteed guided deployment path is:

**Simple Next.js application → Liara CLI → user-confirmed successful deployment**

The baseline golden test project should not require DBaaS or Object Storage.

This keeps the first complete journey narrow and independently testable.

Build on Liara may still identify additional services for other project descriptions, but full guided provisioning of those services is not part of the golden path.

---

## 11.2 Why Liara CLI Is the Golden Method

Liara currently documents Console, CLI, and GitHub deployment methods for Next.js.

The MVP uses **Liara CLI** as the guided golden path because it:

- creates a deterministic step sequence,
- produces copyable commands,
- gives observable terminal output,
- allows errors to be pasted directly back into the assistant,
- is easier to evaluate consistently.

Console and GitHub deployment may still be answered through general Q&A.

They are not separate guided MVP journeys.

---

## 11.3 Next.js Deployment Journey

### STEP-D01 — Confirm supported project

Goal:

Confirm the project is a supported Next.js project and the user intends to deploy it to Liara.

Required context:

- framework = Next.js
- current goal = deploy

If the framework is not Next.js:

- explain that guided deployment in MVP currently supports Next.js only,
- offer a grounded general answer if documentation supports the other framework,
- do not pretend to start a supported guided journey.

---

### STEP-D02 — Check local project readiness

The assistant should verify only essential readiness evidence.

Required checks for the golden path:

- project has `package.json`
- appropriate Next.js build/start scripts exist
- project is not relying on uploading `node_modules`

The assistant may ask the user to paste only the relevant `package.json` section when necessary.

Do not require file upload.

---

### STEP-D03 — Build on Liara plan

For the simple golden project:

- recommend Liara PaaS Next.js application,
- no additional service is required unless the user describes a real need.

Show the minimal ordered plan.

---

### STEP-D04 — Ensure Liara CLI is available

Guide the user to install Liara CLI if needed.

Current Liara documentation uses:

```bash
npm install -g @liara/cli
```

If the user already has the CLI, do not repeat installation.

---

### STEP-D05 — Authenticate

Guide the user to authenticate using:

```bash
liara login
```

The assistant should wait for the user's reported result before proceeding when authentication status matters.

---

### STEP-D06 — Create/select required Liara resources

Guide only what is necessary for the supported app deployment.

The current Liara Next.js quick-start documents:

- private network creation when needed,
- Next.js application creation,
- platform selection as Next.js,
- resource/plan selection.

The assistant should avoid over-explaining infrastructure choices.

If the user already created a required resource, skip that step.

---

### STEP-D07 — Prepare deployment inputs

Guide the user to:

- ignore unnecessary files such as `node_modules`,
- verify the project remains deployable,
- use only documented configuration.

Do not invent `liara.json` fields.

The assistant should retrieve the current relevant docs before giving configuration details.

---

### STEP-D08 — Deploy

Guide the user to run the documented CLI deployment command appropriate to the known context.

Current Liara quick-start documents the CLI form:

```bash
liara deploy --app=myapp --platform=next
```

The assistant must use the user's actual app identifier when it is known.

Do not fabricate an app identifier.

---

### STEP-D09 — Handle deployment output

If deployment returns an error:

- preserve deployment state,
- enter troubleshooting,
- diagnose the returned output,
- after resolution return to STEP-D08 or the correct current step.

---

### STEP-D10 — Complete journey

The journey becomes **DONE** when:

- the user explicitly confirms successful deployment, or
- the user pastes output that reliably indicates successful deployment,
- and no required golden-path deployment step remains.

The assistant does not independently query the user's Liara account.

---

# 12. Functional Requirements — General Q&A

## FR-Q01 — Answer grounded questions

For a normal Liara question:

1. retrieve relevant documentation,
2. answer directly in Persian,
3. keep the answer concise by default,
4. provide source.

---

## FR-Q02 — Do not force guided mode

If the user asks a simple factual question, do not turn it into a multi-step journey.

Example:

> Object Storage لیارا چیه؟

should receive a direct answer.

---

## FR-Q03 — Handle unsupported information

If the answer is not supported by the available source:

- say that clearly,
- do not fill the gap from guesswork,
- optionally point the user to the relevant live Liara page when appropriate.

---

# 13. Source and Trust Requirements

## FR-S01 — Source visibility

Substantial technical responses should show at least one relevant Liara source when available.

The source UI should be secondary to the answer.

---

## FR-S02 — Known vs inferred

When the assistant infers something from a log, the wording must reflect uncertainty.

Prefer:

> به نظر می‌رسه این خطا مربوط به...

over:

> مشکل قطعاً اینه...

unless evidence supports certainty.

---

## FR-S03 — No hallucinated operational details

The assistant must not invent:

- CLI commands
- config field names
- default ports
- plan behavior
- service capabilities
- version requirements

---

# 14. Conversation Context

The MVP requires conversation-scoped context only.

No cross-session memory is required.

## 14.1 Minimum Context Fields

The active conversation should be able to represent:

```text
intent
active_journey
framework
deployment_method
required_services
current_step
completed_steps
last_user_result
active_error
attempted_fix
```

These fields are conceptual product requirements.

Their storage/data representation belongs in `docs/TECH.md`.

## 14.2 Required Behavior

The assistant must:

- reuse known context,
- avoid repeated questions,
- preserve current step,
- preserve Build on Liara plan during deployment,
- preserve prior troubleshooting attempts,
- return to the original journey after a temporary error branch.

---

# 15. Journey State Model

The product behavior can be expressed as:

```text
UNDERSTAND_GOAL
    ↓
COLLECT_REQUIRED_CONTEXT
    ↓
BUILD_MINIMAL_PLAN
    ↓
GIVE_CURRENT_STEP
    ↓
VERIFY_REPORTED_RESULT
    ↓
NEXT_STEP
    ↓
DONE
```

Troubleshooting branch:

```text
CURRENT_STEP
    ↓
ERROR
    ↓
DIAGNOSE
    ↓
FIX_OR_DIAGNOSTIC_ACTION
    ↓
VERIFY_REPORTED_RESULT
    ↓
RETURN_TO_CURRENT_JOURNEY
```

This is product state, not a requirement for an agent framework.

---

# 16. Next-Action Requirements

## FR-N01 — Contextual next actions

After a useful response, the product may show up to three relevant next-action chips.

Examples:

- **درست شد**
- **هنوز خطا دارم**
- **مرحله بعد**
- **لاگ جدید رو می‌فرستم**

## FR-N02 — No recommendation engine

Next-action chips should be derived from the current state/response.

A separate recommendation subsystem is not required.

---

# 17. UX Requirements

## UX-01 — Persian and RTL

- user-facing text is Persian,
- primary layout is RTL,
- code/commands/logs are LTR,
- URLs are LTR,
- mixed Persian/English text remains readable.

## UX-02 — Beginner wording

Avoid platform jargon when a simpler phrase communicates the action.

## UX-03 — Code readability

Commands and code must support:

- monospaced rendering,
- LTR direction,
- copy action,
- horizontal overflow handling on small screens.

## UX-04 — Current progress

Inside guided deployment, the user should be able to understand:

- the current step,
- what they need to do now,
- what happens after they report the result.

A compact progress indicator is sufficient.

Do not build a large workflow UI.

## UX-05 — Sources

Source cards/links should be visible but visually secondary.

## UX-06 — Responsive

The core conversation, commands, sources, and step state must be usable on mobile.

---

# 18. Failure and Edge States

## ERR-01 — Intent is unclear

Behavior:

Ask one short clarification.

## ERR-02 — Insufficient troubleshooting evidence

Behavior:

Ask for one missing artifact/fact.

Do not guess.

## ERR-03 — No reliable documentation evidence

Behavior:

State uncertainty and avoid operational fabrication.

## ERR-04 — Unsupported guided framework

Behavior:

Explain that guided MVP deployment currently supports Next.js.

The assistant may still provide general grounded help for the other framework.

## ERR-05 — Retrieval/system temporarily fails

Behavior:

Show a Persian user-facing error.

Do not expose internal stack traces.

Allow retry.

## ERR-06 — Model request fails

Behavior:

Keep conversation state.

Allow retry.

Do not lose the active journey.

## ERR-07 — Rate limit reached

Behavior:

Return a clear Persian rate-limit message.

Do not expose implementation details.

## ERR-08 — Very large pasted content

Behavior:

The product should reject or constrain oversized content gracefully and explain what smaller relevant portion the user should paste.

Exact technical limits belong in `docs/TECH.md`.

---

# 19. Security and Safety Product Requirements

The product must:

- never expose server secrets,
- treat pasted text/logs/config as untrusted,
- never execute user-provided code,
- never execute pasted shell commands,
- never automatically provision/deploy infrastructure,
- avoid displaying internal application stack traces to users,
- support request limiting,
- avoid unnecessary retention of pasted sensitive content.

Technical implementation belongs in `TECH.md`.

---

# 20. Cost Product Requirements

The product should avoid product behaviors that inherently waste tokens or requests.

Required principles:

- do not call the LLM repeatedly when deterministic state is enough,
- do not retrieve documentation when current grounded context is already sufficient,
- keep cited/retrieved context focused,
- do not create autonomous multi-step model loops.

Exact model/cost strategy belongs in `TECH.md`.

---

# 21. Acceptance Scenarios

These scenarios define minimum product-level acceptance before implementation is considered feature-complete.

## AC-01 — Beginner error paste

Given:
- a user pastes a known error from the Troubleshooting Eval Pack,

Then:
- the assistant recognizes troubleshooting intent,
- uses relevant Liara grounding,
- explains the likely issue,
- gives one next action,
- shows a source,
- asks for the result.

---

## AC-02 — Ambiguous error

Given:
- the pasted log is insufficient,

Then:
- the assistant asks one relevant clarification,
- does not invent a cause.

---

## AC-03 — Build on Liara planning

Given:
- a user says they have a Next.js app that needs PostgreSQL and uploaded images,

Then:
- the assistant identifies PaaS,
- recommends PostgreSQL DBaaS,
- recommends storage only when justified by the described persistence need,
- explains the minimal plan,
- does not add unrelated services.

This scenario tests planning only; it does not require automatic provisioning.

---

## AC-04 — Simple Next.js deployment

Given:
- a beginner has a simple supported Next.js app,
- no database/object storage is required,

Then:
- the assistant starts the CLI guided journey,
- verifies essential readiness,
- helps the user install/authenticate CLI when needed,
- guides resource creation only when needed,
- gives documented deployment instructions,
- waits for reported output,
- reaches user-confirmed successful deployment.

---

## AC-05 — Error during deployment

Given:
- the user is in the deployment journey,
- a deployment command returns an error,

Then:
- current deployment progress is preserved,
- the assistant enters troubleshooting,
- proposes a grounded fix/diagnostic action,
- returns to the deployment journey after resolution.

---

## AC-06 — General question

Given:
- the user asks a simple Liara documentation question,

Then:
- the assistant answers directly,
- provides source,
- does not start an unnecessary guided workflow.

---

## AC-07 — Unknown answer

Given:
- reliable documentation evidence is not available,

Then:
- the assistant explicitly says it cannot verify the requested detail,
- does not fabricate an answer.

---

## AC-08 — Context continuity

Given:
- the user already stated their framework and current deployment step,

When:
- they ask a side question and return,

Then:
- the assistant does not ask for the same information again,
- continues from the previous journey state.

---

# 22. Success Criteria

The PRD is satisfied when the deployed MVP demonstrates:

## Product

- a beginner can start without understanding Liara's service taxonomy,
- error-first troubleshooting produces a useful next action,
- Build on Liara produces a minimal justified service plan,
- the simple Next.js CLI golden journey can reach user-confirmed deployment,
- normal Liara questions remain supported.

## Quality

- evaluation pack behavior is reliable,
- important technical claims are grounded,
- uncertainty is explicit,
- exact technical strings are preserved.

## UX

- Persian/RTL works correctly,
- next action is obvious,
- code/logs remain readable,
- journey state is understandable,
- sources are useful without dominating the UI.

## Operations

- the product itself is deployed on Liara,
- failures are monitorable,
- secrets remain protected,
- rate limits exist,
- token/request use is controlled.

---

# 23. Product Decisions Closed by This PRD

The three open MVP product questions are now closed.

## Decision 1 — Troubleshooting Eval Pack

The initial MVP requires six categories:

1. `ECONNRESET`
2. package/network/mirror failure
3. Next.js project readiness
4. Liara deployment configuration issue
5. ambiguous failure requiring clarification
6. unsupported/undocumented detail requiring abstention

Detailed eval cases belong in `docs/EVALS.md`.

## Decision 2 — Next.js Deployment Journey

The golden path is:

**simple Next.js project → Liara CLI → user-confirmed deployment**

Console and GitHub are not separate guided MVP journeys.

The product follows the steps defined in Section 11.

## Decision 3 — Minimum Conversation Context

The minimum conceptual context fields are:

- intent
- active journey
- framework
- deployment method
- required services
- current step
- completed steps
- last user result
- active error
- attempted fix

No cross-session memory is required.

---

# 24. Documentation Sources Used for the Golden Journey

The product journey should remain aligned with current official Liara documentation.

Primary references used while defining this PRD:

- Liara Docs — Next.js Quick Start  
  `https://docs.liara.ir/paas/nextjs/quick-start/`

- Liara Docs — Deploy Next.js Application  
  `https://docs.liara.ir/paas/nextjs/how-tos/deploy-app/`

Important source-derived facts used in the PRD:

- Liara documents Console, CLI, and GitHub methods for Next.js.
- The CLI quick start documents installation with `npm install -g @liara/cli`.
- Authentication uses `liara login`.
- The CLI flow includes network/application creation when needed.
- Next.js deployment depends on a valid `package.json` and appropriate build/start behavior.
- Liara documents CLI deployment using `liara deploy --app=<app> --platform=next`.
- Current Next.js common-error documentation includes an `ECONNRESET` page.

Before implementation hardcodes operational details, retrieve the current official documentation again.

---

# 25. Definition of PRD Done

This PRD is ready for technical planning when:

- MVP behaviors are explicit,
- golden journeys are explicit,
- scope boundaries are explicit,
- open product questions are closed,
- acceptance scenarios are testable,
- no technical stack has been prematurely selected.

**Status: DONE**

---

# 26. Stage 4 — Scope Confirmation

Stage 4 confirms the UX interpretation of MVP v1.1 without expanding product scope.

## 26.1 Scope Result

**Result: NO SCOPE EXPANSION**

The product still contains:

1. Troubleshooting
2. Build on Liara + Guided Next.js Deployment
3. General Liara Q&A

The UX design must expose these capabilities without creating additional product systems.

## 26.2 UX Scope Boundary

The MVP requires only two primary screens:

1. **Home**
2. **Conversation**

Everything else is a state or component inside the Conversation screen.

The MVP does **not** require:

- dashboard
- authentication UI
- user account settings
- persistent chat-history sidebar
- project-management UI
- project profile page
- separate troubleshooting page
- separate deployment wizard pages
- visual workflow builder
- infrastructure architecture canvas
- service marketplace UI
- admin panel
- file manager
- notifications center

If a later implementation proposes one of these, it must be justified by a concrete approved requirement.

---

# 27. UX Information Architecture

```text
Home
│
├── "یه مشکلی برای پروژه‌م پیش اومده"
│      ↓
│   Conversation — Troubleshooting state
│
├── "می‌خوام پروژه‌م رو آنلاین کنم"
│      ↓
│   Conversation — Build on Liara state
│      ↓
│   Conversation — Guided Deployment state
│
└── Free-text input
       ↓
    Intent inference
       ├── Troubleshooting
       ├── Build on Liara / Deployment
       ├── General Q&A
       └── One clarifying question if truly ambiguous
```

There is no page navigation between steps of a journey.

Journey progress changes inside the same Conversation screen.

---

# 28. Home Screen

## 28.1 Purpose

The Home screen should help a beginner start without needing to formulate a perfect prompt.

It should immediately communicate:

- what the assistant can help with,
- that errors/logs can be pasted directly,
- that the user can also ask a normal question.

## 28.2 Required Content

Suggested primary content:

### Main heading

> **چطور می‌تونم کمکت کنم؟**

### Short supporting copy

> **اگر خطا داری همین‌جا بفرست، یا بگو می‌خوای چه کاری روی لیارا انجام بدی.**

### Primary action 1

> **یه مشکلی برای پروژه‌م پیش اومده**

Supporting text may communicate:

> خطا یا لاگت رو بفرست تا قدم بعدی رو پیدا کنیم.

### Primary action 2

> **می‌خوام پروژه‌م رو آنلاین کنم**

Supporting text may communicate:

> نیاز پروژه‌ت رو می‌فهمیم و قدم‌به‌قدم برای استقرار جلو می‌ریم.

### Composer placeholder

> **هر سؤال یا خطایی درباره لیارا داری اینجا بنویس...**

## 28.3 Interaction

Clicking a primary action should not navigate to a complex form.

It should:

- focus/open the same conversation composer,
- optionally pre-set the likely intent,
- provide a small contextual prompt or starter state.

The user can ignore the primary actions and type directly.

## 28.4 Minimal Wireframe

```text
┌──────────────────────────────────────────┐
│              Liara Assistant             │
│                                          │
│        چطور می‌تونم کمکت کنم؟            │
│ اگر خطا داری بفرست، یا بگو می‌خوای       │
│ چه کاری روی لیارا انجام بدی.             │
│                                          │
│ ┌──────────────────────────────────────┐ │
│ │ یه مشکلی برای پروژه‌م پیش اومده      │ │
│ │ خطا یا لاگت رو بفرست...              │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ ┌──────────────────────────────────────┐ │
│ │ می‌خوام پروژه‌م رو آنلاین کنم        │ │
│ │ قدم‌به‌قدم برای استقرار جلو می‌ریم   │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ ┌──────────────────────────────────────┐ │
│ │ هر سؤال یا خطایی...                  │ │
│ └──────────────────────────────────────┘ │
└──────────────────────────────────────────┘
```

This is structural guidance only, not final visual design.

---

# 29. Conversation Screen

## 29.1 Purpose

The Conversation screen is the single working surface for all product behaviors.

It must make three things obvious:

1. What the assistant understood
2. What the user should do now
3. What happens next

## 29.2 Required Regions

The screen should contain only the necessary regions.

### A. Compact top bar

May contain:

- product name/logo
- a simple "new conversation" action

Do not add full navigation or account controls unless later required.

### B. Optional active-journey strip

Visible only when the user is inside a guided deployment journey.

It may show:

- journey name
- current step
- simple progress state

Example:

> **استقرار پروژه Next.js — مرحله ۳ از ۶**

Do not build a large workflow canvas.

### C. Message stream

Contains:

- user messages
- assistant responses
- code/log blocks
- source cards
- simple plan cards
- next-action chips

### D. Sticky composer

The composer remains available while scrolling.

It accepts normal text and pasted multi-line technical content.

No file attachment button is required for MVP.

---

# 30. Conversation Response Patterns

The product should use a few consistent response patterns instead of inventing a new UI for every answer.

## 30.1 General Answer Pattern

```text
[Direct answer]

[Optional short explanation]

[Source]
```

Use for simple Q&A.

---

## 30.2 Troubleshooting Answer Pattern

```text
برداشت من
[What the evidence suggests]

قدم بعدی
[One concrete fix or diagnostic action]

[Code/command if needed]

منبع
[Liara source]

[درست شد] [هنوز خطا دارم] [لاگ جدید رو می‌فرستم]
```

The labels are UX guidance; final Persian wording may be refined later.

The response should not become a long incident report.

---

## 30.3 Clarifying Question Pattern

When evidence is insufficient:

```text
برای اینکه حدس نزنم، فقط اینو بگو:
[one high-value question]

[option chip 1] [option chip 2 if useful]
```

Do not ask multiple unrelated questions in one turn unless they are all required for the next action.

---

## 30.4 Build on Liara Plan Pattern

After understanding enough project context:

```text
برای پروژه‌ت این‌ها لازمه:

✓ برنامه Next.js روی Liara PaaS
✓ PostgreSQL — چون پروژه دیتابیس می‌خواد
✓ Object Storage — فقط چون فایل آپلودی دائمی داری

پلن:
1. پروژه رو آماده کنیم
2. سرویس‌های لازم رو مشخص کنیم
3. برنامه لیارا رو بسازیم
4. Deploy کنیم
5. نتیجه رو بررسی کنیم

[شروع کنیم]
```

Only services justified by the user's project appear.

For the simple golden project, the plan may contain only Liara PaaS.

---

## 30.5 Guided Step Pattern

```text
مرحله ۲ از ۶

[Short explanation of the current goal]

[One action]

[Command block if applicable]

وقتی انجام شد، نتیجه رو بگو.

[انجام شد] [خطا گرفتم]
```

One primary action per step.

---

## 30.6 Uncertainty Pattern

```text
این مورد رو از منبع قابل اتکای لیارا نتونستم تأیید کنم،
پس نمی‌خوام حدس بزنم.

[what is known, if useful]

[relevant source/live page if available]
```

Do not hide uncertainty behind generic language.

---

# 31. Troubleshooting UX Flow

## 31.1 Entry

The user may:

- click the troubleshooting action,
- paste an error directly into the Home composer,
- paste an error while already inside another journey.

## 31.2 Flow

```text
User pastes error/log
      ↓
Show user message preserving formatting
      ↓
Assistant detects troubleshooting
      ↓
Enough evidence?
  ┌───┴────┐
  │        │
 yes       no
  │        ↓
  │    Ask one focused question
  │        ↓
  └────→ Retrieve / reason with grounded context
               ↓
          Explain likely issue
               ↓
        Give one next action
               ↓
          Show source
               ↓
     Ask whether result changed
        ┌──────┴────────┐
      fixed          not fixed
        │                │
      done      new output / next diagnostic
```

## 31.3 If Troubleshooting Started Inside Deployment

The UI should retain a small deployment context indicator.

Example:

> **در حال رفع مشکل مرحله ۵ استقرار**

After resolution:

> **برگردیم به استقرار پروژه**

The user should not feel that the original journey disappeared.

## 31.4 Long Logs

Long pasted content should:

- remain readable,
- use LTR/monospace presentation where appropriate,
- be visually collapsible/truncated if needed,
- not dominate the conversation permanently.

Exact length limits belong in `TECH.md`.

---

# 32. Build on Liara UX Flow

## 32.1 Entry

User says, for example:

> یه پروژه Next دارم و می‌خوام آنلاینش کنم.

The product should not immediately return a long deployment guide.

## 32.2 Collect Only Required Context

The assistant asks only questions that change the plan.

For the MVP, examples may include:

- Is the project Next.js?
- Does it need a database?
- Does it store user-uploaded files persistently?

Do not ask for traffic estimates, architecture style, team size, scaling policy, or cost preference for the golden path.

## 32.3 Show Minimal Service Plan

Once enough information is available, show a compact Build on Liara plan.

Each service recommendation should contain:

- service name
- short reason

No architecture diagram is required.

## 32.4 Transition to Guided Deployment

For the supported Next.js flow, offer:

> **قدم‌به‌قدم شروع کنیم**

The conversation then enters Guided Deployment state.

For unsupported frameworks:

- do not enter the guided journey,
- explain that guided deployment currently supports Next.js,
- still offer general grounded documentation help when possible.

---

# 33. Guided Next.js Deployment UX Flow

The product-level flow is:

```text
D01 — Confirm Next.js project
↓
D02 — Check essential readiness
↓
D03 — Confirm minimal Build on Liara plan
↓
D04 — Ensure Liara CLI is available
↓
D05 — Authenticate
↓
D06 — Create/select required Liara resources
↓
D07 — Prepare deployment inputs
↓
D08 — Run deployment
↓
D09 — Troubleshoot if needed
↓
D10 — User-confirmed success
```

## 33.1 Progress Presentation

Use a compact progress treatment.

Recommended MVP behavior:

- show current step number,
- show the current step name,
- optionally show completed steps in a collapsible/simple list.

Do not require a graphical stepper with complex interactions.

## 33.2 Step Completion

A step is considered complete from product UX when:

- the user confirms completion, or
- pasted output provides reliable evidence.

The UI must not imply that the app independently checked the Liara account.

## 33.3 Error Branch

When the user selects **خطا گرفتم** or pastes an error:

- preserve current deployment step,
- enter troubleshooting response pattern,
- after resolution offer **برگردیم به مرحله استقرار**.

---

# 34. General Q&A UX Flow

General Q&A should remain intentionally simple.

```text
User asks question
↓
Assistant retrieves relevant Liara source
↓
Direct Persian answer
↓
Small source card/link
↓
Optional relevant next action
```

Do not show:

- journey progress,
- Build on Liara plan,
- troubleshooting diagnostics,

unless the user's intent actually changes.

---

# 35. Source UX

## 35.1 Default

Sources should appear below the useful answer, not above it.

A source item may show:

- page title
- Liara section/service
- external-link action

## 35.2 Source Count

Default to the smallest useful number of sources.

Do not fill the UI with many nearly identical source cards.

## 35.3 Trust

If the assistant's answer is partly inferred, that should be visible in the language of the response.

The source card itself must not be used to imply certainty the evidence does not provide.

---

# 36. Code, Commands, and Log UX

## 36.1 Code/Command Block

Must be:

- LTR
- monospace
- copyable
- horizontally scrollable when needed
- readable inside an RTL conversation

## 36.2 Do Not Auto-Execute

A command block is an instruction for the user.

The UI must not visually imply that the assistant executed the command.

## 36.3 User Logs

Pasted logs should preserve:

- line breaks
- important exact tokens
- LTR readability

---

# 37. Loading and Failure UX

The MVP requires simple, understandable states.

## 37.1 Assistant Loading

Use one calm loading state.

Do not show fake detailed chain-of-thought such as:

- "Analyzing token..."
- "Thinking through architecture..."
- internal reasoning steps

A simple Persian state such as:

> **دارم مستندات مرتبط رو بررسی می‌کنم...**

is sufficient when retrieval is occurring.

## 37.2 Retrieval/Model Failure

Show:

> **نتونستم این پاسخ رو کامل کنم. دوباره تلاش کن.**

Provide retry.

Preserve the conversation and active journey.

## 37.3 Rate Limit

Show a clear Persian message without technical implementation details.

## 37.4 Oversized Paste

Explain that only the relevant section is needed.

Example:

> **لاگ خیلی طولانیه. بخش مربوط به خطا و چند خط قبل و بعدش رو بفرست.**

---

# 38. Mobile and RTL Behavior

## 38.1 Mobile

On small screens:

- primary Home actions stack vertically,
- conversation takes the full content width,
- composer remains accessible,
- code blocks scroll horizontally,
- source cards stay compact,
- action chips wrap naturally,
- progress UI does not consume excessive vertical space.

## 38.2 RTL

The application must be designed RTL-first rather than mirrored as an afterthought.

Verify:

- text alignment
- message layout
- chip order
- icon placement
- progress direction
- punctuation
- Persian + English combinations
- numbers
- command blocks
- URLs

## 38.3 LTR Islands

Use explicit LTR presentation for:

- code
- commands
- logs
- URLs
- technical identifiers when necessary

---

# 39. UX Components Required for MVP

The MVP UI can be built from this small component set:

1. App shell
2. Home action card
3. Composer
4. User message
5. Assistant message
6. Code/log block
7. Source card
8. Action chip/button
9. Minimal plan card
10. Compact journey progress
11. Loading state
12. Error/retry state

This list is a UX inventory, not a required code component architecture.

Claude Code must not infer that every item needs its own abstraction or file.

---

# 40. UI Explicitly Out of Scope

Do not build for MVP:

- authentication screen
- onboarding carousel
- persistent chat history
- chat folders
- saved projects
- project settings
- dashboard analytics
- billing UI
- account linking
- theme customization
- notifications
- rich file uploads
- voice input
- visual infrastructure diagram
- drag-and-drop journey editor
- command execution console
- embedded Liara console
- admin interface

These are not needed to prove the product thesis.

---

# 41. Stage 4 Acceptance Checklist

Stage 4 is complete when all of the following are true:

- MVP v1.1 scope remains unchanged.
- Home has only the necessary primary entry points.
- All product behaviors run inside one Conversation screen.
- Troubleshooting UX is explicit.
- Build on Liara UX is explicit.
- Guided Next.js deployment UX is explicit.
- General Q&A UX is explicit.
- Source/trust UX is explicit.
- Code/log RTL/LTR behavior is explicit.
- Failure/loading states are explicit.
- Mobile behavior is explicit.
- UI exclusions are explicit.
- No visual design system or technical stack has been prematurely selected.

**Stage 4 Status: DONE**

---

# 42. Stage 4 Product Decision

The MVP UX is now frozen at the structural level:

> **Two screens: Home + Conversation.**

All intelligence and task progression are expressed as lightweight states inside Conversation.

This decision should only be revisited if user testing or implementation reveals a concrete usability problem that cannot be solved within this structure.

