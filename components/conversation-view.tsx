"use client";

import { RefreshCw, RotateCcw } from "lucide-react";
import { useEffect, useRef } from "react";

import type { ConversationState, NextAction } from "@/lib/conversation/types";
import { journeyProgress } from "@/lib/conversation/state";
import { featureModeFor, themeFor } from "@/lib/ui/modes";
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

  // Mode colour marks what the conversation is doing, not who is speaking.
  const mode = featureModeFor({ intent: state.intent, activeJourney: state.activeJourney });
  const theme = themeFor(mode);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, isSending]);

  function handleAction(action: NextAction) {
    onSubmit(action.send);
  }

  return (
    <div
      className="flex min-h-full flex-1 flex-col"
      style={theme ? { backgroundColor: theme.surface } : undefined}
    >
      <header
        className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur"
        style={theme ? { borderColor: theme.border } : undefined}
      >
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-4 py-2.5">
          <span className="flex items-center gap-2 text-sm font-medium">
            {/* Decorative: the name beside it already announces the identity. */}
            {/* eslint-disable-next-line @next/next/no-img-element -- see Home: the
                optimizer would strip the WebP animation. */}
            <img
              src="/images/liv-wave-web-small.webp"
              alt=""
              width={256}
              height={266}
              className="size-6 shrink-0"
            />
            لیو، دستیار لیارا
          </span>
          {/* The label carries the mode too, so colour is never the only cue. */}
          {theme ? (
            <span
              className="rounded-full px-2 py-0.5 text-[0.7rem] font-medium"
              style={{ backgroundColor: theme.soft, color: theme.ink }}
            >
              {theme.label}
            </span>
          ) : null}
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
            accent={themeFor("deployment")!}
          />
        ) : null}
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-4 pb-6">
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
                // Lio's answer is the primary content: white and bordered.
                // The user's message sits back in slate. Neither uses the mode
                // colours, which belong to the conversation, not the speaker.
                className={cn(
                  "w-full min-w-0 rounded-xl px-3.5 py-3 text-sm",
                  message.role === "user"
                    ? "border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800/60"
                    : "border border-border bg-white shadow-sm dark:bg-background",
                )}
              >
                <p className="mb-1.5 text-[0.7rem] text-muted-foreground">
                  {message.role === "user" ? "تو" : "لیو"}
                </p>

                <MessageContent text={message.content} />

                {message.plan ? <PlanCard plan={message.plan} /> : null}
                {/* Action first, then the source: what to do next matters more
                    than where it came from. */}
                {message.actions ? (
                  <ActionChips
                    actions={message.actions}
                    onSelect={handleAction}
                    disabled={isSending}
                  />
                ) : null}
                {message.sources ? <SourceCards sources={message.sources} /> : null}
              </div>
            </li>
          ))}

          {isSending ? (
            <li aria-live="polite">
              <div className="w-full rounded-xl border border-border bg-background px-3.5 py-3">
                <p className="mb-1.5 text-[0.7rem] text-muted-foreground">لیو</p>
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="size-1.5 animate-pulse rounded-full bg-muted-foreground" />
                  دارم بررسیش می‌کنم…
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

      {/*
        Anchored to the bottom of the viewport. `mt-auto` keeps it pinned down
        even when the conversation is short, so it never floats mid-page, and the
        safe-area inset keeps the send control clear of the home indicator on
        phones. The message area's bottom padding plus this surface mean the last
        reply is always scrollable clear of the bar.
      */}
      <div
        className="sticky bottom-0 z-10 mt-auto border-t bg-background/95 backdrop-blur"
        style={{
          borderColor: theme?.border,
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <div className="mx-auto w-full max-w-2xl px-4 py-3">
          <Composer onSubmit={onSubmit} disabled={isSending} accent={theme?.accent} />
        </div>
      </div>
    </div>
  );
}
