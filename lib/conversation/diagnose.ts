/**
 * Deterministic inspection of text the user pasted.
 *
 * When someone pastes a `package.json` with no `start` script, the problem is
 * visible without a model and without retrieval. Spotting it here means the
 * answer names the actual issue instead of asking a questionnaire first
 * (EVALS T-03, T-04, T-06), and it makes those cases testable without a live
 * model.
 *
 * These are *observations*, not fixes. The grounded wording still comes from
 * documentation — this layer only says what is in front of us.
 */

export type Observation =
  | { kind: "missing-start-script" }
  | { kind: "platform-mismatch"; found: string }
  | { kind: "unknown-config-key"; key: string }
  | { kind: "no-error-output" };

/** `liara.json` keys the MVP is willing to speak about. */
const KNOWN_LIARA_KEYS = new Set([
  "app",
  "platform",
  "port",
  "args",
  "cron",
  "disks",
  "healthCheck",
  "build",
  "next",
  "node",
  "mirror",
  "location",
  "team-id",
]);

const KNOWN_NEXT_KEYS = new Set(["mirror", "configuration"]);

/** Extracts JSON objects from fenced blocks or a bare pasted object. */
export function extractJsonObjects(text: string): Record<string, unknown>[] {
  const found: Record<string, unknown>[] = [];
  const candidates: string[] = [];

  for (const match of text.matchAll(/```(?:json|jsonc)?\s*\n([\s\S]*?)```/gi)) {
    candidates.push(match[1]);
  }

  if (candidates.length === 0) {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) candidates.push(text.slice(start, end + 1));
  }

  for (const candidate of candidates) {
    try {
      const parsed: unknown = JSON.parse(candidate.trim());
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        found.push(parsed as Record<string, unknown>);
      }
    } catch {
      // Partial paste is normal; a fragment that will not parse is not an error.
    }
  }

  return found;
}

function isPackageJson(object: Record<string, unknown>): boolean {
  return "scripts" in object || "dependencies" in object || "devDependencies" in object;
}

const LIARA_SHAPE_KEYS = ["platform", "app", "next", "port", "disks", "cron", "build"];

function isLiaraJson(object: Record<string, unknown>): boolean {
  if (isPackageJson(object)) return false;
  // `{ "next": { ... } }` is a liara.json fragment even with no platform or app,
  // which is exactly how config questions get pasted (EVALS T-06).
  return LIARA_SHAPE_KEYS.some((key) => key in object);
}

/** True when the message mentions Next.js in either script or Latin form. */
export function mentionsNextJs(text: string): boolean {
  return /next\.?js|\bnext\b|نکست/i.test(text);
}

export function observe(text: string): Observation[] {
  const observations: Observation[] = [];

  for (const object of extractJsonObjects(text)) {
    if (isPackageJson(object)) {
      const scripts = object.scripts;
      const hasScripts = scripts && typeof scripts === "object";
      const hasStart = hasScripts && "start" in (scripts as Record<string, unknown>);
      // Only meaningful when they showed us the scripts block at all.
      if (hasScripts && !hasStart) observations.push({ kind: "missing-start-script" });
    }

    if (isLiaraJson(object)) {
      const platform = object.platform;
      if (
        typeof platform === "string" &&
        platform !== "next" &&
        mentionsNextJs(text)
      ) {
        observations.push({ kind: "platform-mismatch", found: platform });
      }

      for (const [key, value] of Object.entries(object)) {
        if (!KNOWN_LIARA_KEYS.has(key)) {
          observations.push({ kind: "unknown-config-key", key });
          continue;
        }
        if (key === "next" && value && typeof value === "object") {
          for (const nested of Object.keys(value as Record<string, unknown>)) {
            if (!KNOWN_NEXT_KEYS.has(nested)) {
              observations.push({ kind: "unknown-config-key", key: nested });
            }
          }
        }
      }
    }
  }

  return observations;
}

/**
 * True when the user reports a failure but supplied nothing to diagnose
 * (EVALS T-05: "deploy نشد. ارور میده.").
 *
 * Asking for the error text is the only honest next step — anything else is a
 * guess dressed up as a diagnosis.
 */
export function lacksErrorEvidence(text: string, observations: Observation[]): boolean {
  if (observations.length > 0) return false;

  const trimmed = text.trim();
  const lineCount = trimmed.split(/\r?\n/).filter((l) => l.trim()).length;

  // Any of these means we have something concrete to work with.
  const hasErrorToken = /[A-Z]{2,}[A-Z_]*\b|npm ERR|Error:|Exception|at\s+\w+\./.test(
    trimmed,
  );
  const hasCodeBlock = /```/.test(trimmed);

  return !hasErrorToken && !hasCodeBlock && lineCount <= 3 && trimmed.length < 160;
}
