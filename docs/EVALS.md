# Liara AI Assistant — MVP Evaluation Suite

## Document Status

**Version:** EVALS v1  
**Status:** Approved pre-build quality contract  
**Product scope:** MVP v1.1  
**Evaluation basis:** `docs/PRD.md` + `docs/TECH.md` + current official Liara documentation

This document defines how the MVP is accepted or rejected.

The evaluation set is intentionally small and fixed before implementation so product quality is not judged only by friendly manual testing after the system has been built.

---

# 1. Evaluation Principles

## 1.1 Evaluate behavior, not exact wording

The assistant does not need to reproduce a reference sentence word-for-word.

A case passes when it:

- understands the correct intent,
- retrieves/uses the right Liara evidence when required,
- gives the correct next action,
- preserves conversation state when required,
- avoids unsupported operational details,
- communicates clearly in beginner-friendly Persian.

## 1.2 Grounding beats confidence

A fluent unsupported answer is a failure.

When evidence is insufficient, clarification or abstention is better than guessing.

## 1.3 Exact technical tokens matter

Evaluation must preserve and test exact strings such as:

- `ECONNRESET`
- `npm ERR!`
- `package.json`
- `liara.json`
- CLI commands

## 1.4 The suite must remain MVP-sized

Do not add dozens of cases for every framework or Liara service.

Add a regression eval only when:

- a meaningful in-scope failure is discovered,
- the failure is fixed,
- keeping the case protects against recurrence.

---

# 2. Evaluation Layers

The same product is evaluated at three layers.

## Layer A — Deterministic Logic

Does not require the real LLM when avoidable.

Examples:

- intent routing,
- state transitions,
- Build on Liara service mapping,
- unsupported guided-framework behavior.

These should become automated tests where practical.

## Layer B — Retrieval

Tests whether the knowledge layer retrieves the right evidence.

Checks include:

- expected Liara page appears in the candidate set,
- exact technical token can retrieve its dedicated page,
- source metadata is correct,
- irrelevant sources do not dominate.

Recommended retrieval measure:

> **Expected Source @5**

For source-specific cases, the expected source should normally appear within the top 5 final/candidate results.

## Layer C — End-to-End Answer Behavior

Uses the real configured retrieval + model pipeline.

Checks:

- correctness,
- actionability,
- source trust,
- uncertainty,
- Persian UX,
- conversation continuity.

---

# 3. Release Quality Gate

The MVP is ready for final challenge delivery only when all of the following are true:

## Core Pass Rate

At least:

> **16 / 17 core evals PASS**

## Critical Cases

All critical cases must PASS:

- `T-01`
- `T-02`
- `T-03`
- `T-04`
- `T-05`
- `T-06`
- `B-01`
- `B-02`
- `B-03`
- `J-01`
- `J-03`
- `J-05`

A critical case cannot be compensated for by passing easier questions.

## Hallucination Gate

Across the core suite:

> **0 fabricated Liara commands, config fields, or service capabilities**

## Retrieval Gate

For source-specific retrieval cases:

> **Expected Source @5 ≥ 85%**

The four primary troubleshooting source cases (`T-01` to `T-04`) should all retrieve relevant authoritative evidence.

## Golden Demo Gate

`DEMO-01` must complete successfully end-to-end.

---

# 4. Pass / Fail Interpretation

Each eval is recorded as:

- **PASS**
- **FAIL**
- **BLOCKED**

Use `BLOCKED` only for an external dependency failure such as unavailable Liara AI/database.

Blocked cases do not count as passes and must be rerun before release.

For every failed case record one primary failure category:

- `ROUTING`
- `RETRIEVAL`
- `ANSWER`
- `HALLUCINATION`
- `STATE`
- `UX`
- `INFRA`

Do not solve an eval failure by expanding MVP scope unless the existing requirement genuinely cannot be satisfied.

---

# 5. Cross-Cutting Criteria

Apply these criteria to every relevant end-to-end eval.

## Persian / Beginner UX

PASS when:

- answer is Persian,
- wording is understandable to a beginner,
- unnecessary platform jargon is avoided or explained,
- response is concise enough for the task,
- next action is obvious.

FAIL when:

- answer reads like raw documentation,
- long unrelated explanations dominate,
- user must infer the next action.

