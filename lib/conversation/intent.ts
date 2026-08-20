import { collectNeeds } from "./plan";
import type { ConversationState, Intent } from "./types";

/**
 * Deterministic-first intent routing (`docs/TECH.md` 8).
 *
 * Lightweight signals only — no classifier, no model call. When the signals
 * genuinely cannot decide, the result is "unknown" so the caller can ask one
 * clarifying question instead of guessing.
 */

/** Latin technical markers that survive translation into any Persian sentence. */
const ERROR_TOKENS = [
  "error",
  "err!",
  "exception",
  "traceback",
  "stack trace",
  "at object.",
  "fatal",
  "failed",
  "failure",
  "cannot find",
  "module not found",
  "econnreset",
  "econnrefused",
  "enotfound",
  "enoent",
  "eacces",
  "eaddrinuse",
  "etimedout",
  "npm err",
  "exit code",
  "exit status",
  "segmentation fault",
  "unhandled",
  "warn deprecated",
];

const PERSIAN_ERROR_TERMS = [
  "خطا",
  "ارور",
  "اِرور",
  "مشکل",
  "ایراد",
  "بالا نمیاد",
  "بالا نمی‌اد",
  "کار نمی‌کنه",
  "کار نمیکنه",
  "کرش",
  "ریست می‌شه",
  "فیل شد",
  "شکست خورد",
  "شکست می خوره",
  "شکست میخوره",
  "شکست خورده",
  "بالا نمیاره",
  "اجرا نمی‌شه",
  "اجرا نمیشه",
  "دیپلوی نمی‌شه",
  "بیلد نمی‌شه",
  "بیلد نمیشه",
];

const DEPLOYMENT_TERMS = [
  "آنلاین کنم",
  "آنلاین کردن",
  "آنلاینش کنم",
  "دیپلوی",
  "دپلوی",
  "استقرار",
  "منتشر کنم",
  "بالا بیارم",
  "بالا بیاریم",
  "روی لیارا بذارم",
  "روی لیارا بزارم",
  "deploy",
  "build on liara",
];

/** Deployment words that only mean deployment when no failure is described. */
const RESULT_TERMS = [
  "انجام شد",
  "موفق بود",
  "درست شد",
  "حل شد",
  "تموم شد",
  "اوکی شد",
  "success",
  "succeeded",
  "done",
];

function normalize(text: string): string {
  // Fold Arabic ی/ک variants so Persian matching is not keyboard-dependent.
  return text
    .toLowerCase()
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/‌/g, " ");
}

function containsAny(haystack: string, needles: string[]): boolean {
  return needles.some((needle) => haystack.includes(normalize(needle)));
}

/** Multi-line output with shell/stack shapes, the way pasted logs look. */
export function looksLikePastedOutput(text: string): boolean {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 3) return false;

  const technicalLines = lines.filter((line) =>
    /^\s*(at\s|\+|-|\$|>|#|\[|\{|npm|node|yarn|pnpm|error|warn|info|\d{1,3}\s*\||\w+Error)/i.test(
      line,
    ),
  );

  return technicalLines.length >= 2;
}

export function looksLikeError(text: string): boolean {
  const normalized = normalize(text);
  return (
    containsAny(normalized, ERROR_TOKENS) ||
    containsAny(normalized, PERSIAN_ERROR_TERMS) ||
    looksLikePastedOutput(text)
  );
}

export function looksLikeDeployment(text: string): boolean {
  return containsAny(normalize(text), DEPLOYMENT_TERMS);
}

export function looksLikeResultReport(text: string): boolean {
  return containsAny(normalize(text), RESULT_TERMS);
}

/** Interrogative shape: a real question rather than an answer to our step. */
const QUESTION_MARKERS = [
  "?",
  "؟",
  "چیه",
  "چیست",
  "چطور",
  "چگونه",
  "چرا",
  "آیا",
  "کدوم",
  "کدام",
  "فرق",
  "تفاوت",
  "یعنی چی",
];

export function looksLikeSideQuestion(text: string): boolean {
  return containsAny(normalize(text), QUESTION_MARKERS);
}

/**
 * Too short and signal-free to act on — "سلام", "کمک", "؟". Long free text is
 * treated as a general question instead, since asking for clarification there
 * would just be annoying.
 */
function isTooVagueToRoute(text: string): boolean {
  return text.trim().length < 12;
}

/**
 * Routes one message.
 *
 * An active journey wins: a side question during deployment does not silently
 * cancel it, and an error during deployment enters the troubleshooting branch
 * while the journey step stays put.
 */
export function detectIntent(message: string, state: ConversationState): Intent {
  const text = message.trim();
  if (text.length === 0) return "unknown";

  if (state.activeJourney) {
    if (looksLikeError(text)) return "troubleshooting";
    if (looksLikeResultReport(text)) return "deployment";
    if (looksLikeDeployment(text)) return "deployment";
    // A question mid-journey is a side question, answered without leaving it.
    if (looksLikeSideQuestion(text)) return "general";
    // Otherwise the user is answering the current step. Defaulting to the
    // journey keeps "بله، پروژه‌م Next.js هست" from being mistaken for a new
    // topic and silently stalling progress.
    return "deployment";
  }

  // Failure language beats deployment language: "موقع دیپلوی خطا خوردم" is a
  // troubleshooting request, not a request to start deploying.
  if (looksLikeError(text)) return "troubleshooting";
  if (looksLikeDeployment(text)) return "deployment";

  // Describing a project and what it needs — "پروژه Next.js با postgres و
  // آپلود فایل" — is a Build on Liara request even without the word "deploy".
  // A question about those things is still a docs question, so ask first.
  if (!looksLikeSideQuestion(text)) {
    const needs = collectNeeds(text);
    if (
      needs.framework === "nextjs" &&
      (needs.needsPostgres || needs.needsPersistentUploads)
    ) {
      return "deployment";
    }
  }

  if (isTooVagueToRoute(text)) return "unknown";

  return "general";
}
