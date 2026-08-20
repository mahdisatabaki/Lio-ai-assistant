import { GENERAL_SYSTEM_PROMPT, TROUBLESHOOTING_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { decideEvidence, sourcesFrom } from "@/lib/rag/evidence";
import type { RetrievalResult } from "@/lib/rag/retrieve";

import { lacksErrorEvidence, observe, type Observation } from "./diagnose";
import { classifyError, failure, failureLog } from "./failures";
import {
  journeyStepView,
  PENDING_STEPS_MESSAGE,
  UNSUPPORTED_FRAMEWORK_ACTIONS,
  UNSUPPORTED_FRAMEWORK_MESSAGE,
} from "./journey";
import { collectNeeds, mergeNeeds, type ProjectNeeds, servicesFor } from "./plan";
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
 * Turns one user message into a response.
 *
 * Retrieval and generation arrive as dependencies so the whole decision tree is
 * testable without a database or a model, and so the deterministic paths
 * (guided steps, service planning) can be proven to make no AI call at all.
 */
export type ChatDeps = {
  retrieve: (query: string) => Promise<RetrievalResult>;
  generate: (systemPrompt: string, input: GenerationContext) => Promise<string>;
};

export type GenerationContext = {
  message: string;
  recentMessages: ChatRequest["recentMessages"];
  state: ConversationState;
  chunks: RetrievalResult["chunks"];
  observations?: Observation[];
};

export const ABSTENTION_MESSAGE =
  "این مورد رو از منبع قابل اتکای لیارا نتونستم تأیید کنم، پس نمی‌خوام حدس بزنم.";

const CLARIFY_GENERAL =
  "برای اینکه درست جواب بدم یه کم دقیق‌تر بگو دنبال چی هستی؟ اسم سرویس یا کاری که می‌خوای انجام بدی کمک بزرگیه.";

const ASK_FOR_ERROR_TEXT =
  "برای اینکه حدس نزنم، متن خطا یا چند خط آخر خروجی deploy رو بفرست.";

const TROUBLESHOOTING_FOLLOW_UPS: NextAction[] = [
  { id: "fixed", label: "درست شد", send: "درست شد." },
  { id: "still-failing", label: "هنوز خطا دارم", send: "هنوز همون خطا رو می‌گیرم." },
  { id: "new-log", label: "لاگ جدید رو می‌فرستم", send: "لاگ جدید رو می‌فرستم:" },
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

/** Rebuilds known project needs from state plus the current message. */
function needsFrom(state: ConversationState, message: string): ProjectNeeds {
  const fromState: ProjectNeeds = {
    framework: state.framework === "nextjs" ? "nextjs" : "unknown",
    needsPostgres: state.requiredServices.includes("postgresql"),
    needsPersistentUploads: state.requiredServices.includes("object-storage"),
  };

  return mergeNeeds(fromState, collectNeeds(message));
}

/** Runs retrieve → evidence → generate, mapping every failure to safe copy. */
async function groundedAnswer(
  deps: ChatDeps,
  systemPrompt: string,
  context: Omit<GenerationContext, "chunks">,
  requestId: string,
): Promise<Pick<ChatResponse, "message" | "sources">> {
  let retrieval: RetrievalResult;

  try {
    retrieval = await deps.retrieve(context.message);
  } catch (error) {
    const info = classifyError(error, "retrieval");
    console.error(failureLog(requestId, info, error));
    return { message: info.message };
  }

  if (retrieval.chunks.length === 0 && retrieval.tokens.length === 0) {
    // An index that returns nothing for everything is an operational problem,
    // not a hard question. Say so instead of pretending to abstain.
    const decision = decideEvidence(retrieval, context.message);
    if (decision.kind === "clarify") return { message: CLARIFY_GENERAL };
  }

  const decision = decideEvidence(retrieval, context.message);

  if (decision.kind === "clarify") return { message: CLARIFY_GENERAL };
  if (decision.kind === "abstain") return { message: ABSTENTION_MESSAGE };

  try {
    const message = await deps.generate(systemPrompt, {
      ...context,
      chunks: decision.chunks,
    });
    // Sources come from retrieval metadata, never from the model's text.
    return { message, sources: sourcesFrom(decision.chunks) };
  } catch (error) {
    const info = classifyError(error, "generation");
    console.error(failureLog(requestId, info, error));
    return { message: info.message };
  }
}

async function handleTroubleshooting(
  deps: ChatDeps,
  request: ChatRequest,
  state: ConversationState,
  requestId: string,
): Promise<ChatResponse> {
  const { message, recentMessages } = request;
  const observations = observe(message);

  // Nothing concrete to diagnose: ask for the one artifact that unblocks it.
  if (lacksErrorEvidence(message, observations)) {
    return {
      message: ASK_FOR_ERROR_TEXT,
      state,
      actions: [TROUBLESHOOTING_FOLLOW_UPS[2]],
      meta: { intent: "troubleshooting", requestId },
    };
  }

  const answer = await groundedAnswer(
    deps,
    TROUBLESHOOTING_SYSTEM_PROMPT,
    { message, recentMessages, state, observations },
    requestId,
  );

  return {
    ...answer,
    state,
    actions: TROUBLESHOOTING_FOLLOW_UPS,
    meta: { intent: "troubleshooting", requestId },
  };
}

function handleDeployment(
  request: ChatRequest,
  incoming: ConversationState,
  requestId: string,
): ChatResponse {
  const { message } = request;
  const needs = needsFrom(incoming, message);

  if (needs.framework === "unsupported") {
    // Do not enter the journey for a framework we cannot guide (EVALS J-05).
    return {
      message: UNSUPPORTED_FRAMEWORK_MESSAGE,
      state: { ...incoming, intent: "deployment", activeJourney: null, currentStep: null },
      actions: UNSUPPORTED_FRAMEWORK_ACTIONS,
      meta: { intent: "deployment", requestId },
    };
  }

  const alreadyInJourney = Boolean(incoming.activeJourney);

  let state = enterJourney(incoming, "nextjs-deploy");
  state = { ...state, requiredServices: servicesFor(needs) };

  // The turn that starts the journey renders its first step. Every later turn
  // is the user answering the step in front of them, so it advances.
  if (alreadyInJourney) {
    if (looksLikeResultReport(message)) {
      state = recordUserResult(state, message.slice(0, 2_000));
    }
    // Returning to the journey clears any troubleshooting branch it was in.
    state = resolveErrorBranch(state);
    state = advanceJourney(state);
  }

  const view = state.currentStep ? journeyStepView(state.currentStep, needs) : null;

  if (!view) {
    return {
      message: PENDING_STEPS_MESSAGE,
      state,
      meta: { intent: "deployment", requestId },
    };
  }

  return {
    message: view.body,
    state,
    plan: view.plan,
    actions: view.actions,
    meta: { intent: "deployment", requestId },
  };
}

export async function buildChatResponse(
  request: ChatRequest,
  requestId: string,
  deps: ChatDeps,
): Promise<ChatResponse> {
  const { message, recentMessages, state: incoming } = request;
  const intent = detectIntent(message, incoming);
  const state: ConversationState = { ...incoming, intent };

  switch (intent) {
    case "troubleshooting": {
      // Keep the journey and its step; only the response behavior changes.
      const branched = enterErrorBranch(state, message.slice(0, 2_000));
      return handleTroubleshooting(deps, request, branched, requestId);
    }

    case "deployment":
      return handleDeployment(request, state, requestId);

    case "unknown":
      return {
        message: CLARIFY_GENERAL,
        state,
        actions: GENERAL_ACTIONS,
        meta: { intent, requestId },
      };

    default: {
      // A config question is still a config question: pasted JSON is inspected
      // here too, so an undocumented key is never silently accepted.
      const answer = await groundedAnswer(
        deps,
        GENERAL_SYSTEM_PROMPT,
        { message, recentMessages, state, observations: observe(message) },
        requestId,
      );

      return {
        ...answer,
        state,
        actions: GENERAL_ACTIONS,
        meta: { intent: "general", requestId },
      };
    }
  }
}

/** Real dependencies. Imported lazily so tests never pull in server-only code. */
export async function productionDeps(): Promise<ChatDeps> {
  const [{ retrieveDocumentation }, { generateGroundedAnswer }] = await Promise.all([
    import("@/lib/rag/retrieve"),
    import("@/lib/ai/generate"),
  ]);

  return {
    retrieve: (query) => retrieveDocumentation(query),
    generate: (systemPrompt, input) => generateGroundedAnswer(systemPrompt, input),
  };
}

export { failure };
