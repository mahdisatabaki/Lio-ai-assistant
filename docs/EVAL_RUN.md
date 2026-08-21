# EVAL Run Record

**Date:** 2026-08-21 · **Commit:** final MVP batch (BL-080…BL-084)

## How to read this

The pipeline splits cleanly into two halves, and only one of them could be run:

- **Deterministic** — routing, journey state, service planning, config
  inspection, cost budget, failure behavior. Runs with no external dependency.
  Verified by the automated suite (265 tests) and by smoke runs against a
  running server.
- **Generative** — the wording and correctness of model output. Needs live
  Liara AI. **Not run.** Liara refuses this machine's VPN exit IP and applying
  the split-tunnel route needs Administrator rights this session did not have.

Nothing below is marked PASS on the strength of a mock where the eval is really
about model quality. Those are BLOCKED, and they are the honest gap in this
submission.

---

## General Q&A

| Eval | Status | Notes |
|---|---|---|
| G-01 Object Storage concept | BLOCKED | Needs live model. Retrieval half verified (R-05 PASS). |
| G-02 `node_modules` upload | BLOCKED | Needs live model. |
| G-03 required `start` script | BLOCKED | Needs live model. Retrieval half verified (R-02 PASS). |

The pipeline these depend on *is* verified: exactly one retrieval and one
generation, sources taken from retrieval metadata, abstention when evidence is
thin. What is unverified is whether the model's Persian answer is good.

## Troubleshooting

| Eval | Status | Notes |
|---|---|---|
| T-01 `ECONNRESET` | PARTIAL | Routing, token preservation, and source selection PASS — the dedicated Liara ECONNRESET page ranks #1. Answer wording BLOCKED. |
| T-02 npm mirror | PARTIAL | Routing PASS; the Next.js mirror section ranks #1 (R-03). Answer wording BLOCKED. |
| T-03 missing `start` | PASS | Detected deterministically from the pasted `package.json`; no questionnaire first. |
| T-04 `platform: "node"` | PASS | Mismatch detected; silent when the value is `next` or the project is not Next.js. |
| T-05 ambiguous failure | PASS | Asks for the error text and spends zero model calls. |
| T-06 undocumented key | PASS | `superTurboMode` flagged as unverified; documented `mirror` not flagged. |

T-03, T-04, T-05, and T-06 are deterministic by design — that is why they pass
without a model, and why a model outage cannot regress them.

## Build on Liara

| Eval | Status | Notes |
|---|---|---|
| B-01 simple Next.js | PASS | PaaS only. |
| B-02 + PostgreSQL | PASS | PaaS + PostgreSQL, with a reason. |
| B-03 + persistent uploads | PASS | PaaS + PostgreSQL + Object Storage, with a reason. |

Also verified: a project that merely displays static images does **not** get
Object Storage. Zero model calls on all three.

## Guided journey

| Eval | Status | Notes |
|---|---|---|
| J-01 start Next.js journey | PASS | D01 → D08 verified end to end against a running server. |
| J-02 skip completed work | PASS | "از قبل نصبه" / "از قبل لاگین بودم" advance without redoing the step. |
| J-03 error during deployment | PASS | Step preserved, troubleshooting entered, returns to the same step. |
| J-04 side question | PASS | Journey, step, completed steps, and app id all preserved. |
| J-05 unsupported framework | PASS | Django never enters the journey; grounded Q&A offered instead. |

## Retrieval

Measured against the real `liara-cloud/docs` corpus (1,143 files → 5,441 chunks)
using the **exact-token arm only** — the semantic arm needs embeddings.

| Eval | Status | Top-ranked source |
|---|---|---|
| R-01 `ECONNRESET` | PASS | `paas/nextjs/fix-common-errors/econnreset/` |
| R-02 `package.json` + `start` | PASS | `paas/nextjs/how-tos/deploy-app/` |
| R-03 npm mirror | PASS | `paas/nextjs/how-tos/deploy-app/` › "mirror لیارا" |
| R-04 `liara.json` + platform | PASS | `paas/nextjs/how-tos/deploy-app/` › "فایل liara.json" |
| R-05 Object Storage | PASS | `object-storage/details/about/` |

**Expected Source @5: 5/5 (100%)**, every one ranked #1. Against the ≥85% target
— but on one arm of two, so treat it as a strong floor rather than the final
hybrid number.

Three tuning changes got this from 3/5 to 5/5, in the order the backlog
prescribes (tokens → weighting → parameters), with no reranker:

1. **Field weighting** — title 3 / heading 2 / content 1. Liara repeats
   `## فایل liara.json` on every platform page, so flat counting ranked an
   unrelated email-server page above Next.js.
2. **Liara domain terms** — `object storage`, `bucket`, `mirror`, `pgvector`.
   R-05 previously produced no tokens at all.
3. **Platform weighting** — a query naming Next.js prefers `platform = 'nextjs'`.
   Liara documents identical guidance per platform, so `mirror` matched Angular,
   Django, and Flask equally.

While adding (3) a control-byte bug had silently disabled it entirely: a `\b` in
the platform regex had been written as a literal backspace (0x08), so only the
Persian alternative ever matched and every Latin "Next" query fell through. The
regression test in `lib/rag/platform.test.ts` is what surfaced it.

## Golden demo

| Eval | Status |
|---|---|
| DEMO-01 | PARTIAL — the full 13-step run in `docs/DEMO.md` works against a running server; the two grounded-answer moments (steps 10 and 11) return the safe "cannot reach sources" message instead of a grounded answer. |

## Cost budget

Enforced by tests, not asserted in prose:

| Path | retrieval | generation |
|---|---|---|
| Guided step / held step | 0 | 0 |
| Build on Liara planning | 0 | 0 |
| Ambiguous error | 0 | 0 |
| Unsupported framework | 0 | 0 |
| General Q&A | 1 | 1 |
| Troubleshooting | 1 | 1 |
| Journey side question | 1 | 1 |
| Abstention | 1 | 0 |
| Failed generation | 1 | 1 (no retry, no fallback chain) |

No reranker, router, or autonomous loop exists in the codebase.

---

## Release gate

| Gate | Result |
|---|---|
| ≥16/17 core EVALS PASS | **Not met** — 12 PASS, 3 PARTIAL, 3 BLOCKED (all gaps are model-output quality) |
| All critical EVALS PASS | **Partially** — T-03…T-06 PASS; T-01/T-02 pass everything except answer wording |
| 0 fabricated Liara commands | **Met** — every command is read from current official docs; a test asserts the docs' own `myapp` placeholder is never echoed |
| Source @5 ≥ 85% | **Met** — 5/5 on the exact-token arm |
| DEMO-01 PASS | **Partial** — full flow works; grounded answers blocked |
| Production app reachable | **Not met** — blocked by local VPN routing |

The gate is not claimed as passed. Every unmet item traces to one external
cause: no network path from this machine to Liara.