## Trust / Sources

PASS when:

- substantial Liara-specific claims have relevant Liara source evidence,
- source URL/title corresponds to retrieved metadata,
- source is secondary to the useful answer.

FAIL when:

- source is fabricated,
- source is unrelated,
- model invents a URL.

## Known vs Inferred

PASS when uncertain diagnosis uses language equivalent to:

> به نظر می‌رسه...

and does not state inference as certain fact.

## One-Step Guidance

For procedural/troubleshooting cases, PASS when the assistant gives one primary current action instead of dumping a full multi-step document.

---

# 6. Source Baseline

The following official Liara documentation facts were verified while defining EVALS v1.

Before the final production eval run, refresh these sources from the current official documentation/index.

## SRC-NEXT-DEPLOY — Next.js deployment

Official source:

`https://docs.liara.ir/paas/nextjs/how-tos/deploy-app/`

Current factual anchors:

- Next.js deployment requires `package.json`.
- Liara installs dependencies using `npm install`.
- If a `build` script exists, Liara runs it.
- A `start` script is required for running the application.
- `node_modules` should not be uploaded.
- A Next.js `liara.json` may use `platform: "next"`.
- Liara's npm mirror can be disabled with:

```json
{
  "next": {
    "mirror": false
  }
}
```

- CLI deployment can use `liara deploy`.

## SRC-NEXT-QUICK — Next.js quick start / CLI

Official source:

`https://docs.liara.ir/paas/nextjs/quick-start/`

Current factual anchors include the CLI flow:

- install `@liara/cli`,
- `liara login`,
- create a private network when needed,
- create/select the Next.js application,
- ignore unnecessary files,
- verify `package.json`,
- deploy with a command equivalent to:

```bash
liara deploy --app=<app-id> --platform=next
```

## SRC-ECONNRESET — Next.js ECONNRESET

Official source:

`https://docs.liara.ir/paas/nextjs/fix-common-errors/econnreset/`

Current factual anchor:

Liara documentation describes low application resources as a major cause in this context and recommends increasing hardware resources and restarting the application.

## SRC-OBJECT-STORAGE — Object Storage

Official source:

`https://docs.liara.ir/object-storage/about/`

Current factual anchors:

- Object Storage stores data as objects,
- it is appropriate for large amounts of unstructured data such as media/backups,
- Liara Object Storage is S3-compatible,
- it can be used through AWS-compatible tooling/SDKs.

---

# 7. General Q&A Evals

## G-01 — Object Storage concept

Category:
General Q&A / semantic retrieval

Critical:
No

User Input:

> Object Storage لیارا چیه؟ خیلی ساده بگو چه وقت به دردم می‌خوره.

Context:
New conversation.

Expected Source:
`SRC-OBJECT-STORAGE`

Expected Behavior:
- Route to General Q&A.
- Explain Object Storage in concise beginner Persian.
- Mention an appropriate use such as persistent media/files or other unstructured data.
- Do not turn the question into a guided deployment flow.
- Show the relevant Object Storage source.

Pass:
- Correct concept and use case.
- Relevant source.
- No unnecessary architecture advice.

Fail:
- Confuses Object Storage with a database/disk.
- Starts an unrelated workflow.
- Invents unsupported service behavior.

---

## G-02 — Should `node_modules` be uploaded?

Category:
General Q&A / exact technical token

Critical:
No

User Input:

> برای deploy پروژه Next روی لیارا باید پوشه `node_modules` رو هم بفرستم؟

Context:
New conversation; no active journey.

Expected Source:
`SRC-NEXT-DEPLOY` or `SRC-NEXT-QUICK`

Expected Behavior:
- Route to direct Q&A.
- Answer that `node_modules` should not be uploaded.
- Explain briefly that Liara installs project dependencies during deployment.
- Preserve `node_modules` exactly in technical formatting.
- Provide source.

Pass:
- Direct grounded answer.
- Does not unnecessarily start the full deployment journey.

Fail:
- Advises uploading `node_modules`.
- Gives no grounding.

---

## G-03 — Required Next.js start script

Category:
General Q&A / exact technical token

Critical:
No

User Input:

> توی `package.json` پروژه Next من `build` هست ولی `start` ندارم. برای لیارا مهمه؟

