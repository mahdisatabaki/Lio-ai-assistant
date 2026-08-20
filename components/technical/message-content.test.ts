import { describe, expect, it } from "vitest";

import { splitSegments } from "./message-content";

describe("splitSegments", () => {
  it("keeps ordinary Persian prose as text", () => {
    const segments = splitSegments("سلام، این یک جواب معمولی است.");
    expect(segments).toEqual([
      { kind: "text", content: "سلام، این یک جواب معمولی است." },
    ]);
  });

  it("extracts a fenced command block", () => {
    const segments = splitSegments("این دستور رو بزن:\n```bash\nliara deploy\n```");
    expect(segments).toHaveLength(2);
    expect(segments[0]).toMatchObject({ kind: "text" });
    expect(segments[1]).toEqual({
      kind: "block",
      content: "liara deploy",
      variant: "command",
    });
  });

  it("marks a fenced log fence as a log", () => {
    const [segment] = splitSegments("```log\nnpm ERR! boom\n```");
    expect(segment).toMatchObject({ variant: "log" });
  });

  it("treats unfenced pasted terminal output as a log block", () => {
    const log = [
      "npm ERR! code ECONNRESET",
      "npm ERR! network request failed",
      "npm ERR! network self-signed certificate",
    ].join("\n");

    expect(splitSegments(log)).toEqual([
      { kind: "block", content: log, variant: "log" },
    ]);
  });

  it("preserves exact line breaks and tokens inside a block", () => {
    const [segment] = splitSegments("```\nline one\n  indented\nline three\n```");
    expect(segment).toMatchObject({ content: "line one\n  indented\nline three" });
  });

  it("does not execute or strip HTML in pasted content", () => {
    const [segment] = splitSegments("```\n<script>alert(1)</script>\n```");
    expect(segment).toMatchObject({ content: "<script>alert(1)</script>" });
  });

  it("handles prose before and after a block", () => {
    const segments = splitSegments("قبل\n```\ncmd\n```\nبعد");
    expect(segments.map((s) => s.kind)).toEqual(["text", "block", "text"]);
  });
});
