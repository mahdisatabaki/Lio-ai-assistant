import { buildPlan, type ProjectNeeds } from "./plan";
import type { DeploymentPlan, JourneyStepId, NextAction } from "./types";

/**
 * Guided Next.js deployment content (`docs/TECH.md` 9.3).
 *
 * Step text is deterministic data, not model output — the same every time, so
 * generating it would add cost, latency, and a chance of inventing a command.
 *
 * Every command below is taken from the current official Liara documentation
 * (`paas/nextjs/quick-start` and `paas/nextjs/how-tos/deploy-app`), not from
 * memory. The assistant only ever shows a command; it never runs one and never
 * implies it did.
 */

export type JourneyStepView = {
  id: JourneyStepId;
  body: string;
  actions: NextAction[];
  plan?: DeploymentPlan;
};

const CONFIRM: JourneyStepView = {
  id: "D01_CONFIRM_PROJECT",
  body: [
    "باشه، بریم که پروژه‌ت رو آنلاین کنیم.",
    "",
    "فعلاً مسیر قدم‌به‌قدم رو برای پروژه‌های **Next.js** آماده کردم. پروژه تو Next.js هست؟",
  ].join("\n"),
  actions: [
    { id: "confirm-nextjs", label: "بله، Next.js هست", send: "بله، پروژه‌م Next.js هست. انجام شد." },
    { id: "other-framework", label: "نه، چیز دیگه‌ست", send: "نه، پروژه‌م Next.js نیست." },
  ],
};

const READINESS: JourneyStepView = {
  id: "D02_CHECK_READINESS",
  body: [
    "عالی. اول یه چیز رو چک کنیم که بیشترین دردسر رو می‌سازه.",
    "",
    "توی `package.json` پروژه‌ت باید `build` و `start` داشته باشی. نمونه‌ی استاندارد Next.js این شکلیه:",
    "",
    "```json",
    '{\n  "scripts": {\n    "dev": "next dev",\n    "build": "next build",\n    "start": "next start"\n  }\n}',
    "```",
    "",
    "بخش `scripts` خودت رو نگاه کن. اگر فرق داره، همین‌جا بفرستش.",
  ].join("\n"),
  actions: [
    { id: "scripts-ok", label: "هر دو رو دارم", send: "هم build و هم start رو دارم. انجام شد." },
    { id: "paste-scripts", label: "package.json رو می‌فرستم", send: "این بخش scripts فایل package.json منه:" },
  ],
};

function planStep(needs: ProjectNeeds): JourneyStepView {
  const plan = buildPlan(needs);
  const onlyPaas = plan.services.length === 1;

  return {
    id: "D03_BUILD_PLAN",
    body: [
      "این نقشه کاریه که جلومونه:",
      "",
      onlyPaas
        ? "پروژه‌ت ساده‌ست و فعلاً فقط به خود سرویس PaaS نیاز داری. سرویس اضافه‌ای پیشنهاد نمی‌دم چون نیازش رو ندیدم."
        : "سرویس‌ها رو بر اساس چیزی که خودت گفتی انتخاب کردم، نه بیشتر.",
    ].join("\n"),
    plan,
    actions: [
      { id: "start-steps", label: "قدم‌به‌قدم شروع کنیم", send: "قدم‌به‌قدم شروع کنیم. انجام شد." },
      { id: "needs-db", label: "دیتابیس هم لازم دارم", send: "پروژه‌م دیتابیس postgres هم لازم داره." },
      { id: "needs-uploads", label: "کاربرها فایل آپلود می‌کنن", send: "کاربرهای سایت فایل و عکس آپلود می‌کنن." },
    ],
  };
}

