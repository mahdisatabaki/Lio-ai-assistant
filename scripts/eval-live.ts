/**
 * Runs the end-to-end evals from `docs/EVALS.md` against a running deployment.
 *
 * Every case goes through the real `/api/chat`: real retrieval, real model, real
 * conversation state. Deterministic cases are asserted precisely; generated
 * Persian text is checked for the properties the evals actually require —
 * grounding, a real source, preserved technical tokens, no invented commands —
 * rather than for exact wording, which is not what the evals specify.
 *
 * Usage: npm run eval:live -- [base-url]
 */

const BASE = process.argv[2] ?? "https://liara-ai-assistant.liara.run";

type State = Record<string, unknown> | null;
type Reply = {
  message: string;
  state: Record<string, unknown> & { currentStep?: string | null; activeJourney?: string | null };
  sources?: { url: string; title: string }[];
  actions?: { id: string }[];
  meta: { intent: string; requestId: string };
};

/** The deployment rate-limits to 20 requests/minute; pace under it. */
const PACE_MS = 3_500;

async function chat(message: string, state: State = null): Promise<Reply> {
  await new Promise((resolve) => setTimeout(resolve, PACE_MS));

  const response = await fetch(`${BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, recentMessages: [], state }),
  });
  if (!response.ok) throw new Error(`${response.status} from /api/chat`);
  return (await response.json()) as Reply;
}

/** Commands and config keys the assistant must never invent. */
const FABRICATION = [
  /liara\s+(deploy|create|login|network)\s+--[a-z-]*(force|auto|magic)/i,
  /superTurboMode/i,
  /liara\s+provision/i,
];

const results: { id: string; pass: boolean; note: string }[] = [];

function record(id: string, pass: boolean, note: string) {
  results.push({ id, pass, note });
  console.log(`${pass ? "PASS" : "FAIL"}  ${id}  ${note}`);
}

const isPersian = (s: string) => /[؀-ۿ]/.test(s);
const grounded = (r: Reply) => (r.sources?.length ?? 0) > 0;
const noFabrication = (s: string) => !FABRICATION.some((p) => p.test(s));

async function general() {
  const cases: [string, string, RegExp][] = [
    ["G-01", "آبجکت استوریج لیارا چیه و کِی باید ازش استفاده کنم؟", /object-storage/i],
    ["G-02", "آیا باید پوشه node_modules رو موقع استقرار روی لیارا آپلود کنم؟", /paas|nextjs/i],
    ["G-03", "برای اجرای برنامه Next.js روی لیارا چه اسکریپتی توی package.json لازمه؟", /paas\/nextjs/i],
  ];

  for (const [id, query, expected] of cases) {
    const reply = await chat(query);
    const src = reply.sources?.some((s) => expected.test(s.url)) ?? false;
    const ok = isPersian(reply.message) && grounded(reply) && noFabrication(reply.message);
    record(id, ok && src, `intent=${reply.meta.intent} sources=${reply.sources?.length ?? 0} expectedSource=${src}`);
  }
}

async function troubleshooting() {
  const t1 = await chat(
    "پروژه Next من روی لیارا بالا میاد ولی این خطا رو می‌بینم:\n`Error: read ECONNRESET`\nباید چیکار کنم؟",
  );
  record(
    "T-01",
    t1.meta.intent === "troubleshooting" &&
      t1.message.includes("ECONNRESET") &&
      grounded(t1) &&
      noFabrication(t1.message),
    `token preserved=${t1.message.includes("ECONNRESET")} sources=${t1.sources?.length ?? 0}`,
  );

  const t2 = await chat(
    "موقع deploy پروژه Next اینو می‌گیرم:\n`npm ERR! network request to package registry failed`\nیه پکیج جدید هم امروز اضافه کردم.",
  );
  record(
    "T-02",
    t2.meta.intent === "troubleshooting" && grounded(t2) && noFabrication(t2.message),
    `sources=${t2.sources?.length ?? 0} mentionsMirror=${/mirror/i.test(t2.message)}`,
  );

  const t3 = await chat(
    'deploy پروژه Next شکست می‌خوره. این بخش package.json منه:\n```json\n{ "scripts": { "dev": "next dev", "build": "next build" } }\n```',
  );
  record(
    "T-03",
    t3.meta.intent === "troubleshooting" && /start/i.test(t3.message) && noFabrication(t3.message),
    `namesStart=${/start/i.test(t3.message)} sources=${t3.sources?.length ?? 0}`,
  );

  const t4 = await chat(
    'پروژه‌م Next هست. این liara.json رو گذاشتم:\n```json\n{ "app": "shop-web", "platform": "node" }\n```\nمشکلی داره؟',
  );
  record(
    "T-04",
    /next/i.test(t4.message) && /platform/i.test(t4.message) && noFabrication(t4.message),
    `mentionsPlatform=${/platform/i.test(t4.message)} sources=${t4.sources?.length ?? 0}`,
  );

  const t5 = await chat("deploy نشد. ارور میده. چیکار کنم؟");
  record(
    "T-05",
    t5.meta.intent === "troubleshooting" && /خطا|ارور|خروجی/.test(t5.message) && (t5.sources?.length ?? 0) === 0,
    `asksForOutput=${/خطا|ارور|خروجی/.test(t5.message)} noModelCall=${(t5.sources?.length ?? 0) === 0}`,
  );

  const t6 = await chat(
    'برای سریع‌تر شدن Next روی لیارا این تنظیم درسته؟\n```json\n{ "next": { "superTurboMode": true } }\n```\nمقدار بهترش چنده؟',
  );
  const abstains = /تأیید|تایید|مطمئن نیستم|پیدا نکردم|حدس/.test(t6.message);
  record("T-06", abstains && !/superTurboMode.*(درست|صحیح|بله)/i.test(t6.message), `abstains=${abstains}`);
}

async function buildOnLiara() {
  const b1 = await chat("یه پروژه ساده Next.js دارم و می‌خوام آنلاینش کنم.");
  const s1 = (b1.state.requiredServices as string[]) ?? [];
  record("B-01", JSON.stringify(s1) === JSON.stringify(["paas-nextjs"]), `services=${JSON.stringify(s1)}`);

  const b2 = await chat("پروژه Next.js دارم که به دیتابیس postgres وصله و می‌خوام آنلاینش کنم.");
  const s2 = (b2.state.requiredServices as string[]) ?? [];
  record("B-02", s2.includes("postgresql") && !s2.includes("object-storage"), `services=${JSON.stringify(s2)}`);

  const b3 = await chat(
    "پروژه Next.js با دیتابیس postgres دارم و کاربرها هم عکس آپلود می‌کنن. می‌خوام آنلاینش کنم.",
  );
  const s3 = (b3.state.requiredServices as string[]) ?? [];
  record("B-03", s3.includes("postgresql") && s3.includes("object-storage"), `services=${JSON.stringify(s3)}`);
}

async function guided() {
  const j1 = await chat("می‌خوام پروژه‌م رو آنلاین کنم.");
  record("J-01", j1.state.currentStep === "D01_CONFIRM_PROJECT", `step=${j1.state.currentStep}`);

  const confirmed = await chat("بله، پروژه‌م Next.js هست. انجام شد.", j1.state);
  const ready = await chat("هم build و هم start رو دارم. انجام شد.", confirmed.state);
  const plan = await chat("قدم‌به‌قدم شروع کنیم. انجام شد.", ready.state);
  const cli = await chat("از قبل نصبه.", plan.state);
  record(
    "J-02",
    confirmed.state.currentStep === "D02_CHECK_READINESS" && cli.state.currentStep === "D05_AUTHENTICATE",
    `skipped completed work -> ${cli.state.currentStep}`,
  );

  const auth = await chat("از قبل لاگین بودم.", cli.state);
  const made = await chat("ساختم. شناسه‌ش 'shop-web'", auth.state);
  const inputs = await chat("آماده‌ست.", made.state);
  const atDeploy = inputs.state.currentStep === "D08_DEPLOY";

  const errored = await chat("موقع استقرار خطا گرفتم:\n`Error: read ECONNRESET`", inputs.state);
  record(
    "J-03",
    errored.meta.intent === "troubleshooting" && errored.state.currentStep === "D08_DEPLOY",
    `step preserved=${errored.state.currentStep} atDeploy=${atDeploy}`,
  );

  const aside = await chat("راستی Object Storage چیه؟", errored.state);
  record(
    "J-04",
    aside.meta.intent === "general" && aside.state.currentStep === "D08_DEPLOY",
    `step preserved=${aside.state.currentStep} sources=${aside.sources?.length ?? 0}`,
  );

  const django = await chat("پروژه Django دارم، می‌خوام آنلاینش کنم.");
  record("J-05", django.state.activeJourney === null, `journey=${django.state.activeJourney}`);

  // DEMO-01: the full golden path, ending in an explicit success.
  const fixed = await chat("درست شد.", aside.state);
  const done = await chat("دیپلوی شد و برنامه بالا اومد.", fixed.state);
  record(
    "DEMO-01",
    fixed.state.currentStep === "D08_DEPLOY" && done.state.currentStep === "D10_DONE",
    `afterFix=${fixed.state.currentStep} final=${done.state.currentStep}`,
  );
}

async function main() {
  console.log(`Running live evals against ${BASE}\n`);
  await general();
  await troubleshooting();
  await buildOnLiara();
  await guided();

  const passed = results.filter((r) => r.pass).length;
  console.log(`\nCore: ${passed}/${results.length} PASS`);
  const failed = results.filter((r) => !r.pass);
  if (failed.length > 0) {
    console.log("Failed:", failed.map((f) => f.id).join(", "));
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`Live eval failed: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
});
