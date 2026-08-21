import { ExternalLink } from "lucide-react";

import type { SourceReference } from "@/lib/conversation/types";

/** Sources stay visually secondary (PRD UX-05). URLs render LTR. */
export function SourceCards({ sources }: { sources: SourceReference[] }) {
  if (sources.length === 0) return null;

  return (
    <div className="mt-4 space-y-1">
      <p className="text-[0.7rem] text-muted-foreground">منبع</p>
      <ul className="space-y-1.5">
        {sources.map((source) => (
          <li key={source.url}>
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-2 rounded-md border border-border/70 bg-background/60 px-2.5 py-2 text-xs transition-colors hover:border-border hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <ExternalLink className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
              <span className="min-w-0">
                <span className="block truncate text-foreground">{source.title}</span>
                {source.heading ? (
                  <span className="block truncate text-muted-foreground">
                    {source.heading}
                  </span>
                ) : null}
                <span dir="ltr" className="block truncate text-left text-muted-foreground/80">
                  {source.url}
                </span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
