"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

/**
 * An LTR island inside the RTL UI, for commands, code, and logs.
 *
 * Content is rendered as text, never as HTML, so pasted user output cannot
 * execute. Exact line breaks and tokens survive because `<pre>` preserves them
 * and nothing reflows the text.
 */
export function TechnicalBlock({
  content,
  variant = "command",
  label,
}: {
  content: string;
  variant?: "command" | "log";
  label?: string;
}) {
  const [copied, setCopied] = useState(false);
  const isLog = variant === "log";

  async function copy() {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be blocked; the text stays selectable either way.
    }
  }

  return (
    <figure
      className={cn(
        "my-3 overflow-hidden rounded-lg border border-border",
        isLog ? "bg-muted/60" : "bg-muted/40",
      )}
    >
      <figcaption className="flex items-center justify-between gap-2 border-b border-border/70 px-3 py-1.5">
        <span className="truncate text-xs text-muted-foreground">
          {label ?? (isLog ? "خروجی" : "دستور")}
        </span>
        <button
          type="button"
          onClick={copy}
          aria-label={copied ? "کپی شد" : "کپی کردن"}
          className="flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          <span>{copied ? "کپی شد" : "کپی"}</span>
        </button>
      </figcaption>
      <pre
        dir="ltr"
        className="overflow-x-auto px-3 py-2.5 text-left font-mono text-[0.8rem] leading-6"
      >
        <code>{content}</code>
      </pre>
    </figure>
  );
}
