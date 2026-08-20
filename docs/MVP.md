# Liara AI Assistant — MVP Definition

## Document Status

**Status:** MVP v1.1 — Scope Frozen  
**Language:** English for project documentation; the product UI and user-facing assistant are Persian and RTL-first.  
**Scope rule:** This document defines the MVP only. Ideas that do not materially improve the MVP should remain out of scope.

---

# 1. Challenge

Liara offers a growing number of cloud services and has a large technical documentation corpus. The documentation contains the information users need, but many users still contact support because they cannot efficiently translate their situation into the correct document, action, or troubleshooting path.

The challenge is therefore not simply:

> "How can we make documentation searchable with an LLM?"

The real challenge is:

> "How can we help a beginner user reach the correct next action without requiring them to understand Liara's documentation structure, terminology, or service taxonomy?"

The product must be deployed on Liara and should perform well against the challenge criteria:

- Answer quality and correctness
- UI / UX
- Agentic behavior and personalization
- Security, reliability, and monitoring
- Deployment on Liara
- Cost efficiency

---

# 2. Research-Supported Observations

The research input identified several important facts that shape the MVP.

## 2.1 The documentation corpus is already large and structured

Liara exposes a machine-readable documentation corpus with more than one thousand documentation pages across PaaS, DBaaS, AI, IaaS, Object Storage, Email, references, and other services.

The corpus is too large to place directly into the model context, so retrieval is required.

The URL structure itself contains useful metadata such as:

- Service
- Platform
- Category
- Topic

This makes the documentation suitable for a relatively simple RAG system without requiring a complex content platform.

## 2.2 The main failure is not missing information

The strongest research conclusion is:

> Liara documentation is organized around services, while users think in terms of tasks, goals, and errors.

Examples:

- A user thinks: "I want to put my Laravel website online with a database and domain."
- Documentation may represent this as multiple pages across multiple services.

A beginner usually does not know which Liara product, feature, or keyword they need before searching.

## 2.3 Users often arrive with an error, not a question

A user who sees:

- `CORS`
- `ECONNRESET`
- `npm ERR! network`
- a build failure
- a stack trace

often has a much more useful artifact than a search query.

The assistant can use that artifact to infer context and retrieve the correct documentation.

## 2.4 Exact technical tokens matter

Pure semantic/vector search can miss exact technical tokens such as:

- error names
- config keys
- filenames
- commands

Retrieval should therefore preserve exact-match behavior where useful.

This is a retrieval implementation concern, not a reason to make the product architecture complicated.

---

# 3. Target User

## Primary User

A beginner or relatively inexperienced Liara user who wants to complete a cloud task but does not want to study infrastructure documentation first.

Typical characteristics:

- Understands their own project better than Liara's platform.
- May know their framework but not Liara terminology.
- Often cannot formulate the "correct" technical search query.
- Wants a working outcome quickly.
- Prefers an actionable next step over a long technical explanation.
- May paste an error instead of describing the underlying issue.

## Primary User Situations

### Situation A — Stuck user

> "Something failed. I have an error. Tell me what it means and what I should do."

This has high urgency and directly addresses a major support burden.

### Situation B — First deployment

> "I have a project and I want to put it online."

The user needs a guided path, not a documentation dump.

## Secondary Situation — General Liara question

> "What is Object Storage?"  
> "How do environment variables work?"

This must be supported, but it is not the core differentiation of the MVP.

---

# 4. Root Problem

The root problem is a mismatch between:

**User mental model**

and

**Documentation structure**

Users think in:

- Goals
- Errors
- Outcomes
- Their framework
- Their current step

Documentation is necessarily organized in:

- Services
- Features
- Platforms
- Reference pages
- Individual procedures

Therefore, improving search alone does not fully solve the problem.

The product must translate:

> **user situation → relevant context → correct action**

instead of only translating:

> **question → documentation answer**

---

# 5. Product Thesis

The MVP is a **beginner-first Persian AI support assistant for Liara**.

Its primary job is not to explain documentation.

Its primary job is to help the user make progress.

The assistant should:

1. Understand what the user is trying to accomplish or what went wrong.
2. Ask only the minimum necessary follow-up questions.
3. Use Liara documentation as the correctness and knowledge layer.
4. Give one clear actionable step at a time when the task is procedural.
5. Preserve the current task context across the conversation.
6. Help the user recover when an error occurs.
7. Cite the relevant Liara source without forcing the user to read it.
8. Say when available evidence is insufficient instead of inventing an answer.

---

# 6. MVP Definition

## One Product, One Assistant