Context:
New conversation.

Expected Source:
`SRC-NEXT-DEPLOY`

Expected Behavior:
- Explain that Liara uses the `start` script to run the Next.js application and it must be defined according to current docs.
- A concise example such as `"start": "next start"` is acceptable when grounded.
- Do not invent unrelated package.json requirements.
- Provide source.

Pass:
- Correctly identifies the missing `start` as relevant.
- Source is correct.

Fail:
- Says `start` is unnecessary.
- Fabricates another required script.

---

# 8. Troubleshooting Eval Pack

These six cases define the guaranteed troubleshooting evaluation boundary.

---

## T-01 — `ECONNRESET`

Category:
Troubleshooting / exact-token retrieval

Critical:
Yes

User Input:

> پروژه Next من روی لیارا بالا میاد ولی این خطا رو می‌بینم:
>
> `Error: read ECONNRESET`
>
> باید چیکار کنم؟

Context:
New conversation.

Expected Source:
`SRC-ECONNRESET`

Expected Behavior:
- Detect troubleshooting.
- Preserve `ECONNRESET`.
- Retrieve the dedicated Next.js error page.
- Explain the Liara-documented likely cause without overstating certainty.
- Recommend the documented action: increase appropriate application resources and restart.
- Show source.
- Ask whether the issue is resolved / request next result.

Pass:
- Dedicated source is retrieved.
- Primary action matches current official guidance.
- No speculative laundry list.

Fail:
- Generic Node/network answer ignores Liara evidence.
- Claims a completely different certain cause.
- Invents config/command.

---

## T-02 — npm mirror/package installation failure

Category:
Troubleshooting / exact + semantic retrieval

Critical:
Yes

User Input:

> موقع deploy پروژه Next اینو می‌گیرم:
>
> `npm ERR! network request to package registry failed`
>
> یه پکیج جدید هم همین امروز به پروژه اضافه کردم.

Context:
New conversation.

Expected Source:
`SRC-NEXT-DEPLOY`

Expected Behavior:
- Recognize package-install/network context.
- Retrieve Next.js deployment/mirror evidence.
- Explain that Liara uses an npm mirror and current docs describe disabling it when newer packages have installation problems.
- Give the grounded `liara.json` change using:

```json
{
  "next": {
    "mirror": false
  }
}
```

- Ask the user to retry deployment.
- Show source.

Pass:
- Exact mirror configuration is grounded and correct.
- One concrete next action.

Fail:
- Invents a mirror URL.
- Recommends unrelated networking/infrastructure changes first.
- Gives a wrong config key.

---

## T-03 — Missing `start` script

Category:
Troubleshooting / readiness

Critical:
Yes

User Input:

> deploy پروژه Next شکست می‌خوره. این بخش `package.json` منه:
>
> ```json
> {
>   "scripts": {
>     "dev": "next dev",
>     "build": "next build"
>   }
> }
> ```

Context:
New conversation.

Expected Source:
`SRC-NEXT-DEPLOY`

Expected Behavior:
- Identify missing `start`.
- Explain that current Liara Next.js docs require/use the `start` script to run the app.
- Suggest the grounded script when appropriate:

```json
"start": "next start"
```

- Ask user to update and retry.
- Provide source.

Pass:
- Finds the actionable readiness issue.
- Does not ask a generic questionnaire.

Fail:
- Focuses on unrelated causes before the visible issue.
- Invents another script/config field.

---

## T-04 — Wrong Next.js `liara.json` platform

Category:
Troubleshooting / config exactness

Critical:
Yes

User Input:

> پروژه‌م Next هست. این `liara.json` رو گذاشتم:
>
> ```json
> {
>   "app": "shop-web",
>   "platform": "node"
> }
> ```
>
> به نظرت مشکلی داره؟

Context:
New conversation.

Expected Source:
`SRC-NEXT-DEPLOY`

Expected Behavior:
- Recognize config mismatch.
- Explain that the documented Next.js platform value is `next`.
- Suggest the minimal corrected configuration.
- Do not invent additional fields.
- Provide source.

Pass:
- Correct field/value correction.
- Minimal answer.

Fail:
- Accepts `node` as the documented Next.js platform value.
- Adds unrelated configuration.

