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
  // lower_snake identifiers and directory names: node_modules, content_hash.
  // Requiring an underscore keeps ordinary words out.
  /\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/g,
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

/**
 * Liara product and platform nouns worth matching literally.
 *
 * These behave like technical tokens in this corpus: "object storage" and
 * "mirror" name specific documentation areas, and a user asking about them in
 * Persian prose otherwise offers the lexical arm nothing to match. Added after
 * EVALS R-03 and R-05 returned no tokens at all.
 */
const LIARA_TERMS = [
  "object storage",
  "bucket",
  "mirror",
  "pgvector",
  "dbaas",
  "paas",
  "liara cli",
  "private network",
  "one-click",
];

/**
 * Query shapes whose documented Liara answer lives under a specific term.
 *
 * A user reporting `npm ERR! network request to package registry failed` never
 * types the word "mirror", yet Liara's documented guidance for package-install
 * failures is the mirror opt-out on the deployment page. Without this the
 * selector picked an unrelated error page and the model filled the gap with
 * generic advice like `npm cache clean --force`, which Liara does not document.
 */
const DERIVED_TERM_SIGNALS: [RegExp, string][] = [
  [/npm\s*err|package\s*registry|registry\s*failed|نصب\s*پکیج|مخزن\s*پکیج/i, "mirror"],
  // Persistent user files. Someone asking "should I keep user photos on the
  // app?" never types "Object Storage", yet that is Liara's documented answer.
  // Without this the query carried no signal at all and semantic search drifted
  // to unrelated pages.
  // Scoped to *user* files on purpose. A bare "آپلود" also appears in
  // "should I upload node_modules?", which is a deployment question — that
  // over-trigger sent a deployment question to the Object Storage docs.
  [
    /(عکس|تصویر|ویدیو|فایل)(‌| )?های? ?(کاربر|یوزر)|(کاربر|یوزر)[^.\n]{0,25}(آپلود|اپلود|upload)|(آپلود|اپلود|upload)[^.\n]{0,25}(کاربر|یوزر)|ذخیره(‌| )?(ی )?(عکس|تصویر|ویدیو)/i,
    "object storage",
  ],
];

/**
 * Persian spellings of the same products, mapped to the English token.
 *
 * The documentation is written with the English product names, so a user asking
 * about «آبجکت استوریج» offers the lexical arm nothing to match and bare
 * semantic search drifts — a live query returned AI-SDK `generate-object`
 * cookbook pages for an Object Storage question. Mapping the transliteration
 * back to the English term is what keeps the citation honest.
 */
const PERSIAN_TERM_ALIASES: [RegExp, string][] = [
  [/آبجکت\s*استوریج|ابجکت\s*استوریج/, "object storage"],
  [/باکت/, "bucket"],
  [/پستگرس|پستگرES|پستگر/, "postgres"],
  [/شبکه\s*خصوصی/, "private network"],
  [/میرور/, "mirror"],
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

  const lowered = text.toLowerCase();
  for (const term of LIARA_TERMS) {
    if (lowered.includes(term)) add(term);
  }
  for (const [pattern, term] of PERSIAN_TERM_ALIASES) {
    if (pattern.test(text)) add(term);
  }
  for (const [pattern, term] of DERIVED_TERM_SIGNALS) {
    if (pattern.test(text)) add(term);
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
