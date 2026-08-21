/**
 * Runs the retrieval checks from `docs/EVALS.md` section 11 against the real
 * pipeline: live query embedding, production pgvector, exact-token retrieval,
 * platform weighting, and deterministic merge.
 *
 * Operator command, not part of the application.
 *
 * Usage: npm run eval:retrieval
 */
import { retrieveDocumentation } from "../lib/rag/retrieve.ts";

type Case = {
  id: string;
  query: string;
  /** Matches the expected source path or URL. */
  expect: RegExp;
};

/** Query signals taken from docs/EVALS.md section 11 and the matching T-cases. */
const CASES: Case[] = [
  {
    id: "R-01",
    query: "پروژه Next من روی لیارا این خطا رو می‌ده: Error: read ECONNRESET",
    expect: /econnreset/i,
  },
  {
    id: "R-02",
    query: "deploy پروژه Next شکست می‌خوره، توی package.json اسکریپت start ندارم",
    expect: /paas\/nextjs/i,
  },
  {
    id: "R-03",
    query: "موقع deploy پروژه Next خطای npm ERR! می‌گیرم، next mirror false",
    expect: /paas\/nextjs/i,
  },
  {
    id: "R-04",
    query: "پروژه‌م Next هست و توی liara.json مقدار platform رو چی بذارم؟",
    expect: /paas\/nextjs|liarajson/i,
  },
  {
    id: "R-05",
    query: "Object Storage لیارا چیه و برای فایل‌های ماندگار کاربر چطور bucket بسازم؟",
    expect: /object-storage/i,
  },
];

async function main() {
  let hits = 0;

  for (const testCase of CASES) {
    const result = await retrieveDocumentation(testCase.query);
    const top5 = result.chunks.slice(0, 5);
    const position = top5.findIndex(
      (chunk) => testCase.expect.test(chunk.sourceUrl) || testCase.expect.test(chunk.sourcePath),
    );

    if (position >= 0) hits += 1;

    console.log(
      `\n${testCase.id} ${position >= 0 ? `PASS @${position + 1}` : "MISS"}` +
        `  tokens=[${result.tokens.join(", ")}] exact=${result.hasExactMatch}`,
    );

    top5.forEach((chunk, i) => {
      const arms = chunk.matchedBy.join("+");
      console.log(
        `   ${i + 1}. ${chunk.sourceUrl}${chunk.heading ? ` (${chunk.heading})` : ""} [${arms}]`,
      );
    });
  }

  const pct = Math.round((hits / CASES.length) * 100);
  console.log(`\nExpected Source @5: ${hits}/${CASES.length} (${pct}%)`);

  const { closePool } = await import("../lib/server/db.ts");
  await closePool();

  if (pct < 85) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`Retrieval eval failed: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
});
