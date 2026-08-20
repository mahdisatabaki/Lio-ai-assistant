import { config } from "@/lib/config";

import { createInitialState } from "./state";
import {
  type ChatErrorCode,
  type ChatRequest,
  type ConversationMessage,
  type ConversationState,
  INTENTS,
  type Intent,
  JOURNEY_STEP_IDS,
  type JourneyStepId,
  REQUIRED_SERVICES,
  type RequiredService,
  ROLES,
  type Role,
} from "./types";

/**
 * Server-side validation of the chat payload.
 *
 * The whole conversation state is carried by the browser (`docs/TECH.md` 6.4),
 * so every field here is user-controlled and none of it is trusted. Enums are
 * checked against their allowed values and every array and string is bounded.
 *
 * Unknown fields are dropped rather than rejected: the state is rebuilt field
 * by field, so a client cannot smuggle extra keys through.
 *
 * Hand-written on purpose. The shape is small and fixed, and a schema library
 * would be a dependency without a job.
 */

export type ValidationFailure = { ok: false; code: ChatErrorCode; message: string };
export type ValidationSuccess = { ok: true; value: ChatRequest };
export type ValidationResult = ValidationSuccess | ValidationFailure;

const MAX_ID_CHARS = 64;
const MAX_STORED_TEXT_CHARS = 2_000;

function fail(code: ChatErrorCode, message: string): ValidationFailure {
  return { ok: false, code, message };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function boundedString(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  return value.slice(0, max);
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : null;
}

function sanitizeMessages(value: unknown): ConversationMessage[] {
  if (!Array.isArray(value)) return [];

  return value
    .slice(-config.maxRecentMessages)
    .filter(isRecord)
    .map((raw) => {
      const role = oneOf<Role>(raw.role, ROLES);
      const content = boundedString(raw.content, config.maxMessageChars);
      const id = boundedString(raw.id, MAX_ID_CHARS);
      if (!role || content === null) return null;
      return { id: id ?? crypto.randomUUID(), role, content };
    })
    .filter((message): message is ConversationMessage => message !== null);
}

function sanitizeState(value: unknown): ConversationState {
  const base = createInitialState();
  if (!isRecord(value)) return base;

  const completedSteps = Array.isArray(value.completedSteps)
    ? value.completedSteps
        .map((step) => oneOf<JourneyStepId>(step, JOURNEY_STEP_IDS))
        .filter((step): step is JourneyStepId => step !== null)
        .slice(0, JOURNEY_STEP_IDS.length)
    : [];

  const requiredServices = Array.isArray(value.requiredServices)
    ? Array.from(
        new Set(
          value.requiredServices
            .map((service) => oneOf<RequiredService>(service, REQUIRED_SERVICES))
            .filter((service): service is RequiredService => service !== null),
        ),
      )
    : [];

  const activeJourney = value.activeJourney === "nextjs-deploy" ? "nextjs-deploy" : null;
  const currentStep = oneOf<JourneyStepId>(value.currentStep, JOURNEY_STEP_IDS);

  return {
    intent: oneOf<Intent>(value.intent, INTENTS) ?? base.intent,
    activeJourney,
    framework: value.framework === "nextjs" ? "nextjs" : null,
    deploymentMethod: value.deploymentMethod === "cli" ? "cli" : null,
    requiredServices,
    // A step only means something inside a journey.
    currentStep: activeJourney ? currentStep : null,
    completedSteps: Array.from(new Set(completedSteps)),
    lastUserResult: boundedString(value.lastUserResult, MAX_STORED_TEXT_CHARS),
    activeError: boundedString(value.activeError, MAX_STORED_TEXT_CHARS),
    attemptedFix: boundedString(value.attemptedFix, MAX_STORED_TEXT_CHARS),
  };
}

export function parseChatRequest(payload: unknown): ValidationResult {
  if (!isRecord(payload)) {
    return fail("invalid_request", "درخواست معتبر نیست.");
  }

  if (typeof payload.message !== "string") {
    return fail("invalid_request", "متن پیام ارسال نشده است.");
  }

  const message = payload.message.trim();

  if (message.length === 0) {
    return fail("invalid_request", "پیام خالی است. لطفاً سؤال یا خطایت رو بنویس.");
  }

  if (message.length > config.maxMessageChars) {
    return fail(
      "message_too_long",
      `متن ارسالی خیلی طولانیه. لطفاً فقط بخش مهم رو بفرست (حداکثر ${config.maxMessageChars.toLocaleString("fa-IR")} کاراکتر).`,
    );
  }

  return {
    ok: true,
    value: {
      message,
      recentMessages: sanitizeMessages(payload.recentMessages),
      state: sanitizeState(payload.state),
    },
  };
}
