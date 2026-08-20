import { buildPlan, type ProjectNeeds } from "./plan";
import type { DeploymentPlan, JourneyStepId, NextAction } from "./types";

/**
 * Guided Next.js deployment content for D01–D03 (`docs/TECH.md` 9.3).
 *
 * Step text is deterministic data, not model output. These steps are the same
 * every time, so generating them would add cost, latency, and a chance of
 * inventing a command. D04–D10 are BL-062.
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
    { id: "confirm-nextjs", label: "بله، Next.js هست", send: "بله، پروژه‌م Next.js هست." },
    { id: "other-framework", label: "نه، چیز دیگه‌ست", send: "نه، پروژه‌م Next.js نیست." },
  ],
};

const READINESS: JourneyStepView = {
  id: "D02_CHECK_READINESS",
  body: [
    "عالی. قبل از هر کاری یه چیز رو چک کنیم که بیشترین دردسر رو می‌سازه:",
    "",
    "توی `package.json` پروژه‌ت، بخش `scripts` رو ببین. برای اجرای برنامه روی لیارا به `build` و `start` نیاز داری.",
    "",
    "محتوای `scripts` رو همین‌جا بفرست تا با هم نگاه کنیم.",
  ].join("\n"),
  actions: [
    {
      id: "scripts-ok",
      label: "build و start رو دارم",
      send: "توی package.json هم build و هم start رو دارم.",
    },
    {
      id: "paste-scripts",
      label: "package.json رو می‌فرستم",
      send: "این بخش scripts فایل package.json منه:",
    },
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
        ? "پروژه‌ت ساده‌ست و فعلاً فقط به خود سرویس PaaS نیاز داری. سرویس اضافه‌ای بهت پیشنهاد نمی‌دم چون نیازش رو ندیدم."
        : "سرویس‌ها رو بر اساس چیزی که خودت گفتی انتخاب کردم، نه بیشتر.",
    ].join("\n"),
    plan,
    actions: [
      {
        id: "start-steps",
        label: "قدم‌به‌قدم شروع کنیم",
        send: "قدم‌به‌قدم شروع کنیم.",
      },
      { id: "needs-db", label: "دیتابیس هم لازم دارم", send: "پروژه‌م دیتابیس هم لازم داره." },
      {
        id: "needs-uploads",
        label: "کاربرها فایل آپلود می‌کنن",
        send: "کاربرهای سایت فایل و عکس آپلود می‌کنن.",
      },
    ],
  };
}

/** Returns the view for a step, or null once past the implemented range. */
export function journeyStepView(
  step: JourneyStepId,
  needs: ProjectNeeds,
): JourneyStepView | null {
  switch (step) {
    case "D01_CONFIRM_PROJECT":
      return CONFIRM;
    case "D02_CHECK_READINESS":
      return READINESS;
    case "D03_BUILD_PLAN":
      return planStep(needs);
    default:
      // D04 onward is BL-062. Say so rather than inventing deployment commands.
      return null;
  }
}

export const PENDING_STEPS_MESSAGE = [
  "تا اینجا نقشه کار مشخص شده.",
  "",
  "قدم‌های بعدی (نصب Liara CLI، ورود به حساب، ساخت سرویس و استقرار) هنوز توی این نسخه اضافه نشده‌اند. تا اون موقع اگر سؤالی داری یا به خطایی خوردی، همین‌جا بپرس.",
].join("\n");

export const UNSUPPORTED_FRAMEWORK_MESSAGE = [
  "راستش رو بگم: مسیر قدم‌به‌قدم فعلاً فقط برای **Next.js** آماده شده، پس نمی‌خوام برای فریم‌ورک دیگه‌ای ادعای راهنمای دقیق کنم.",
  "",
  "ولی سؤال‌هات درباره لیارا رو همچنان می‌تونم با تکیه بر مستندات جواب بدم. بپرس.",
].join("\n");

export const UNSUPPORTED_FRAMEWORK_ACTIONS: NextAction[] = [
  {
    id: "ask-general",
    label: "یه سؤال درباره لیارا دارم",
    send: "یه سؤال درباره لیارا دارم.",
  },
  {
    id: "switch-nextjs",
    label: "پروژه Next.js دارم",
    send: "پروژه Next.js دارم و می‌خوام آنلاینش کنم.",
  },
];