The MVP should use **one assistant**, not multiple independent agents.

The assistant can behave differently depending on the user's intent, but these are product behaviors, not separate agent services.

The MVP has three user-facing capabilities:

### 1. Troubleshoot My Problem

The user pastes:

- an error
- logs
- a stack trace
- build output

The assistant identifies the likely context, retrieves relevant Liara documentation, explains the likely cause, gives a concrete fix, and proposes the next verification step.

### 2. Help Me Put My Project Online

The user describes their project and desired outcome in beginner language.

The assistant first understands the minimum project needs, then recommends only the Liara services that are actually required for that project and produces a simple deployment plan.

This lightweight planning behavior is called **Build on Liara** inside the guided deployment journey.

Example:

> "I have a Next.js shop with PostgreSQL and user-uploaded images."

The assistant may produce a minimal plan such as:

1. Next.js application on Liara PaaS
2. PostgreSQL database on Liara DBaaS
3. Object Storage only if the project's uploaded files require it
4. Required environment variables and connection steps
5. Guided deployment steps in the correct order

The assistant must avoid recommending services that are not justified by the user's stated needs.

After the plan is clear, the assistant moves through the deployment one actionable step at a time until the user reaches a user-confirmed deployment outcome.

The MVP supports one guided application framework only:

**Next.js → Liara**

This framework constraint does not prevent the assistant from recommending directly related Liara services such as a database or object storage when they are necessary for the supported Next.js deployment journey.

Additional application frameworks are outside the active MVP scope and may be considered only after the frozen MVP is complete and reliable.

The assistant does not provision services automatically, does not deploy automatically, and does not verify deployment through the user's Liara account. Completion is based on the user's reported result or pasted successful output.

**Boundary:** Build on Liara is deployment planning for the user's current supported project. It is not a general cloud architecture consultant, cost estimator, or infrastructure optimizer.

### 3. Ask a Liara Question

The user asks a normal Liara question.

The assistant answers from retrieved documentation, gives a concise useful answer, and includes a source.

This is required as a baseline, but is lower priority than the two task-oriented flows.

---

# 7. Core User Experience

The home experience should not begin as an empty generic chatbot.

Suggested primary Persian entry points:

- **یه مشکلی برای پروژه‌م پیش اومده**
- **می‌خوام پروژه‌م رو آنلاین کنم**

A general input remains available for any Liara question:

> **هر سؤال یا خطایی درباره لیارا داری اینجا بنویس...**

General Q&A remains a supported capability, but it does not need to appear as a separate primary mode in the interface.

The same conversation interface supports all behaviors.

The user may type directly without choosing a button.

The assistant should infer the likely intent from the input when possible.

## Example: Troubleshooting

User:

> این ارور رو موقع build می‌گیرم:
> `npm ERR! network ...`

Assistant behavior:

1. Detect that the input is an error/log.
2. Infer relevant technical context when evidence supports it.
3. Ask for one missing fact only if required.
4. Retrieve the relevant Liara documentation.
5. Explain the likely cause in simple Persian.
6. Give the exact next action.
7. Provide source.
8. Offer a relevant next step such as:
   - "درست شد"
   - "هنوز خطا دارم"
   - "لاگ جدید رو بفرستم"

## Example: Guided Deployment

User:

> یه پروژه Next دارم، می‌خوام آنلاینش کنم.

Assistant behavior:

1. Recognize deployment goal.
2. Avoid requiring the user to know Liara terminology.
3. Ask only the minimum questions needed to understand the project.
4. Identify which Liara services are actually required.
5. Produce a minimal ordered deployment plan.
6. Explain why each recommended service is needed when it is not obvious.
7. Present one actionable step at a time.
8. Keep the user in the same deployment journey.
9. If an error occurs, temporarily troubleshoot it.
10. Return to the deployment flow after the issue is resolved.
11. Mark the journey complete when the user reaches the expected outcome.

---

# 8. Lightweight Conversation State

The product should feel agentic without requiring a multi-agent architecture.

A simple conversation state is enough:

```text
UNDERSTAND_GOAL
    ↓
COLLECT_REQUIRED_CONTEXT
    ↓
GIVE_CURRENT_STEP
    ↓
VERIFY_RESULT
    ↓
NEXT_STEP
    ↓
DONE
```

If the user encounters a problem:

```text
CURRENT_STEP
    ↓
ERROR
    ↓
DIAGNOSE
    ↓
FIX
    ↓
VERIFY
    ↓
RETURN_TO_CURRENT_JOURNEY
```

This state can be implemented with normal application logic and structured conversation metadata.

