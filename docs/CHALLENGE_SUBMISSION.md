# Lio — Liara AI Technical Teammate

**Live:** https://liara-ai-assistant.liara.run
**Repository:** https://github.com/mahdisatabaki/liara-hackathon

---

## One-line pitch

> لیو یک هم‌تیمی فنی برای کاربران تازه‌کار لیاراست: خطاها را عیب‌یابی می‌کند و پروژه را قدم‌به‌قدم تا دیپلوی همراهی می‌کند — بدون اینکه کاربر مجبور باشد بین مستندات دنبال جواب بگردد.

---

## Problem

Liara has many services and a large documentation set. A beginner usually arrives
with one of two things: an error message, or a goal ("I want my project online").
Neither tells them which page to open.

So the work becomes: read the error, guess the service, search the docs, read
several pages, decide which applies. That interrupts the actual task, and it is
the part beginners are worst at.

A generic AI assistant makes it worse in a different way: it answers confidently
from memory, invents config keys and commands, and the user cannot tell which
parts are real.

## Solution

Lio reads the documentation **so the user does not have to**.

- Every Liara claim is grounded in the official docs corpus.
- Retrieval searches broadly, then narrows to **one** document before the model
  ever sees it — so the answer commits instead of hedging across pages.
- One answer, one next action, one source.
- When the docs cannot support an answer, Lio says so rather than guessing.
- Conversation state carries the project, the journey step, the previous error,
  and what has already been tried.

The source card exists for trust and verification. It is never the user's
homework.

---

## Feature 1 — عیب‌یابی با لیو

The user pastes an error, log, stack trace, or build output. Lio:

1. detects troubleshooting intent deterministically,
2. preserves the exact technical token (`ECONNRESET`, `liara.json`, `npm ERR!`),
3. retrieves evidence from the official corpus,
4. selects **one** canonical document,
5. gives **one** diagnosis and **one** next action,
6. stays in the loop — "درست شد؟ / هنوز خطا دارم / لاگ جدید رو می‌فرستم".