---

## T-05 — Ambiguous deployment failure

Category:
Troubleshooting / clarification

Critical:
Yes

User Input:

> deploy نشد. ارور میده. چیکار کنم؟

Context:
New conversation; no error output supplied.

Expected Behavior:
- Detect troubleshooting intent.
- Do **not** guess a cause.
- Ask for one high-value missing artifact: the relevant error/deploy output.
- Keep the question concise.

Pass:
A response equivalent to:

> برای اینکه حدس نزنم، متن خطا یا چند خط آخر خروجی deploy رو بفرست.

Fail:
- Claims a likely cause without evidence.
- Asks a long questionnaire before requesting the error.

---

## T-06 — Hallucination / undocumented config trap

Category:
Troubleshooting / abstention

Critical:
Yes

User Input:

> برای سریع‌تر شدن Next روی لیارا این تنظیم درسته؟
>
> ```json
> {
>   "next": {
>     "superTurboMode": true
>   }
> }
> ```
>
> مقدار بهترش چنده؟

Context:
New conversation.

Expected Behavior:
- Search available Liara evidence.
- Do not invent support for `superTurboMode`.
- Explicitly state that the setting could not be verified in current Liara documentation.
- Do not propose a fabricated value.
- A relevant official config/deploy source may be shown.

Pass:
- Clear abstention.
- No fabricated config.

Fail:
- Claims the field is real.
- Suggests a numeric/boolean value as if documented.

---

# 9. Build on Liara Evals

These cases test deterministic planning, not automatic provisioning.

---

## B-01 — Simple Next.js project

Category:
Build on Liara / minimal service mapping

Critical:
Yes

User Input:

> یه سایت ساده Next دارم. دیتابیس ندارم و کاربر هم چیزی آپلود نمی‌کنه. می‌خوام روی لیارا آنلاینش کنم.

Context:
New conversation.

Expected Behavior:
- Recognize supported deployment intent.
- Recommend only the Next.js PaaS application for the core project.
- Do not add PostgreSQL/Object Storage/Redis/email/etc.
- Produce a small ordered plan.
- Offer to start the guided flow.

Pass:
- Minimum justified service set.
- No unnecessary infrastructure.

Fail:
- Recommends extra services without a user need.
- Turns into general cloud architecture consulting.

---

## B-02 — Next.js + PostgreSQL

Category:
Build on Liara / service mapping

Critical:
Yes

User Input:

> پروژه فروشگاه من Next.js هست و PostgreSQL هم می‌خواد. فایل آپلودی ندارم. برای لیارا چی لازم دارم؟

Context:
New conversation.

Expected Behavior:
- Recommend:
  - Next.js PaaS
  - PostgreSQL DBaaS
- Give a short reason for PostgreSQL.
- Do not recommend Object Storage.
- Make clear that the MVP is planning the services, not provisioning them automatically.

Pass:
- Exactly the justified service categories.
- No unnecessary storage.

Fail:
- Misses the required DB.
- Adds unrelated infrastructure.

---

## B-03 — Next.js + PostgreSQL + persistent uploads

Category:
Build on Liara / service mapping

Critical:
Yes

User Input:

> یه فروشگاه Next دارم، دیتابیس PostgreSQL داره و کاربرا عکس محصول آپلود می‌کنن که باید دائمی بمونه. روی لیارا چه سرویس‌هایی پیشنهاد میدی؟

Context:
New conversation.

Expected Behavior:
- Recommend:
  - Next.js PaaS
  - PostgreSQL DBaaS
  - Object Storage for persistent uploaded media
- Give one short reason for each non-obvious service.
- Do not add unrelated services.
- Do not create a complex architecture diagram.

Pass:
- Minimal three-service plan.
- Clear justification.

Fail:
- Stores user media in the database by default without justification.
- Adds Redis/DNS/email/etc. just to appear complete.

---

# 10. Guided Journey Evals

---

## J-01 — Start the supported Next.js CLI journey

Category:
Guided deployment / state

Critical:
Yes

User Input:

> یه پروژه Next دارم و می‌خوام قدم‌به‌قدم روی لیارا deployش کنم.

Context:
New conversation.

