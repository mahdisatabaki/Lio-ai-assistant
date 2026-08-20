"use client";

import type { NextAction } from "@/lib/conversation/types";

/** Tappable next steps. Selecting one submits its text as the user's message. */
export function ActionChips({
  actions,
  onSelect,
  disabled,
}: {
  actions: NextAction[];
  onSelect: (action: NextAction) => void;
  disabled?: boolean;
}) {
  if (actions.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(action)}
          className="rounded-full border border-border bg-background px-3 py-1.5 text-xs transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
