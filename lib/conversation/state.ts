import {
  type ConversationState,
  type JourneyId,
  type JourneyStepId,
  JOURNEY_STEP_IDS,
} from "./types";

/**
 * Journey state machinery for guided deployment.
 *
 * Plain functions over plain data — no agent loop, no orchestration framework
 * (`docs/TECH.md` 9). Every function returns a new state rather than mutating,
 * so the server can transition without touching the caller's object.
 *
 * The step *order* lives here because the machinery needs it. The Persian step
 * content belongs to BL-061 and later.
 */

export function createInitialState(): ConversationState {
  return {
    intent: "unknown",
    activeJourney: null,
    framework: null,
    deploymentMethod: null,
    requiredServices: [],
    currentStep: null,
    completedSteps: [],
    lastUserResult: null,
    activeError: null,
    attemptedFix: null,
  };
}

export function nextStepAfter(step: JourneyStepId): JourneyStepId | null {
  const index = JOURNEY_STEP_IDS.indexOf(step);
  if (index < 0 || index >= JOURNEY_STEP_IDS.length - 1) return null;
  return JOURNEY_STEP_IDS[index + 1];
}

/**
 * Starts a journey. Re-entering an already active journey is a no-op, so a
 * user repeating "می‌خوام پروژه‌م رو آنلاین کنم" mid-journey does not lose
 * progress.
 */
export function enterJourney(
  state: ConversationState,
  journey: JourneyId,
): ConversationState {
  if (state.activeJourney === journey) return state;

  return {
    ...state,
    activeJourney: journey,
    framework: "nextjs",
    deploymentMethod: "cli",
    requiredServices: ["paas-nextjs"],
    currentStep: JOURNEY_STEP_IDS[0],
    completedSteps: [],
  };
}

/** Completes the current step and moves to the next, finishing at the last one. */
export function advanceJourney(state: ConversationState): ConversationState {
  if (!state.activeJourney || !state.currentStep) return state;

  const completed = state.completedSteps.includes(state.currentStep)
    ? state.completedSteps
    : [...state.completedSteps, state.currentStep];

  const next = nextStepAfter(state.currentStep);
  if (!next) return completeJourney({ ...state, completedSteps: completed });

  return { ...state, completedSteps: completed, currentStep: next };
}

/**
 * Enters the troubleshooting branch without losing the journey. `currentStep`
 * is deliberately preserved so the user returns to exactly where they were.
 */
export function enterErrorBranch(
  state: ConversationState,
  error: string,
): ConversationState {
  return { ...state, intent: "troubleshooting", activeError: error };
}

/** Leaves the troubleshooting branch and returns to the preserved step. */
export function resolveErrorBranch(
  state: ConversationState,
  attemptedFix: string | null = null,
): ConversationState {
  return {
    ...state,
    activeError: null,
    attemptedFix: attemptedFix ?? state.attemptedFix,
    intent: state.activeJourney ? "deployment" : state.intent,
  };
}

export function recordUserResult(
  state: ConversationState,
  result: string,
): ConversationState {
  return { ...state, lastUserResult: result };
}

export function completeJourney(state: ConversationState): ConversationState {
  const completed =
    state.currentStep && !state.completedSteps.includes(state.currentStep)
      ? [...state.completedSteps, state.currentStep]
      : state.completedSteps;

  return {
    ...state,
    completedSteps: completed,
    currentStep: null,
    activeJourney: null,
    activeError: null,
  };
}

/** 1-based position of the current step, for the compact progress strip. */
export function journeyProgress(
  state: ConversationState,
): { current: number; total: number } | null {
  if (!state.activeJourney || !state.currentStep) return null;
  return {
    current: JOURNEY_STEP_IDS.indexOf(state.currentStep) + 1,
    total: JOURNEY_STEP_IDS.length,
  };
}
