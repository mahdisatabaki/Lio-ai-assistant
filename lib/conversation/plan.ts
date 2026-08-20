import type { DeploymentPlan, RequiredService } from "./types";

/**
 * Build on Liara service planning (`docs/TECH.md` 10).
 *
 * Deterministic mapping, no model call. The rule that matters is subtractive:
 * a service appears only when the user described a need for it. Recommending
 * Object Storage to someone who never mentioned uploads is the exact failure
 * this planner exists to prevent.
 */

export type ProjectNeeds = {
  framework: "nextjs" | "unsupported" | "unknown";
  needsPostgres: boolean;
  needsPersistentUploads: boolean;
};

const POSTGRES_TERMS = [
  "postgres",
  "postgresql",
  "پستگرس",
  "پستگرES",
  "دیتابیس",
  "پایگاه داده",
  "database",
  "prisma",
  "drizzle",
];

/** Only *persistent user files* justify Object Storage, not any mention of images. */
const UPLOAD_TERMS = [
  "آپلود",
  "اپلود",
  "upload",
  "فایل کاربر",
  "عکس کاربر",
  "تصویر کاربر",
  "ذخیره عکس",
  "ذخیره فایل",
  "user uploads",
  "object storage",
  "آبجکت استوریج",
];

const UNSUPPORTED_FRAMEWORKS = [
  "django",
  "جنگو",
  "laravel",
  "لاراول",
  "flask",
  "rails",
  "spring",
  "vue",
  "nuxt",
  "angular",
  "svelte",
];

function normalize(text: string): string {
  return text.toLowerCase().replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/‌/g, " ");
}

const mentions = (text: string, terms: string[]) =>
  terms.some((term) => text.includes(normalize(term)));

/** Reads project needs from free text. Nothing is assumed that was not said. */
export function collectNeeds(text: string): ProjectNeeds {
  const normalized = normalize(text);

  const framework = /next\.?js|نکست|\bnext\b/.test(normalized)
    ? "nextjs"
    : mentions(normalized, UNSUPPORTED_FRAMEWORKS)
      ? "unsupported"
      : "unknown";

  return {
    framework,
    needsPostgres: mentions(normalized, POSTGRES_TERMS),
    needsPersistentUploads: mentions(normalized, UPLOAD_TERMS),
  };
}

/** Merges newly stated needs into what the conversation already established. */
export function mergeNeeds(previous: ProjectNeeds, incoming: ProjectNeeds): ProjectNeeds {
  return {
    framework:
      incoming.framework !== "unknown" ? incoming.framework : previous.framework,
    // Needs accumulate: mentioning a database once is enough.
    needsPostgres: previous.needsPostgres || incoming.needsPostgres,
    needsPersistentUploads:
      previous.needsPersistentUploads || incoming.needsPersistentUploads,
  };
}

export function servicesFor(needs: ProjectNeeds): RequiredService[] {
  const services: RequiredService[] = ["paas-nextjs"];
  if (needs.needsPostgres) services.push("postgresql");
  if (needs.needsPersistentUploads) services.push("object-storage");
  return services;
}

const SERVICE_COPY: Record<RequiredService, { label: string; reason: string }> = {
  "paas-nextjs": {
    label: "لیارا PaaS (Next.js)",
    reason: "خود برنامه Next.js اینجا اجرا می‌شه.",
  },
  postgresql: {
    label: "دیتابیس PostgreSQL",
    reason: "چون گفتی پروژه به دیتابیس نیاز داره.",
  },
  "object-storage": {
    label: "آبجکت استوریج",
    reason:
      "چون فایل‌هایی که کاربرها آپلود می‌کنن باید ماندگار بمونن؛ فایل‌های داخل خود سرور بعد از هر استقرار از بین می‌رن.",
  },
};

export function buildPlan(needs: ProjectNeeds): DeploymentPlan {
  const services = servicesFor(needs);

  const steps = [
    "آماده‌سازی پروژه Next.js برای استقرار",
    ...(needs.needsPostgres ? ["ساخت دیتابیس PostgreSQL و اتصالش به برنامه"] : []),
    ...(needs.needsPersistentUploads
      ? ["ساخت باکت آبجکت استوریج برای فایل‌های کاربر"]
      : []),
    "نصب و ورود به Liara CLI",
    "استقرار پروژه روی لیارا",
  ];

  return {
    title: "نقشه راه‌اندازی پروژه روی لیارا",
    services: services.map((service) => ({ service, ...SERVICE_COPY[service] })),
    steps,
  };
}