**Flagship example — `Error: read ECONNRESET`:** Lio selects Liara's dedicated
Next.js ECONNRESET page, explains the documented cause, and gives the documented
action (raise the app's resources, then restart). No speculative list of causes.

## Feature 2 — دیپلوی با لیو

A guided path for beginner Next.js projects:

confirm project → readiness → minimum Liara services → CLI → authentication →
resources → deployment inputs → deploy → recover from errors → done

Two properties matter most:

- **An error branches without losing the journey.** Paste an error at the deploy
  step and Lio switches to troubleshooting while holding that exact step; when
  the user says it is fixed, it returns there — it does not declare the
  deployment finished.
- **A stray remark never advances progress.** Only a recognised completion
  signal moves a step, so nothing is silently skipped.

Every ordinary step of this journey costs **zero AI calls** — the content is
deterministic.

## Grounded Q&A

A supporting capability, available from the main composer. Lio reads the
document and gives the conclusion, e.g. "keep user photos on Object Storage,
not on the app filesystem" — not "see the Object Storage page".

---

## Lio's character

A technically capable teammate, not a helpdesk:

- speaks Persian conversationally, addresses the user as «تو»
- answer first, then a short explanation
- one concrete next action
- honest about uncertainty
- asks for explicit confirmation before anything consequential (delete, restart,
  redeploy, plan or billing change, env var, DNS, rollback)
- humour and emoji stay within budget, and disappear entirely for serious errors

---

## Architecture

```text
Browser (Persian, RTL)
   │
   ▼
Next.js App Router on Liara PaaS
   ├── deterministic intent + journey state   ← no model call
   ├── retrieval ─→ Liara PostgreSQL + pgvector
   │                 semantic + exact-token, fused, then ONE document selected
   └── Liara AI ──→ one grounded generation
```

One assistant, one endpoint, three Liara resources. Deliberately **not** here:
multi-agent orchestration, an agent framework, a reranker, a model router, Redis,
or an external vector database.

The decisive design choice: **document selection happens before generation.**
The model is never asked to choose between sources.

## Knowledge / RAG (verified)

| | |
|---|---|
| Corpus | official `liara-cloud/docs`, `public/llms/**/*.md` |
| Files indexed | **1,143** |
| Chunks indexed | **5,441** |
| Embedding model | `openai/text-embedding-3-small` |
| Dimensions | **1536** (probed from the live model, not assumed) |
| Chat model | `openai/gpt-4o-mini` |
| Retrieval | semantic (pgvector) + exact technical token, RRF, platform/service weighting |
| Evidence | deterministic single-document selection |
| Indexing | incremental — a re-run embedded **0** chunks in 38s |

## Reliability & security

- Secrets read only through a `server-only` module; a client import fails the build
- Server-side validation of every field; unknown keys dropped, enums checked
- Oversized input rejected (413) rather than silently truncated
- In-memory per-IP rate limit, 429 with `Retry-After`
- Structured JSON logs: counts and sizes only, never user content, chunks, embeddings, or secrets
- Retrieval or model outage returns safe Persian copy — **never** an ungrounded answer
- `/api/health` reports database state and makes **no** AI call

## Cost

| Path | Embedding | Generation |
|---|---|---|
| Guided deployment step | **0** | **0** |
| Build on Liara planning | **0** | **0** |
| Ambiguous error (clarification) | **0** | **0** |
| Unsupported framework | **0** | **0** |
| General Q&A | 1 | 1 |
| Troubleshooting | 1 | 1 |
| Abstention | 1 | **0** |

No router model, no reranker, no agent loop, no fallback chain. Enforced by tests,
and visible in production logs (the clarification path completes in ~1 ms).

## Production verification

| | |
|---|---|
| URL | https://liara-ai-assistant.liara.run |
| Health | `{"status":"ok","database":"ok"}` |
| PaaS | Liara Next.js, team **لیارا** |
| PostgreSQL | 16.14 · pgvector 0.8.1 · `vector(1536)` |
| Liara AI | workspace `liara-assistant` |
| Core EVALS | **18/18 PASS** |
| Retrieval Source@5 | **5/5 (100%)**, each ranked first |
| DEMO-01 | **PASS** |
| Tests | **398** |
| Live release | commit `2d9616e` (cards, onboarding, modes) |
| Pending deploy | commit `0b42ac7` (compact tiles, anchored composer) |

---

## Submission Copy

### Project name

Lio — لیو

### Short description

لیو یک هم‌تیمی فنی هوشمند برای کاربران لیاراست که خطای پروژه را عیب‌یابی می‌کند و
مسیر دیپلوی را قدم‌به‌قدم پیش می‌برد. جواب‌ها از مستندات رسمی لیارا استخراج
می‌شوند، نه از حافظه‌ی مدل.

### Problem

کاربر تازه‌کار معمولاً یا یک پیام خطا دارد یا یک هدف؛ هیچ‌کدام نمی‌گوید کدام صفحه
از مستندات را باز کند. جست‌وجو در مستندات کار را متوقف می‌کند، و یک دستیار عمومی
هم ممکن است دستور و تنظیمات بی‌پایه بسازد.

### Solution

لیو مستندات را به‌جای کاربر می‌خواند: شواهد را از مخزن رسمی لیارا بازیابی می‌کند،
یک سند را انتخاب می‌کند و یک جواب با یک قدم بعدی می‌دهد. اگر مستندات پشتیبانی
نکند، صادقانه می‌گوید تأیید نکرده است.

### Key features

- عیب‌یابی با لیو — یک تشخیص، یک اقدام، یک منبع
- دیپلوی با لیو — مسیر قدم‌به‌قدم Next.js با حفظ پیشرفت هنگام خطا
- پرسش‌وپاسخ مبتنی بر مستندات رسمی
- خودداری صادقانه به‌جای حدس
- مسیرهای قطعی بدون هیچ فراخوانی مدل

### Technical stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 · Vercel AI SDK →
Liara AI (OpenAI-compatible) · Liara PostgreSQL + pgvector · Liara PaaS

### Live URL

https://liara-ai-assistant.liara.run

### GitHub URL

https://github.com/mahdisatabaki/liara-hackathon

---

## Final checklist

- [x] Production URL reachable
- [x] Health OK (`database: ok`)
- [x] Home polished — Lio identity + two feature cards
- [x] Onboarding works (first visit only, 3 screens, skip)
- [x] عیب‌یابی با لیو works
- [x] دیپلوی با لیو works
- [x] General Q&A works
- [x] ECONNRESET demo passes
- [x] Object Storage answer passes
- [x] Deployment error branch preserves progress
- [x] Core EVALS green (18/18)
- [x] Critical EVALS green
- [x] DEMO-01 green
- [x] Source@5 target met (100%)
- [x] Lio persona verified live
- [x] Mobile verified (375px)
- [x] Desktop verified (768/1280px)
- [x] lint passes
- [x] tests pass (398)
- [x] build passes
- [x] GitHub latest commit pushed
- [ ] **Repository accessible to challenge judges** — currently private; not changed automatically
- [x] Live URL ready to submit
- [ ] **Deploy commit `0b42ac7`** — compact feature tiles and the anchored composer
      are verified locally but not live; Liara's daily deploy quota is exhausted
- [ ] **Add route for `185.142.159.0/24`** — the app moved to that netblock, so the
      public URL is unreachable from the development machine until the split-tunnel
      route is added (needs Administrator)

---

## Development freeze

Feature development is **frozen** for challenge submission. Only P0/P1 defects,
security issues, or a broken demo justify further changes. Post-submission ideas
stay post-MVP.
