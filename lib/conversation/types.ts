/**
 * The conversation contract shared by the browser and the server.
 *
 * Mirrors `docs/TECH.md` sections 5 and 7. The state is deliberately narrow:
 * fields for journeys the MVP does not support do not belong here.
 */

export type Role = "user" | "assistant";

export type Intent = "troubleshooting" | "deployment" | "general" | "unknown";

export type JourneyId = "nextjs-deploy";

export type Framework = "nextjs";

export type DeploymentMethod = "cli";

export type RequiredService = "paas-nextjs" | "postgresql" | "object-storage";

export type ConversationMessage = {
  id: string;
  role: Role;
  content: string;
};

export type SourceReference = {
  title: string;
  heading?: string;
  url: string;
};

/** A chip the user can tap. `send` is the text submitted on their behalf. */
export type NextAction = {
  id: string;
  label: string;
  send: string;
};

export type PlannedService = {
  service: RequiredService;
  label: string;
  reason: string;
};

export type DeploymentPlan = {
  title: string;
  services: PlannedService[];
  steps: string[];
};

/** Ordered guided-deployment steps from `docs/TECH.md` 9.1. Step *content* is BL-061+. */
export const JOURNEY_STEP_IDS = [
  "D01_CONFIRM_PROJECT",
  "D02_CHECK_READINESS",
  "D03_BUILD_PLAN",
  "D04_ENSURE_CLI",
  "D05_AUTHENTICATE",
  "D06_CREATE_RESOURCES",
  "D07_PREPARE_INPUTS",
  "D08_DEPLOY",
  "D09_TROUBLESHOOT_IF_NEEDED",
  "D10_DONE",
] as const;

export type JourneyStepId = (typeof JOURNEY_STEP_IDS)[number];

export type ConversationState = {
  intent: Intent;
  activeJourney: JourneyId | null;
  framework: Framework | null;
  deploymentMethod: DeploymentMethod | null;
  requiredServices: RequiredService[];
  currentStep: JourneyStepId | null;
  completedSteps: JourneyStepId[];
  lastUserResult: string | null;
  activeError: string | null;
  attemptedFix: string | null;
};

export type ChatRequest = {
  message: string;
  recentMessages: ConversationMessage[];
  state: ConversationState;
};

export type ChatResponse = {
  message: string;
  state: ConversationState;
  sources?: SourceReference[];
  actions?: NextAction[];
  plan?: DeploymentPlan;
  meta: {
    intent: Intent;
    requestId: string;
  };
};

export type ChatErrorCode =
  | "invalid_request"
  | "message_too_long"
  | "rate_limited"
  | "server_error";

export type ChatErrorResponse = {
  error: {
    code: ChatErrorCode;
    /** Persian, user-facing, safe to display. Never contains internals. */
    message: string;
  };
};

export const ROLES: readonly Role[] = ["user", "assistant"];
export const INTENTS: readonly Intent[] = [
  "troubleshooting",
  "deployment",
  "general",
  "unknown",
];
export const REQUIRED_SERVICES: readonly RequiredService[] = [
  "paas-nextjs",
  "postgresql",
  "object-storage",
];
