# EVAL Run Record

**Date:** 2026-08-21 · **Target:** https://liara-ai-assistant.liara.run (team لیارا)

Every case below ran against the **deployed application** using the real Liara AI
model and the real pgvector index — not mocks. Reproduce with:

```bash
npm run eval:live
```

```bash
npm run eval:retrieval
```

## Production configuration

| | |
|---|---|
| Chat model | `openai/gpt-4o-mini` |
| Embedding model | `openai/text-embedding-3-small` |
| Embedding dimension | **1536**, probed from the live model, not assumed |
| PostgreSQL | 16.14 · pgvector 0.8.1 |
| Index | 5,441 chunks · 1,143 files · 0 failures |
| Second index run | 5,441 unchanged · **0 embedded** · 38s |

## Results — 18/18 PASS

| Eval | Result | Evidence |
|---|---|---|
| G-01 Object Storage concept | PASS | 5 sources, all `object-storage`, correct page first |
| G-02 `node_modules` upload | PASS | routes to Q&A, cites `paas` docs |
| G-03 required `start` script | PASS | cites `paas/nextjs` |
| T-01 `ECONNRESET` | PASS | token preserved, dedicated error page first, one documented action |
| T-02 npm mirror | PASS | mentions mirror, 4 grounded sources |
| T-03 missing `start` | PASS | names `start` from the pasted `package.json` |
| T-04 `platform: "node"` | PASS | identifies the mismatch |
| T-05 ambiguous failure | PASS | asks for the error text, **zero** model calls |
| T-06 `superTurboMode` | PASS | *«کلید «superTurboMode» در مستندات لیارا پیدا نشد. تأییدش نکردم.»* |
| B-01 / B-02 / B-03 | PASS | `[paas]` / `+postgresql` / `+object-storage`, nothing unrequested |
| J-01 … J-05 | PASS | journey start, skip completed work, error and side question both preserve `D08_DEPLOY`, Django refused |
| DEMO-01 | PASS | fixed error returns to `D08_DEPLOY`; explicit success reaches `D10_DONE` |

## Retrieval — Expected Source @5 = 5/5 (100%)

Every expected source ranked **first**, with both arms contributing.

| Eval | Rank | Top source |
|---|---|---|
| R-01 | @1 | `paas/nextjs/fix-common-errors/econnreset/` |
| R-02 | @1 | `paas/nextjs/how-tos/deploy-app/` |
| R-03 | @1 | `paas/nextjs/how-tos/deploy-app/` › mirror |
| R-04 | @1 | `paas/liarajson/` › NextJS |
| R-05 | @1 | `object-storage/details/about/` |

## Failures found and fixed during this run

Three real defects, all caught by running against production rather than mocks.

**1. Wrong sources on Persian product names (P0).** «آبجکت استوریج» produced a
correct-sounding Persian answer citing the AI SDK's `generate-object` cookbook
pages. The docs use English product names, so the transliteration extracted no
lexical token and bare semantic search drifted to whatever repeated the word
"object". Fixed by mapping Persian spellings to their English tokens.

**2. Service drift in the semantic arm (P1).** Even after that, the entire
unfiltered semantic top-8 was AI-cookbook pages — the real Object Storage docs
never reached the candidate set, so no re-weighting could have rescued them. A
service-scoped second pass now runs alongside the general one. A wrong service
guess degrades to ordinary behavior rather than hiding the answer.

**3. Factual questions hijacked the guided journey (P1).** «آیا باید
node_modules رو موقع استقرار آپلود کنم؟» started the deployment journey because
it contains «استقرار». A question built around a technical literal is now
answered as a documentation question. `node_modules` also needed a
`lower_snake` token pattern to be recognised at all.

Each fix is retrieval or routing only — no reranker, no router, no architecture
change.

## Cost budget — verified in production logs

| Path | Retrieval | Generation |
|---|---|---|
| Guided step · Build on Liara · ambiguous error · unsupported framework | **0** | **0** |
| General Q&A · troubleshooting · journey side question | 1 | 1 |
| Abstention | 1 | **0** |

Production logs show the clarification path completing in ~1 ms with
`retrieval_count: 0`. No router model, reranker, agent loop, or fallback chain
exists in the codebase; 286 unit tests enforce these counts.

## Release gate

| Gate | Result |
|---|---|
| ≥16/17 core EVALS pass | **18/18** |
| All critical cases pass | **Yes** |
| Zero fabricated Liara commands/config | **Yes** — T-06 abstains; commands are read from current docs |
| Expected Source @5 ≥ 85% | **100%** |
| DEMO-01 pass | **Yes** |
| Production reachable | **Yes** — `/` 200, health `database: ok` |
