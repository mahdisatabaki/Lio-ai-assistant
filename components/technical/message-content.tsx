import { looksLikePastedOutput } from "@/lib/conversation/intent";

import { TechnicalBlock } from "./technical-block";

/**
 * Renders message text, pulling technical content out as LTR islands.
 *
 * Two things become blocks: fenced ``` sections, and unfenced text that looks
 * like pasted terminal output. The second case matters because users paste raw
 * logs without fences, and RTL prose styling would scramble them.
 *
 * Everything is rendered as React text nodes, so HTML inside a pasted log is
 * displayed rather than executed.
 */

type Segment =
  | { kind: "text"; content: string }
  | { kind: "block"; content: string; variant: "command" | "log" };

const FENCE = /```([\w-]*)\r?\n([\s\S]*?)```/g;

export function splitSegments(text: string): Segment[] {
  const segments: Segment[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(FENCE)) {
    const [full, language, body] = match;
    const start = match.index ?? 0;

    if (start > lastIndex) {
      segments.push(...classifyText(text.slice(lastIndex, start)));
    }

    segments.push({
      kind: "block",
      content: body.replace(/\s+$/, ""),
      variant: /^(log|logs|output|text)$/i.test(language) ? "log" : "command",
    });

    lastIndex = start + full.length;
  }

  if (lastIndex < text.length) {
    segments.push(...classifyText(text.slice(lastIndex)));
  }

  return segments.filter(
    (segment) => segment.kind === "block" || segment.content.trim().length > 0,
  );
}

/** Unfenced text is a log block when it reads like terminal output. */
function classifyText(raw: string): Segment[] {
  const trimmed = raw.replace(/^\s*\n/, "").replace(/\s+$/, "");
  if (trimmed.length === 0) return [];

  return looksLikePastedOutput(trimmed)
    ? [{ kind: "block", content: trimmed, variant: "log" }]
    : [{ kind: "text", content: trimmed }];
}

export function MessageContent({ text }: { text: string }) {
  return (
    <>
      {splitSegments(text).map((segment, index) =>
        segment.kind === "block" ? (
          <TechnicalBlock
            key={index}
            content={segment.content}
            variant={segment.variant}
          />
        ) : (
          <p key={index} className="whitespace-pre-wrap break-words leading-7">
            {segment.content}
          </p>
        ),
      )}
    </>
  );
}