const ENSURE_CLI: JourneyStepView = {
  id: "D04_ENSURE_CLI",
  body: [
    "برای استقرار از **Liara CLI** استفاده می‌کنیم.",
    "",
    "اگر هنوز نصبش نکردی، این دستور رو توی ترمینال بزن:",
    "",
    "```bash",
    "npm install -g @liara/cli",
    "```",
    "",
    "برای این کار باید Node.js و npm روی سیستمت نصب باشه. اگر از قبل CLI رو داری، از این مرحله رد می‌شیم.",
  ].join("\n"),
  actions: [
    { id: "cli-installed", label: "نصب شد", send: "Liara CLI نصب شد." },
    { id: "cli-already", label: "از قبل نصبه", send: "از قبل نصبه." },
    { id: "cli-error", label: "موقع نصب خطا گرفتم", send: "موقع نصب CLI خطا گرفتم:" },
  ],
};

const AUTHENTICATE: JourneyStepView = {
  id: "D05_AUTHENTICATE",
  body: [
    "حالا وارد حساب لیارات شو:",
    "",
    "```bash",
    "liara login",
    "```",
    "",
    "این دستور رو خودت توی ترمینال اجرا کن. من به حسابت دسترسی ندارم و رمزت رو هم لازم ندارم — فقط بگو کِی تموم شد.",
  ].join("\n"),
  actions: [
    { id: "logged-in", label: "لاگین کردم", send: "لاگین کردم." },
    { id: "already-auth", label: "از قبل لاگین بودم", send: "از قبل لاگین بودم." },
    { id: "login-error", label: "لاگین نشد", send: "موقع لاگین خطا گرفتم:" },
  ],
};

const CREATE_RESOURCES: JourneyStepView = {
  id: "D06_CREATE_RESOURCES",
  body: [
    "حالا برنامه‌ت رو روی لیارا بساز. اگر از قبل ساختیش، لازم نیست دوباره بسازی — فقط شناسه‌ش رو بهم بگو.",
    "",
    "اول شبکه خصوصی (اگر نداری):",
    "",
    "```bash",
    "liara network create",
    "```",
    "",
    "بعد خود برنامه:",
    "",
    "```bash",
    "liara create",
    "```",
    "",
    "توی مراحلش ازت شناسه، نوع پلتفرم، شبکه خصوصی و منابع رو می‌پرسه. **نوع پلتفرم رو روی `next` بذار.**",
    "",
    "وقتی ساخته شد، شناسه‌ی برنامه رو برام بنویس تا توی دستور استقرار ازش استفاده کنم.",
  ].join("\n"),
  actions: [
    { id: "app-created", label: "ساختم", send: "برنامه رو ساختم. شناسه‌ش " },
    { id: "app-exists", label: "از قبل دارمش", send: "از قبل برنامه رو دارم. شناسه‌ش " },
    { id: "create-error", label: "خطا گرفتم", send: "موقع ساخت برنامه خطا گرفتم:" },
  ],
};

const PREPARE_INPUTS: JourneyStepView = {
  id: "D07_PREPARE_INPUTS",
  body: [
    "قبل از استقرار، دو تا چیز رو مطمئن شو:",
    "",
    "**۱. `node_modules` آپلود نشه.** لیارا خودش موقع استقرار می‌سازتش. توی `.gitignore` یا `.liaraignore` این خط باشه:",
    "",
    "```gitignore",
    "node_modules/",
    "```",
    "",
    "**۲. `package.json` دست‌نخورده باشه** و `build` و `start` رو داشته باشه (همون که بالاتر چک کردیم).",
    "",
    "اگر بخوای، می‌تونی `liara.json` هم بذاری تا لازم نباشه هر بار فلگ بدی:",
    "",
    "```json",
    '{\n  "app": "your-app-id",\n  "platform": "next"\n}',
    "```",
  ].join("\n"),
  actions: [
    { id: "inputs-ready", label: "آماده‌ست", send: "آماده‌ست." },
    { id: "inputs-question", label: "یه سؤال دارم", send: "درباره این مرحله یه سؤال دارم: " },
  ],
};