Expected Behavior:
- Enter supported Next.js deployment journey.
- Collect only essential missing context.
- Build/confirm minimal plan.
- Guide one step at a time.
- Use Liara CLI as the golden deployment method.
- Do not dump every deployment step in the first answer.
- Create/retain the correct journey state.

Pass:
- User can clearly identify the current step and next action.
- No auto-deploy behavior.

Fail:
- Sends full documentation dump.
- Starts Console/GitHub wizard as separate MVP flow.
- Claims to execute deployment.

---

## J-02 — Skip already-completed journey work

Category:
Guided deployment / personalization

Critical:
No

Conversation:

User turn 1:

> پروژه‌م Next هست. Liara CLI رو نصب کردم و login هم هستم.

Assistant:
Begins/continues deployment journey.

User turn 2:

> برنامه رو هم از قبل با شناسه `shop-web` ساختم.

Expected Behavior:
- Remember:
  - framework = Next.js
  - CLI already installed
  - authenticated
  - app ID = `shop-web` when needed in journey context
- Skip unnecessary install/login/app-create instructions.
- Continue to the next relevant readiness/deploy step.
- Do not ask those facts again.

Pass:
- Visible conversation-scoped personalization.
- No repeated questionnaire.

Fail:
- Repeats CLI install/login steps.
- Loses previously provided context.

---

## J-03 — Error during deployment and return

Category:
Guided deployment + troubleshooting

Critical:
Yes

Context:
Active journey is at deployment step D08 for app `shop-web`.

User Input:

> دستور deploy رو زدم ولی اینو گرفتم:
>
> `Error: read ECONNRESET`

Expected Behavior:
- Preserve D08 as the original deployment step.
- Enter troubleshooting behavior.
- Use `SRC-ECONNRESET`.
- Give grounded next action.
- After user reports resolution, offer/perform return to the deployment step.
- Do not reset the journey.

Pass:
- Error branch + recovery works.
- Deployment context remains intact.

Fail:
- Starts a new unrelated conversation.
- Loses app/journey step.
- Marks deployment complete before user confirmation.

---

## J-04 — Side question without losing progress

Category:
Guided deployment / context continuity

Critical:
No

Context:
Active Next.js deployment journey; current step is CLI/resource preparation.

User Input:

> راستی Object Storage دقیقا چیه؟

Expected Behavior:
- Answer the side question through grounded General Q&A.
- Use `SRC-OBJECT-STORAGE`.
- Preserve the active deployment journey.
- After answering, make it clear the previous deployment step is still available.

Pass:
- Correct side answer + preserved state.

Fail:
- Resets/abandons the deployment journey.
- Re-asks framework after the side question.

---

## J-05 — Unsupported guided framework

Category:
Scope / unsupported journey

Critical:
Yes

User Input:

> یه پروژه Django دارم. بیا مثل Next قدم‌به‌قدم deployش کنیم.

Context:
New conversation.

Expected Behavior:
- Do not enter the supported guided Next.js journey.
- Clearly explain that MVP guided deployment currently supports Next.js.
- Offer general grounded Liara help/docs for Django when available.
- Do not invent a Django deterministic journey.

Pass:
- Honest scope handling.
- Useful fallback without scope expansion.

Fail:
- Pretends Django is a supported guided journey.
- Builds/assumes a new workflow.

---

# 11. Retrieval Checks

Run these as a focused retrieval suite after Phase 3.

| Eval | Query Signal | Expected Evidence |
|---|---|---|
| R-01 | `ECONNRESET` | dedicated Next.js ECONNRESET page |
| R-02 | `package.json` + missing `start` | Next.js deploy page |
| R-03 | `next mirror false` / npm package issue | Next.js deploy mirror section |
| R-04 | `liara.json` + `platform` + Next.js | Next.js deploy config section |
| R-05 | Object Storage / persistent file | Object Storage about page |

Pass target:

> at least 4/5 expected sources within top 5, with R-01 through R-04 all producing relevant authoritative evidence.

These retrieval checks support, but do not replace, the end-to-end core evals.

---

# 12. Golden Demo Release Gate

## DEMO-01 — Beginner from goal → error → recovery → success → Q&A

Category:
End-to-end challenge demo

Critical:
Release blocker

Initial State:
New conversation.

### Turn A — Goal

User:

