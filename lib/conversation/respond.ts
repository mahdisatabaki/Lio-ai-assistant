import { detectIntent, looksLikeResultReport } from "./intent";
import {
  advanceJourney,
  enterErrorBranch,
  enterJourney,
  recordUserResult,
  resolveErrorBranch,
} from "./state";
import type {
  ChatRequest,
  ChatResponse,
  ConversationState,
  NextAction,
} from "./types";

/**
 * Deterministic placeholder replies (BL-022).
 *
 * This is plumbing, not the product. It proves routing, state transitions, and
 * the request/response contract end to end without a model call. Grounded
 * answers arrive with retrieval in BL-040 and later, and these strings are
 * expected to be replaced then.
 *
 * The copy deliberately acknowledges without diagnosing. Inventing a Liara fact
 * here would violate the grounding rule in `CLAUDE.md` 11.1 even in a mock.
 */

const TROUBLESHOOTING_ACTIONS: NextAction[] = [
  {
    id: "share-more",
    label: "متن کامل خطا رو می‌فرستم",
    send: "متن کامل خطا رو می‌فرستم.",
  },
  {
    id: "deploy-instead",
    label: "می‌خوام پروژه‌م رو آنلاین کنم",
    send: "می‌خوام پروژه‌م رو آنلاین کنم.",
  },
];

const DEPLOYMENT_ACTIONS: NextAction[] = [
  { id: "project-nextjs", label: "پروژه‌م Next.js هست", send: "پروژه‌م Next.js هست." },
  { id: "have-error", label: "الان خطا دارم", send: "الان موقع اجرا خطا می‌گیرم." },
];

const GENERAL_ACTIONS: NextAction[] = [
  {
    id: "have-error",
    label: "یه مشکلی برای پروژه‌م پیش اومده",
    send: "یه مشکلی برای پروژه‌م پیش اومده.",
  },
  {
    id: "go-online",
    label: "می‌خوام پروژه‌م رو آنلاین کنم",
    send: "می‌خوام پروژه‌م رو آنلاین کنم.",
  },
];

function troubleshootingReply(state: ConversationState): string {
  if (state.activeJourney) {
    return [
      "خطا رو گرفتم. فعلاً روی همین مشکل تمرکز می‌کنیم و جای فعلیت توی مراحل استقرار حفظ می‌شه.",
      "",
      "هنوز به منابع مستندات لیارا وصل نیستم، برای همین تشخیص نمی‌دم. به‌محض اینکه لایه بازیابی مستندات اضافه بشه، همین ورودی رو تحلیل می‌کنم.",
    ].join("\n");
  }

  return [
    "خطا یا لاگت رو دریافت کردم.",
    "",
    "هنوز به مستندات لیارا وصل نیستم، پس فعلاً تشخیص نمی‌دم و حدس هم نمی‌زنم. این بخش با اضافه‌شدن جست‌وجوی مستندات کامل می‌شه.",
  ].join("\n");
}

function deploymentReply(state: ConversationState): string {
  const intro = state.activeJourney
    ? "توی مسیر آنلاین‌کردن پروژه هستیم و مرحله فعلیت حفظ شده."
    : "باشه، مسیر آنلاین‌کردن پروژه رو شروع می‌کنیم.";

  return [
    intro,
    "",
    "فعلاً فقط مسیر و وضعیت گفتگو ساخته شده و محتوای مرحله‌به‌مرحله هنوز اضافه نشده. دستور واقعی و راهنمای استقرار در گام بعدی پیاده‌سازی می‌شه.",
  ].join("\n");
}

const GENERAL_REPLY = [
  "سؤالت رو دریافت کردم.",
  "",
  "هنوز به مستندات لیارا وصل نیستم و ترجیح می‌دم جواب نادرست نسازم. وقتی لایه بازیابی مستندات اضافه بشه، جواب همراه با منبع می‌دم.",
].join("\n");

const UNKNOWN_REPLY = [
  "برای اینکه درست کمکت کنم یه توضیح کوتاه لازم دارم.",
  "",
  "خطایی گرفتی، یا می‌خوای پروژه‌ت رو آنلاین کنی، یا سؤال عمومی درباره لیارا داری؟",
].join("\n");

/**
 * Runs routing and state transitions for one turn and returns the reply.
 *
 * Never throws on ordinary input: the caller has already validated shape, and
 * every branch here is total.
 */
export function buildChatResponse(
  request: ChatRequest,
  requestId: string,
): ChatResponse {
  const { message, state: incoming } = request;
  const intent = detectIntent(message, incoming);

  let state: ConversationState = { ...incoming, intent };
  let reply: string;
  let actions: NextAction[];

  switch (intent) {
    case "troubleshooting": {
      state = enterErrorBranch(state, message.slice(0, 2_000));
      reply = troubleshootingReply(state);
      actions = TROUBLESHOOTING_ACTIONS;
      break;
    }

    case "deployment": {
      state = enterJourney(state, "nextjs-deploy");

      if (looksLikeResultReport(message)) {
        // A reported success clears any error branch and moves the journey on.
        state = recordUserResult(state, message.slice(0, 2_000));
        state = resolveErrorBranch(state);
        state = advanceJourney(state);
      }

      reply = deploymentReply(state);
      actions = DEPLOYMENT_ACTIONS;
      break;
    }

    case "general": {
      reply = GENERAL_REPLY;
      actions = GENERAL_ACTIONS;
      break;
    }

    default: {
      reply = UNKNOWN_REPLY;
      actions = GENERAL_ACTIONS;
      break;
    }
  }

  return {
    message: reply,
    state,
    actions,
    meta: { intent, requestId },
  };
}
