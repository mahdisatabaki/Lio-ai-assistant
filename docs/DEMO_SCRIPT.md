# Demo Script — Lio

**Live:** https://liara-ai-assistant.liara.run
**Length:** ~5 minutes

Lead with what the user gets, not with the architecture. The one sentence to
land: *Lio reads Liara's documentation so the user doesn't have to.*

---

## Scene 1 — First impression (~20s)

Open production in a clean browser profile (or clear `lio_onboarding_v1`) so
onboarding runs.

Three short screens: Lio's introduction → عیب‌یابی با لیو (orange) → دیپلوی با
لیو (purple). Click through; do not read them aloud.

> «لیو مستندات لیارا رو می‌خونه تا کاربر مجبور نباشه.»

## Scene 2 — Home (~20s)

Point at the two cards. That is the product.

> «لیو دو کار اصلی می‌کنه: عیب‌یابی، و دیپلوی قدم‌به‌قدم. سؤال‌های دیگه هم از
> همون کادر پایین پرسیده می‌شن.»

Do not explain architecture yet.

## Scene 3 — عیب‌یابی با لیو (~60s)

Click **عیب‌یابی با لیو**, then paste:

```text
پروژه Next من روی لیارا بالا میاد ولی این خطا رو می‌بینم:
Error: read ECONNRESET
```

Point out, in this order:

1. **تشخیص** — one cause, not a list of five
2. **قدم بعدی** — one concrete action
3. `ECONNRESET` preserved exactly
4. exactly **one** source, and it is Liara's dedicated ECONNRESET page

> «کاربر مستندات رو نگشت. لیو صفحه‌ی درست رو پیدا کرد و جواب عملی داد.»

## Scene 4 — Grounding (~15s)

Point at the source card. Do **not** open it.

> «منبع برای اعتماد و راستی‌آزماییه. جواب رو کاربر همین‌جا داره.»

## Scene 5 — دیپلوی با لیو (~70s)

New conversation → **دیپلوی با لیو**. Walk the steps:

| Type | Shows |
|---|---|
| `بله، پروژه‌م Next.js هست. انجام شد.` | D02 readiness |
| `هم build و هم start رو دارم. انجام شد.` | D03 — Build on Liara plan: PaaS only |
| `قدم‌به‌قدم شروع کنیم. انجام شد.` | D04 CLI |
| `از قبل نصبه.` | D05 — already-done work is skipped |
| `از قبل لاگین بودم.` | D06 resources |
| `ساختم. شناسه‌ش 'shop-web'` | D07 — the app id is remembered |
| `آماده‌ست.` | D08 — `liara deploy --app=shop-web --platform=next` |

Two things to call out: the plan recommends **only** PaaS because nothing else
was described, and the deploy command carries **their** app id, not a
placeholder.

> «هیچ‌کدوم از این قدم‌ها یک فراخوانی مدل هم هزینه نداشت.»

## Scene 6 — Error during deployment (the strongest moment) (~60s)

At D08, paste:

```text
موقع استقرار خطا گرفتم:
Error: read ECONNRESET
```

Show: the header switches to **عیب‌یابی** (orange), and the journey strip still
reads **مرحله ۸**. Then type `درست شد.`

> «مرحله‌ی دیپلوی گم نشد. لیو رفت سراغ خطا و بعد به همون مرحله برگشت — و
> ادعا نکرد که دیپلوی تموم شده.»

## Scene 7 — Completion (~20s)

Type `دیپلوی شد و برنامه بالا اومد.` → D10 DONE.

> «فقط با تأیید خود کاربر تموم شد، نه چون دستور نمایش داده شده بود.»

## Scene 8 — Side question (~30s)

Type `راستی Object Storage چه زمانی به درد پروژه‌م می‌خوره؟`

Show: a direct answer, one Object Storage source, and the deployment step still
intact.

## Scene 9 — Close (~15s)

> «لیو پیچیدگی مستندات و دیپلوی لیارا رو برای یک کاربر تازه‌کار تبدیل می‌کنه به
> یک قدم بعدی روشن.»

---

## Demo fallback

If Liara AI or the database is unreachable during judging, these still work and
are honest to show, because they need **no** model call:

- Home, onboarding, both feature cards
- the whole guided deployment journey (D01–D10) including the error branch
- Build on Liara service planning
- the ambiguous-error clarification
- `/api/health`
- responsive behavior and RTL/LTR handling

Lio will say plainly that it cannot reach its sources rather than answering
ungrounded — that failure behavior is itself worth showing.

**Do not** present recorded output as live, and do not fake an AI answer.

---

## Final Rehearsal

**Date:** 2026-08-21
**Target:** https://liara-ai-assistant.liara.run (production)
**Result:** **PASS** — 13/13 steps

Executed against production, not a local build:

| Scene | Check | Result |
|---|---|---|
| 3 | ECONNRESET → diagnosis, token preserved, 1 canonical source | PASS |
| 5 | D01 → D08, each step advancing only on a completion signal | PASS |
| 5 | App id `shop-web` remembered and used in the deploy command | PASS |
| 6 | Error at D08 → troubleshooting, step held at D08 | PASS |
| 8 | Side question answered, D08 still held, Object Storage source | PASS |
| 6 | `درست شد.` → back to D08, error cleared | PASS |
| 7 | `دیپلوی شد…` → D10 DONE | PASS |

Notes: every guided step returned zero sources, confirming no model call on the
deterministic path. Health reported `database: ok` throughout.
