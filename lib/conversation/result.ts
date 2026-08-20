import { looksLikeError, looksLikeSideQuestion } from "./intent";

/**
 * Deterministic classification of a reply inside a guided journey.
 *
 * The point is what does *not* advance. An offhand remark used to move the
 * journey forward, which silently skipped a step the user never did. Progress
 * now requires a recognizable completion signal; anything unrecognised holds
 * position, which is the safe direction to be wrong in.
 *
 * Lightweight string matching, no classifier and no model call.
 */

export type TurnResult = "success" | "failure" | "side-question" | "unknown";

/** Generic completion language, valid at any step. */
const SUCCESS_TERMS = [
  "انجام شد",
  "انجامش دادم",
  "اوکی شد",
  "اوکیه",
  "درست شد",
  "حل شد",
  "تموم شد",
  "تمام شد",
  "موفق بود",
  "موفق شد",
  "done",
  "success",
  "successful",
  "ok",
];

/** Step-specific completions: "نصب شد" only makes sense after being asked to install. */
const STEP_SUCCESS_TERMS: Record<string, string[]> = {
  D04_ENSURE_CLI: [
    "نصب شد",
    "نصبش کردم",
    "نصب کردم",
    "از قبل نصبه",
    "قبلا نصب",
    "دارمش",
    "installed",
  ],
  D05_AUTHENTICATE: [
    "لاگین کردم",
    "لاگین شدم",
    "لاگین بودم",
    "از قبل لاگین",
    "وارد شدم",
    "وارد حساب شدم",
    "login کردم",
    "logged in",
    "authenticated",
  ],
  D06_CREATE_RESOURCES: [
    "ساختم",
    "ساخته شد",
    "ایجاد کردم",
    "از قبل دارم",
    "قبلا ساختم",
    "created",
  ],
  D07_PREPARE_INPUTS: ["آماده‌ست", "آماده است", "امادست", "چک کردم", "دارم", "ready"],
  D08_DEPLOY: [
    "دیپلوی شد",
    "deploy شد",
    "مستقر شد",
    "بالا اومد",
    "آنلاین شد",
    "deployed",
  ],
};

/** Shapes that appear in genuinely successful CLI output. */
const SUCCESS_OUTPUT = [
  /deployment\s+(?:was\s+)?success/i,
  /build\s+succeeded/i,
  /successfully\s+deployed/i,
  /✔|✓/,
];

function normalize(text: string): string {
  return text.toLowerCase().replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/‌/g, " ");
}

const mentions = (haystack: string, terms: string[]) =>
  terms.some((term) => haystack.includes(normalize(term)));

/**
 * Classifies one reply against the step the user is standing on.
 *
 * Order matters: a message can contain both "deploy" and an error, and the
 * error has to win or a failed step would be marked complete.
 */
export function classifyTurn(text: string, currentStep: string | null): TurnResult {
  const trimmed = text.trim();
  if (trimmed.length === 0) return "unknown";

  if (looksLikeError(trimmed)) return "failure";

  const normalized = normalize(trimmed);

  if (SUCCESS_OUTPUT.some((pattern) => pattern.test(trimmed))) return "success";
  if (mentions(normalized, SUCCESS_TERMS)) return "success";

  const stepTerms = currentStep ? STEP_SUCCESS_TERMS[currentStep] : undefined;
  if (stepTerms && mentions(normalized, stepTerms)) return "success";

  if (looksLikeSideQuestion(trimmed)) return "side-question";

  // Deliberately not "success". An unrecognised remark holds the step.
  return "unknown";
}

/** Pulls a Liara app id out of a command, flag, or plain statement. */
export function extractAppId(text: string): string | null {
  const patterns = [
    /--app[= ]["']?([a-z0-9][a-z0-9-]{1,62})["']?/i,
    /"app"\s*:\s*"([a-z0-9][a-z0-9-]{1,62})"/i,
    // Persian attaches possessives directly to the noun ("شناسه‌ش"), so allow
    // any suffix before the quoted id.
    /(?:شناسه|اسم|نام)\S*\s*(?:برنامه|اپ|app)?\s*(?:رو|را|هست|است)?\s*["'`]([a-z0-9][a-z0-9-]{1,62})["'`]/i,
    /(?:شناسه|اسم|نام)\S*\s*(?:برنامه|اپ|app)?\s*(?:رو|را)?\s*(?:هست|است|:)\s*([a-z0-9][a-z0-9-]{1,62})/i,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match?.[1] && !/^(next|node|myapp)$/i.test(match[1])) return match[1];
  }

  return null;
}