No agent orchestration framework is required for the MVP.

---

# 9. Knowledge Strategy

Liara documentation is the **knowledge layer**, not the main UX.

## Required behavior

The system should:

- Retrieve relevant Liara documentation.
- Preserve metadata such as service, platform, and topic.
- Support exact technical terms where necessary.
- Provide source links with important answers.
- Prefer grounded answers over unsupported model knowledge.
- Refuse to invent details that are absent from available sources.

## Retrieval Principle

The product requirement is:

> Answers must be grounded in Liara documentation, and retrieval must handle both natural-language meaning and exact technical terms reliably enough for the defined evaluation set.

The implementation details — including chunking, embeddings, keyword search, hybrid retrieval, reranking, storage, and model selection — belong in `TECH.md`.

The MVP document intentionally does not lock the technical retrieval architecture.

---

# 10. Trust Layer

Trust is a required part of the MVP because technical hallucinations can directly create wrong configuration or deployment instructions.

Every substantial technical answer should make it easy to see where the answer came from.

The UX should include:

- A small source link/card
- Clear distinction between known and inferred information
- Explicit uncertainty when documentation does not support a reliable answer

Example:

> این مورد را در مستندات فعلی لیارا پیدا نکردم، بنابراین نمی‌خوام عدد یا تنظیمی را حدس بزنم.

The product should not turn citations into the main interaction.

Sources support trust; they do not replace the answer.

---

# 11. Conversation-Scoped Personalization

The MVP personalization model is intentionally limited to the current conversation.

The assistant should remember relevant facts already provided in the active conversation, such as:

- Framework
- Framework version when relevant
- Database choice
- Current deployment step
- Previous error
- Previous attempted fix
- User-confirmed result

The assistant should not repeatedly ask for information that is already available in the current conversation.

The assistant should adapt subsequent answers to this context.

The MVP does **not** require:

- Cross-session memory
- Persistent project profiles
- User account synchronization
- Liara account integration

This is sufficient to provide visible personalization without introducing a separate profile system.

---

# 12. Proactive Next Steps

After useful answers, the assistant may show a small number of contextual next-action chips.

Examples:

- **درست شد**
- **هنوز خطا دارم**
- **مرحله بعد**
- **دامنه وصل کنم**
- **لاگ جدید رو بفرستم**

This is a low-complexity way to:

- Reduce prompt-writing effort for beginners
- Maintain conversation momentum
- Demonstrate agentic behavior
- Suggest a relevant next step

Do not build a separate recommendation engine for this.

---

# 13. Persian and Beginner-First UX Principles

The software is Persian and RTL-first.

## Product Language

- User-facing UI: Persian
- Assistant responses: Persian
- Technical documentation and codebase: English

## UX Principles

### Use beginner language

Prefer:

> پروژه‌م رو آنلاین کنم

over:

> Deploy Application

when talking to the user.

Technical terminology may still be used when necessary, but should be explained naturally.

### One actionable step at a time

Avoid sending a full multi-page procedure when the user is inside a guided journey.

### Avoid documentation dumping

Do not respond with:

> "Read these five pages."

Instead:

- Give the answer/action
- Attach the most relevant source

### Preserve context

If the user asks a side question during deployment, answer it without losing the deployment state.

### Keep MVP input text-based

Users may paste logs, errors, stack traces, commands, configuration snippets, or package/config contents as text.

Do not build a file-upload or file-parsing subsystem for MVP v1.

### Handle RTL correctly

- Persian text: RTL
- Code blocks: LTR
- Commands: LTR
- URLs: LTR
- Mixed Persian/English content must remain readable
- Mobile behavior must be verified

---

# 14. Golden Journeys

The MVP should prioritize quality over coverage.

## Golden Journey 1 — Error → Fix

**Goal:** A beginner pastes an error or log and gets a grounded, useful next action.

The product input remains general: users may paste any Liara-related error, log, stack trace, or build output.

However, MVP quality is guaranteed only against a deliberately limited **Troubleshooting Eval Pack** defined in `EVALS.md`.

The MVP must not create separate troubleshooting workflows for every framework or Liara service.

Minimum successful flow:

1. Receive error/log text.
2. Identify relevant context.
3. Ask one clarifying question only if necessary.
4. Retrieve the correct Liara knowledge.
5. Explain the likely issue.
6. Provide one concrete fix or next diagnostic action.
7. Provide source.
8. Ask whether the result changed or request the next relevant output.

This is the highest-priority journey.

## Golden Journey 2 — Project → Online

**Goal:** A beginner with a Next.js project can follow a conversational deployment flow.

