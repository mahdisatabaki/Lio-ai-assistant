import { describe, expect, it } from "vitest";

import {
  advanceJourney,
  completeJourney,
  createInitialState,
  enterErrorBranch,
  enterJourney,
  journeyProgress,
  resolveErrorBranch,
} from "./state";
import { JOURNEY_STEP_IDS } from "./types";

describe("journey state", () => {
  it("starts empty", () => {
    const state = createInitialState();
    expect(state.activeJourney).toBeNull();
    expect(state.currentStep).toBeNull();
    expect(journeyProgress(state)).toBeNull();
  });

  it("enters at the first step", () => {
    const state = enterJourney(createInitialState(), "nextjs-deploy");
    expect(state.activeJourney).toBe("nextjs-deploy");
    expect(state.currentStep).toBe(JOURNEY_STEP_IDS[0]);
    expect(state.framework).toBe("nextjs");
    expect(journeyProgress(state)).toEqual({ current: 1, total: JOURNEY_STEP_IDS.length });
  });

  it("does not restart a journey that is already active", () => {
    const started = enterJourney(createInitialState(), "nextjs-deploy");
    const advanced = advanceJourney(started);
    expect(enterJourney(advanced, "nextjs-deploy")).toBe(advanced);
  });

  it("advances and records completed steps without duplicates", () => {
    let state = enterJourney(createInitialState(), "nextjs-deploy");
    state = advanceJourney(state);
    state = advanceJourney(state);

    expect(state.currentStep).toBe(JOURNEY_STEP_IDS[2]);
    expect(state.completedSteps).toEqual([JOURNEY_STEP_IDS[0], JOURNEY_STEP_IDS[1]]);
  });

  it("preserves the current step through an error branch and back", () => {
    const started = advanceJourney(enterJourney(createInitialState(), "nextjs-deploy"));
    const errored = enterErrorBranch(started, "npm ERR! ECONNRESET");

    expect(errored.currentStep).toBe(started.currentStep);
    expect(errored.intent).toBe("troubleshooting");
    expect(errored.activeError).toBe("npm ERR! ECONNRESET");

    const resolved = resolveErrorBranch(errored, "دوباره نصب کردم");
    expect(resolved.activeError).toBeNull();
    expect(resolved.currentStep).toBe(started.currentStep);
    expect(resolved.intent).toBe("deployment");
  });

  it("completes at the final step", () => {
    let state = enterJourney(createInitialState(), "nextjs-deploy");
    for (let i = 0; i < JOURNEY_STEP_IDS.length; i += 1) state = advanceJourney(state);

    expect(state.currentStep).toBeNull();
    expect(state.activeJourney).toBeNull();
    // D09 is the troubleshooting branch, stepped over by a normal advance.
    expect(state.completedSteps).toHaveLength(JOURNEY_STEP_IDS.length - 1);
    expect(state.completedSteps).not.toContain("D09_TROUBLESHOOT_IF_NEEDED");
  });

  it("completeJourney clears the active error", () => {
    const errored = enterErrorBranch(
      enterJourney(createInitialState(), "nextjs-deploy"),
      "boom",
    );
    expect(completeJourney(errored).activeError).toBeNull();
  });

  it("never mutates the state it is given", () => {
    const before = enterJourney(createInitialState(), "nextjs-deploy");
    const snapshot = structuredClone(before);
    advanceJourney(before);
    expect(before).toEqual(snapshot);
  });
});