> یه پروژه ساده Next دارم و نمی‌دونم چطوری روی لیارا آنلاینش کنم.

Expected:
- Enter Build on Liara.
- Identify minimal PaaS-only plan for the simple project.
- Offer/start guided CLI journey.

### Turn B — Readiness

User provides required simple readiness information.

Expected:
- Continue without unnecessary questions.
- One actionable step at a time.

### Turn C — CLI / resource progression

User reports CLI/login/resource steps as completed.

Expected:
- Skip completed steps.
- Maintain progress.

### Turn D — Deployment failure

At D08 user supplies:

> `Error: read ECONNRESET`

Expected:
- Preserve D08.
- Enter grounded troubleshooting.
- Use the dedicated source.
- Give documented next action.

### Turn E — Recovery

User:

> درست شد. دوباره deploy کردم و این بار موفق شد.

Expected:
- Return to/complete deployment.
- Mark journey DONE based on user-confirmed success.
- Do not claim independent account verification.

### Turn F — Side/general question

User:

> Object Storage چه موقع به درد پروژه‌م می‌خوره؟

Expected:
- Give concise grounded answer.
- Show relevant source.
- Completed deployment state should not create confusion.

## DEMO-01 Pass

The demo passes only if it shows in one coherent story:

- intent understanding,
- Build on Liara planning,
- deterministic multi-step guidance,
- conversation-scoped personalization,
- troubleshooting,
- source grounding,
- error recovery,
- user-confirmed completion,
- general Q&A.

---

# 13. Manual Persian / UX Review

After the core suite, manually review at least one answer from each major behavior:

- General Q&A
- Troubleshooting
- Build on Liara
- Guided deployment

Review questions:

1. Is the answer naturally Persian?
2. Is it understandable to a beginner?
3. Is the next action visible quickly?
4. Is technical content preserved exactly?
5. Is the answer unnecessarily long?
6. Does it feel like assistance rather than a documentation dump?
7. Are sources useful but secondary?
8. Is uncertainty stated when necessary?

A repeated failure pattern should become a regression eval only when concrete.

---

# 14. Eval Execution Record

Use this compact format when running the suite:

```text
## Run: YYYY-MM-DD / <environment>

Model:
Embedding Model:
Docs Index Revision:
Application Revision:

| Eval | Result | Failure Category | Note |
|---|---|---|---|
| G-01 | PASS | - | |
| ... | ... | ... | ... |

Core Pass Rate:
Retrieval Source@5:
Critical Failures:
Hallucination Failures:
DEMO-01:
```

Do not create a separate evaluation platform for the MVP.

A Markdown record or small script/output is sufficient.

---

# 15. When to Tune vs When to Redesign

## Tune first

If a failure can be fixed by:

- better chunking,
- exact-token extraction,
- retrieval threshold,
- prompt wording,
- deterministic state logic,
- small UX copy adjustment,

prefer the targeted fix.

## Do not redesign immediately

A failed eval is **not** automatic justification for:

- reranker model,
- Redis,
- external vector database,
- multi-agent architecture,
- model router,
- new infrastructure.

Only reconsider architecture when multiple important eval failures demonstrate the current design cannot meet an approved requirement.

---

# 16. Stage 7 Acceptance Checklist

Stage 7 is complete when:

- the evaluation suite exists before implementation,
- all six Troubleshooting Eval Pack categories have concrete cases,
- General Q&A has grounded cases,
- Build on Liara has minimal-service cases,
- guided Next.js has state/continuity/error cases,
- unsupported scope is tested,
- hallucination/abstention is tested,
- retrieval checks are explicit,
- a Golden Demo release gate exists,
- release thresholds are explicit,
- the suite remains small enough to run repeatedly.

**Stage 7 Status: DONE**

---

# 17. Next Step

The project is now ready to enter implementation.

Start with:

> **BL-001 — Scaffold the approved application foundation**

The first Claude Code implementation prompt should:

1. inspect the repository,
2. read `CLAUDE.md`, `docs/MVP.md`, `docs/PRD.md`, `docs/TECH.md`, `docs/BACKLOG.md`, and `docs/EVALS.md`,
3. implement BL-001 only,
4. run the required verification,
5. report exactly what changed.

Do not implement later backlog items in the first task.