function deployStep(appId: string | null): JourneyStepView {
  // The docs use a `myapp` placeholder. If the user told us their id, using it
  // is the difference between a command they can paste and one they must edit.
  const app = appId ?? "your-app-id";

  return {
    id: "D08_DEPLOY",
    body: [
      "حالا وقتشه. توی مسیر اصلی پروژه این دستور رو بزن:",
      "",
      "```bash",
      `liara deploy --app=${app} --platform=next`,
      "```",
      "",
      appId
        ? "شناسه‌ای که خودت دادی رو گذاشتم."
        : "به‌جای `your-app-id` شناسه‌ی برنامه‌ت رو بذار.",
      "",
      "لاگ استقرار توی ترمینال خودت نشون داده می‌شه. من اجراش نمی‌کنم و از بیرون هم نمی‌بینمش — نتیجه رو برام بفرست.",
    ].join("\n"),
    actions: [
      { id: "deploy-ok", label: "دیپلوی شد", send: "دیپلوی شد و برنامه بالا اومد." },
      { id: "deploy-log", label: "خروجی رو می‌فرستم", send: "این خروجی استقراره:" },
      { id: "deploy-error", label: "خطا داد", send: "موقع استقرار خطا گرفتم:" },
    ],
  };
}

const DONE: JourneyStepView = {
  id: "D10_DONE",
  body: [
    "🎉 تموم شد. پروژه‌ت روی لیارا بالاست.",
    "",
    "از این به بعد هر بار که تغییری دادی، همون دستور `liara deploy` رو بزن تا نسخه‌ی جدید مستقر بشه.",
    "",
    "اگر بعداً به خطایی خوردی یا سؤالی داشتی، همین‌جا بپرس.",
  ].join("\n"),
  actions: [
    { id: "new-question", label: "یه سؤال دیگه دارم", send: "یه سؤال درباره لیارا دارم." },
  ],
};

export function journeyStepView(
  step: JourneyStepId,
  needs: ProjectNeeds,
  appId: string | null = null,
): JourneyStepView | null {
  switch (step) {
    case "D01_CONFIRM_PROJECT":
      return CONFIRM;
    case "D02_CHECK_READINESS":
      return READINESS;
    case "D03_BUILD_PLAN":
      return planStep(needs);
    case "D04_ENSURE_CLI":
      return ENSURE_CLI;
    case "D05_AUTHENTICATE":
      return AUTHENTICATE;
    case "D06_CREATE_RESOURCES":
      return CREATE_RESOURCES;
    case "D07_PREPARE_INPUTS":
      return PREPARE_INPUTS;
    case "D08_DEPLOY":
      return deployStep(appId);
    case "D10_DONE":
      return DONE;
    default:
      return null;
  }
}

/** Held at the current step when a reply was not a recognizable result. */
export const HOLDING_MESSAGE = [
  "هنوز روی همین مرحله‌ایم.",
  "",
  "وقتی این قدم رو انجام دادی بگو تا بریم سراغ بعدی؛ اگر هم به مشکلی خوردی، متن خطا رو بفرست.",
].join("\n");

export const UNSUPPORTED_FRAMEWORK_MESSAGE = [
  "راستش رو بگم: مسیر قدم‌به‌قدم فعلاً فقط برای **Next.js** آماده شده، پس نمی‌خوام برای فریم‌ورک دیگه‌ای ادعای راهنمای دقیق کنم.",
  "",
  "ولی سؤال‌هات درباره لیارا رو همچنان می‌تونم با تکیه بر مستندات جواب بدم — از نصب CLI تا تنظیمات و خطاها. بپرس.",
].join("\n");

export const UNSUPPORTED_FRAMEWORK_ACTIONS: NextAction[] = [
  { id: "ask-general", label: "یه سؤال درباره لیارا دارم", send: "یه سؤال درباره لیارا دارم." },
  { id: "switch-nextjs", label: "پروژه Next.js دارم", send: "پروژه Next.js دارم و می‌خوام آنلاینش کنم." },
];
