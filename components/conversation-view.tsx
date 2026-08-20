"use client";

import { RefreshCw, RotateCcw } from "lucide-react";
import { useEffect, useRef } from "react";

import type { ConversationState, NextAction } from "@/lib/conversation/types";
import { journeyProgress } from "@/lib/conversation/state";
import { cn } from "@/lib/utils";

import { Composer } from "./composer";
import { ActionChips } from "./technical/action-chips";
import { MessageContent } from "./technical/message-content";
import { JourneyProgress, PlanCard } from "./technical/plan-card";
import { SourceCards } from "./technical/source-card";
import type { UiMessage } from "./assistant-app";

const JOURNEY_TITLES: Record<string, string> = {
  "nextjs-deploy": "استقرار پروژه Next.js",
};

export function ConversationView({
  messages,
  state,
  isSending,
  error,
  onSubmit,
  onRetry,
  onReset,
}: {
  messages: UiMessage[];
  state: ConversationState;
  isSending: boolean;
  error: string | null;
  onSubmit: (text: string) => void;
  onRetry: () => void;
  onReset: () => void;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  const progress = journeyProgress(state);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, isSending]);

  function handleAction(action: NextAction) {
    onSubmit(action.send);
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-4 py-2.5">
          <span className="text-sm font-medium">دستیار لیارا</span>
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <RotateCcw className="size-3.5" />
            گفتگوی جدید
          </button>
        </div>
        {progress && state.activeJourney ? (
          <JourneyProgress
            title={JOURNEY_TITLES[state.activeJourney] ?? "مسیر راهنما"}
            current={progress.current}
            total={progress.total}
          />
        ) : null}
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-4">
        <ul className="space-y-4">
          {messages.map((message) => (
            <li
              key={message.id}
              className={cn(
                "flex",
                message.role === "user" ? "justify-start" : "justify-start",
              )}
            >
              <div
                className={cn(
                  "w-full min-w-0 rounded-xl px-3.5 py-3 text-sm",
                  message.role === "user"
                    ? "bg-muted/70"
                    : "border border-border bg-background",
                )}
              >
                <p className="mb-1.5 text-[0.7rem] text-muted-foreground">
                  {message.role === "user" ? "تو" : "دستیار"}
                </p>

                <MessageContent text={message.content} />

                {message.plan ? <PlanCard plan={message.plan} /> : null}
                {message.sources ? <SourceCards sources={message.sources} /> : null}
                {message.actions ? (
                  <ActionChips
                    actions={message.actions}
                    onSelect={handleAction}
                    disabled={isSending}
                  />
                ) : null}
              </div>
            </li>
          ))}

          {isSending ? (
            <li aria-live="polite">
              <div className="w-full rounded-xl border border-border bg-background px-3.5 py-3">
                <p className="mb-1.5 text-[0.7rem] text-muted-foreground">دستیار</p>
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="size-1.5 animate-pulse rounded-full bg-muted-foreground" />
                  در حال بررسی...
                </p>
              </div>
            </li>
          ) : null}
        </ul>

        {error ? (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-destructive/40 bg-destructive/5 px-3.5 py-3"
          >
            <p className="text-sm text-foreground">{error}</p>
            <button
              type="button"
              onClick={onRetry}
              disabled={isSending}
              className="mt-2.5 flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs transition-colors hover:bg-muted disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <RefreshCw className="size-3.5" />
              تلاش دوباره
            </button>
          </div>
        ) : null}

        <div ref={endRef} />
      </main>

      <div className="sticky bottom-0 border-t border-border bg-background/95 backdrop-blur">
        <div className="mx-auto w-full max-w-2xl px-4 py-3">
          <Composer onSubmit={onSubmit} disabled={isSending} />
        </div>
      </div>
    </div>
  );
}
