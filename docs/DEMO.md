# Demo Script

One continuous conversation, about three minutes. It shows conversation state,
grounded retrieval, troubleshooting, and guided deployment without any
multi-agent machinery.

Refresh the page first — the conversation is session-local and starts clean.

---

## The run

| # | You type / click | What to point at |
|---|---|---|
| 1 | *(Home)* | Two entry points in beginner language, not "Deploy Application". You can also just type. |
| 2 | `می‌خوام پروژه‌م رو آنلاین کنم` | Intent detected without a mode picker. Journey starts at D01. |
| 3 | `بله، پروژه‌م Next.js هست. انجام شد.` | Advances to readiness. Progress strip shows the step. |
| 4 | `هم build و هم start رو دارم. انجام شد.` | **Build on Liara plan**: PaaS only. No database, no object storage — because none was described. |
| 5 | `قدم‌به‌قدم شروع کنیم. انجام شد.` | Deterministic step content. Zero model calls so far. |
| 6 | `از قبل نصبه.` → `از قبل لاگین بودم.` | Steps the user already did are skipped, not re-asked. |
| 7 | `ساختم. شناسه‌ش 'shop-web'` | The app id is remembered. |
| 8 | `آماده‌ست.` | D08 shows `liara deploy --app=shop-web --platform=next` — **their** id, not a placeholder. |
| 9 | `راستش امروز خیلی خسته‌ام` | A stray remark does **not** advance the step. |
| 10 | `راستی Object Storage چیه؟` | Grounded answer with a source — and the deployment step is still D08. |
| 11 | Paste: ``موقع استقرار خطا گرفتم:`Error: read ECONNRESET` `` | Switches to troubleshooting. Retrieves Liara's dedicated ECONNRESET page. One next action, with source. Step still D08. |
| 12 | `درست شد.` | Error cleared, returns to D08 — it does **not** declare the deployment finished. |
| 13 | `دیپلوی شد و برنامه بالا اومد.` | Only now does it complete. |

---

## What each moment demonstrates

- **Steps 2–8** — conversation state and personalization: framework, app id, and
  completed steps carry forward; nothing is asked twice.
- **Step 4** — minimum-services planning. The absence of Object Storage is the
  point.
- **Steps 9–10** — agentic behavior without an agent: a stray remark holds
  position, a question is answered without losing the journey.
- **Step 11** — RAG grounding on an exact technical token, with a real source.
- **Steps 12–13** — conservative completion. A fixed error is not a finished
  deployment.

---

## Two extras worth showing

**It refuses to invent.** Ask:

```text
برای سریع‌تر شدن Next روی لیارا این تنظیم درسته؟
{ "next": { "superTurboMode": true } }
```

It flags the key as unverified rather than inventing a value.

**It stays inside what it supports.** Ask for a guided Django deployment: it
declines to fake a journey it does not have, and offers grounded Q&A instead.
