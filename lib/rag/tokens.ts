/**
 * Technical token extraction for the exact-match retrieval arm
 * (`docs/TECH.md` 16.2).
 *
 * Semantic search is weak exactly where support questions are strongest:
 * `ECONNRESET`, `liara.json`, `npm ERR!`. These are literal strings, so they get
 * a literal lookup.
 *
 * The bar for "technical" is deliberately high. Ordinary Persian and English
 * prose must not become search tokens, or the lexical arm floods the merge with
 * noise.
 */

/** Multi-word literals worth matching as a unit. Checked before single tokens. */
const PHRASE_PATTERNS: RegExp[] = [
  /\bnpm\s+ERR!/gi,
  /\byarn\s+error\b/gi,
  /\bpnpm\s+ERR_/gi,
  /\bmodule\s+not\s+found\b/gi,
  /\bexit\s+(?:code|status)\s+\d+/gi,
];

const SINGLE_PATTERNS: RegExp[] = [
  // Errno-style constants: ECONNRESET, ENOENT, EADDRINUSE.
  /\bE[A-Z]{3,}\b/g,
  // SCREAMING_SNAKE identifiers: DATABASE_URL, NODE_ENV.
  /\b[A-Z][A-Z0-9]{2,}(?:_[A-Z0-9]+)+\b/g,
  // Filenames with a known config/code extension.
  /\b[\w.-]+\.(?:json|jsonc|ya?ml|toml|env|lock|ts|tsx|js|jsx|mjs|cjs|md|sh|sql|dockerfile)\b/gi,
  // Dotfiles and config files: .env.local, .liaraignore, Dockerfile.
  /(?:^|[\s(["'`])(\.[a-z][\w.-]*)/gi,
  // CamelCase error classes: TypeError, ReferenceError, MyCustomError.
  /\b[A-Z][a-zA-Z]*(?:Error|Exception|Warning)\b/g,
  // Namespaced npm packages: @liara/cli, @ai-sdk/react.
  /@[\w-]+\/[\w.-]+/g,
  // Dotted config keys: next.mirror, build.command.
  /\b[a-z][\w-]*(?:\.[a-z][\w-]*)+\b/gi,
  // CLI invocations for known tools.
  /\b(?:liara|npm|npx|yarn|pnpm|node|docker|git|psql)\s+[a-z][\w:-]*/gi,
  // HTTP status-ish codes paired with a word, e.g. "503 Service".
  /\b[45]\d{2}\s+[A-Z][a-z]+/g,
];

/** Words that match a pattern but carry no retrieval signal. */
const STOP_TOKENS = new Set([
  "e.g",
  "i.e",
  "etc",
  "vs",
  "node.js",
  "next.js",
  "readme.md",
]);

const MIN_TOKEN_CHARS = 3;
const MAX_TOKENS = 12;

function isNoise(token: string): boolean {
  const lower = token.toLowerCase();
  if (STOP_TOKENS.has(lower)) return true;
  if (token.length < MIN_TOKEN_CHARS) return true;
  // Anything with Persian/Arabic letters is prose, not a technical token.
  if (/[؀-ۿ]/.test(token)) return true;
  // A bare number or punctuation run carries no signal.
  if (!/[a-z]/i.test(token)) return true;
  return false;
}

/**
 * Pulls technical tokens out of free text, most specific first.
 *
 * Order matters: phrases are extracted before single tokens so `npm ERR!`
 * survives rather than being shredded into `npm`.
 */
export function extractTechnicalTokens(text: string): string[] {
  if (!text) return [];

  const found: string[] = [];
  const seen = new Set<string>();

  const add = (raw: string | undefined) => {
    if (!raw) return;
    const token = raw.trim().replace(/[.,;:)\]}'"`]+$/, "");
    if (isNoise(token)) return;
    const key = token.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    found.push(token);
  };

  for (const pattern of PHRASE_PATTERNS) {
    for (const match of text.matchAll(pattern)) {
      add(match[0].replace(/\s+/g, " "));
    }
  }

  for (const pattern of SINGLE_PATTERNS) {
    for (const match of text.matchAll(pattern)) {
      // Some patterns capture the useful part in group 1.
      add(match[1] ?? match[0]);
    }
  }

  return found.slice(0, MAX_TOKENS);
}

/** True when the query carries enough literal signal to run the lexical arm. */
export function hasTechnicalSignal(text: string): boolean {
  return extractTechnicalTokens(text).length > 0;
}