The frozen MVP supports:

**Next.js → Liara**

Minimum successful flow:

1. User states the goal in beginner language.
2. Assistant recognizes deployment intent.
3. Assistant collects only required project context.
4. Assistant identifies the minimum Liara services required by the project.
5. Assistant produces a simple ordered deployment plan.
6. Assistant provides one actionable step.
7. User executes the step and reports the result.
8. Assistant verifies the reported result using the conversation evidence.
9. Assistant continues to the next step.
10. If an error occurs, troubleshooting does not reset progress.
11. The journey returns to deployment after the issue is resolved.
12. The journey is DONE when the user confirms successful deployment or provides successful output and no required deployment step remains.

The assistant does not connect to the user's Liara account and does not automatically execute or independently verify deployment.

## Golden Journey 3 — General Question

**Goal:** User asks a normal Liara question and receives a reliable, concise, cited answer.

This is a supporting baseline, not the primary product story.

---

# 15. MVP Scope

**Scope status: FROZEN for MVP v1.1.**

New ideas must not be added to MUST HAVE unless a current requirement cannot be completed without them.

## MUST HAVE

- Persian RTL-first interface
- One conversational assistant
- Intent recognition between troubleshooting, guided Next.js deployment, and general question
- Text-based error/log/config paste support
- Grounded documentation retrieval
- Source citation
- Explicit uncertainty / "I don't know" behavior
- Conversation context
- Guided deployment for one excellent golden path: Next.js → Liara
- Build on Liara planning: recommend only the Liara services required by the user's supported project and create a minimal ordered deployment plan
- Troubleshooting inside the same conversation
- Contextual next-step suggestions
- Basic responsive UI
- Basic error handling
- Rate limiting
- Secret/API key safety
- Production deployment on Liara
- Basic logging and monitoring
- Evaluation set for core behaviors

## SHOULD HAVE

Only after MUST HAVE is stable:

- Add a second deployment framework such as Node.js
- Add lightweight database setup guidance
- Better retrieval reranking
- Better project-context extraction from pasted text/config snippets
- Richer reusable project context within the conversation
- Caching if measurements show it is useful

## NOT IN MVP

These ideas may be valuable later but should not be built during the MVP unless scope is explicitly reopened:

- Multi-agent architecture
- Agent orchestration frameworks
- Liara account connection
- Automatic access to user logs through Liara API
- Automatic deployment execution
- Automatic infrastructure modification
- Persistent "Project Profile" system or cross-session project memory
- Visual journey builder as a separate subsystem
- CLI finder mode
- Migration translator
- General architecture/cost advisor beyond the current supported deployment journey
- MCP integration
- Public developer API
- File upload and file parsing system
- Fine-tuning on Liara documentation
- Broad support for every Liara service and framework
- Complex recommendation engine

---

# 16. Product Priorities

When tradeoffs are required, use this order:

1. **Correctness**
2. **User reaches the next useful action**
3. **Beginner clarity**
4. **Conversation continuity**
5. **Source trust**
6. **UI polish**
7. **Breadth of supported scenarios**

Do not sacrifice correctness to appear more capable.

Do not sacrifice a reliable golden journey to support many shallow features.

---

# 17. Success Criteria

The MVP is successful when:

## Product Success

- A beginner can start without understanding Liara's documentation taxonomy.
- A user can paste an error and receive a useful grounded next action.
- A supported beginner can follow the guided deployment journey without reading multiple documentation pages.
- The assistant maintains the current task state during the conversation.
- The assistant can recover from a troubleshooting branch and continue the original journey.
- General Liara questions still receive useful documented answers.

## Quality Success

- Important technical claims are grounded in Liara sources.
- Unsupported details are not invented.
- Exact technical tokens are not lost during retrieval.
- The system performs reliably on a predefined evaluation set.

## UX Success

- The interface is clearly usable in Persian.
- RTL behavior is correct.
- Code and commands remain readable.
- The product does not feel like a documentation search page.
- The next action is obvious.

## Operational Success

- The complete product is deployed on Liara.
- Secrets are not exposed.
- Rate limits exist.
- Failures are handled gracefully.
- Basic usage and errors can be monitored.
- Token/context usage is kept intentionally small.

---

# 18. Challenge Judging Alignment

## Answer Quality and Correctness

Addressed by:

- RAG over Liara documentation
- Exact-term-aware retrieval
- Source citations
- Narrow relevant context
- Explicit uncertainty
- Evaluation suite

## UI / UX

Addressed by:

