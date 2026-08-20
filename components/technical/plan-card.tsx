import { Check } from "lucide-react";

import type { DeploymentPlan } from "@/lib/conversation/types";

/** Minimal Build on Liara plan card. Not a dashboard, not a workflow canvas. */
export function PlanCard({ plan }: { plan: DeploymentPlan }) {
  return (
    <section className="mt-3 rounded-lg border border-border bg-background/60 p-3">
      <h3 className="text-sm font-medium">{plan.title}</h3>

      {plan.services.length > 0 ? (
        <ul className="mt-2 space-y-1.5">
          {plan.services.map((entry) => (
            <li key={entry.service} className="text-xs">
              <span className="font-medium text-foreground">{entry.label}</span>
              <span className="text-muted-foreground"> — {entry.reason}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {plan.steps.length > 0 ? (
        <ol className="mt-3 space-y-1.5">
          {plan.steps.map((step, index) => (
            <li key={step} className="flex items-start gap-2 text-xs">
              <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-muted text-[0.65rem] text-muted-foreground">
                {(index + 1).toLocaleString("fa-IR")}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}

/** Compact journey strip: current step only, never a large progress UI. */
export function JourneyProgress({
  title,
  current,
  total,
}: {
  title: string;
  current: number;
  total: number;
}) {
  return (
    <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-2 text-xs">
      <Check className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="truncate text-foreground">{title}</span>
      <span className="shrink-0 text-muted-foreground">
        — مرحله {current.toLocaleString("fa-IR")} از {total.toLocaleString("fa-IR")}
      </span>
    </div>
  );
}
