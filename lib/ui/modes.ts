/**
 * The two Lio feature modes and their colour identity.
 *
 * Colour carries meaning here, so it is defined once rather than scattered
 * through class strings:
 *
 * - orange = troubleshooting mode
 * - purple = deployment mode
 * - white  = Lio's answer
 * - slate  = the user's message
 *
 * Mode colour marks *what the conversation is doing*, never who is speaking —
 * mixing those two makes both unreadable. Colour is also never the only signal:
 * every mode carries a visible label for anyone who cannot rely on hue.
 */

export type FeatureMode = "troubleshooting" | "deployment" | null;

export type ModeTheme = {
  /** Persian label, so the mode is legible without colour. */
  label: string;
  /** Barely-there page wash. */
  surface: string;
  /** Soft contextual fill for chips and accents. */
  soft: string;
  border: string;
  accent: string;
  /** Accessible text/icon colour on the soft fill. */
  ink: string;
};

export const MODE_THEMES: Record<"troubleshooting" | "deployment", ModeTheme> = {
  troubleshooting: {
    label: "عیب‌یابی",
    surface: "#FFFCF8",
    soft: "#FFF7ED",
    border: "#FED7AA",
    accent: "#F28500",
    ink: "#7C2D12",
  },
  deployment: {
    label: "دیپلوی",
    surface: "#FCFAFF",
    soft: "#F7F3FF",
    border: "#DDD0FE",
    accent: "#7C3AED",
    ink: "#4C1D95",
  },
};

/**
 * Maps conversation state to a feature mode.
 *
 * An active journey wins over a one-off troubleshooting turn only when the turn
 * is not itself an error: inside a deployment, an error still shows the
 * troubleshooting mode so the user can see the conversation changed gear.
 */
export function featureModeFor(input: {
  intent: string;
  activeJourney: string | null;
}): FeatureMode {
  if (input.intent === "troubleshooting") return "troubleshooting";
  if (input.activeJourney) return "deployment";
  if (input.intent === "deployment") return "deployment";
  return null;
}

export function themeFor(mode: FeatureMode): ModeTheme | null {
  return mode ? MODE_THEMES[mode] : null;
}