- Persian RTL-first design
- Task-oriented entry points
- Log paste experience
- Step-by-step guidance
- Code-friendly rendering
- Responsive interface
- Contextual next actions

## Agentic and Personalization

Addressed without multi-agent complexity through:

- Intent recognition
- Necessary follow-up questions
- Conversation state
- Multi-step guided deployment
- Error recovery
- Relevant next-step suggestions
- Context-aware answers inside the current journey

## Security, Reliability, Monitoring

Addressed by:

- Rate limiting
- Secret management
- Input/error handling
- Token controls
- Logging
- Monitoring
- Simple maintainable architecture

## Liara Deployment

The complete application must run on Liara.

This should be verified early rather than only at the end of the challenge.

## Cost Optimization

Addressed by:

- Retrieval before generation
- Small context windows
- Avoiding unnecessary LLM calls
- Using simple deterministic logic where possible
- Caching only if measurements justify it
- Avoiding unnecessary agent loops

---

# 19. Key Risks

## Risk 1 — Overengineering

The project can easily expand into multiple agents, tool systems, automatic deployment, project profiles, and many workflows.

**Response:** Keep one assistant, a small state model, and only two primary golden journeys.

## Risk 2 — Building a chatbot instead of solving the task

A polished chat interface alone does not solve the user's root problem.

**Response:** Evaluate whether the assistant helps the user reach a concrete next action.

## Risk 3 — Hallucinated operational details

Incorrect commands, config fields, versions, or Liara behavior can make the answer worse than no answer.

**Response:** Ground important details in retrieved documentation and abstain when evidence is insufficient.

## Risk 4 — Retrieval misses exact error tokens

Semantic search alone can fail on technical strings.

**Response:** Preserve exact/keyword matching in the retrieval design.

## Risk 5 — Too much platform coverage

Supporting every framework and Liara service will reduce quality.

**Response:** Start with one excellent guided deployment flow and a strong general troubleshooting path.

## Risk 6 — Late production deployment

Deployment is a required challenge output.

**Response:** Create and test a Liara deployment skeleton early in implementation.

---

# 20. Current Product Decisions

The following decisions are frozen for MVP v1:

1. The product is **not** a "chat with docs" product.
2. The product is a **beginner-first task and troubleshooting assistant**.
3. Troubleshooting/error-first interaction is the highest-priority journey.
4. Guided deployment is the second core journey.
5. General documentation Q&A is necessary but not the primary product.
6. Liara documentation remains the knowledge and correctness layer.
7. The MVP uses one assistant, not multiple agents.
8. The MVP should use lightweight explicit conversation state.
9. The first and only guided deployment framework in MVP v1 is Next.js.
10. Deployment completion is user-confirmed; the assistant does not connect to the user's Liara account to verify it.
11. Troubleshooting input is broad, but guaranteed MVP quality is limited to the Troubleshooting Eval Pack.
12. MVP input is text-based; file upload is outside scope.
13. Personalization is conversation-scoped only.
14. The user-facing software is Persian and RTL-first.
15. Project documentation, code, and Claude Code prompts are English.
16. Sources should be visible but secondary to the actionable answer.
17. The assistant should explicitly admit uncertainty when evidence is insufficient.
18. Contextual next-step chips are allowed because they are useful and cheap to implement.
19. Account integration, automatic log access, automatic deployment, and broad tool execution are outside MVP scope.
20. Build on Liara is included as a lightweight planning step inside Guided Deployment: understand project needs, recommend only required Liara services, and create an ordered deployment plan.
21. Build on Liara must not expand into general architecture consulting, cost estimation, automatic provisioning, or infrastructure optimization.
22. Product quality and completion take priority over feature count.

---

# 21. Open Questions

Only three product questions remain open before PRD completion:

1. **Troubleshooting Eval Pack:** Which specific error categories and scenarios must the MVP pass reliably?
2. **Next.js Deployment Journey:** What exact sequence of steps defines the supported golden journey from start to user-confirmed deployment?
3. **Minimum Conversation Context:** Which fields must be retained during the active journey so the assistant can continue without repeating questions?

Technical decisions such as model choice, retrieval architecture, hybrid search, storage, and monitoring implementation belong in `TECH.md` and are intentionally not product-scope questions.

These open questions may refine the frozen MVP, but they must not expand it.

---

# 22. Execution Principle

Every future feature proposal should be tested against one question:

> Does this materially improve a beginner user's ability to diagnose a problem, identify the minimal Liara services they need, or complete the first successful Liara deployment?

If not, it should normally remain outside the MVP.

The MVP should be judged by the quality of a few complete user journeys, not by the number of AI features it contains.
