"use client";

import { AlertCircle, Rocket } from "lucide-react";

import { Composer } from "./composer";

/** The two frozen primary actions from PRD 28.2. */
export const PRIMARY_ACTIONS = [
  {
    id: "troubleshoot",
    title: "یه مشکلی برای پروژه‌م پیش اومده",
    hint: "خطا یا لاگت رو بفرست تا قدم بعدی رو پیدا کنیم.",
    send: "یه مشکلی برای پروژه‌م پیش اومده.",
    Icon: AlertCircle,
  },
  {
    id: "deploy",
    title: "می‌خوام پروژه‌م رو آنلاین کنم",
    hint: "نیاز پروژه‌ت رو می‌فهمیم و قدم‌به‌قدم برای استقرار جلو می‌ریم.",
    send: "می‌خوام پروژه‌م رو آنلاین کنم.",
    Icon: Rocket,
  },
] as const;

/**
 * Home is a starting point, not a mode picker. Choosing an action just seeds
 * the first message of the same conversation, and typing directly works too.
 */
export function HomeScreen({ onSubmit }: { onSubmit: (text: string) => void }) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-4 py-10 sm:py-16">
      <div className="text-center">
        <h1 className="text-2xl font-semibold sm:text-3xl">چطور می‌تونم کمکت کنم؟</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">
          اگر خطا داری همین‌جا بفرست، یا بگو می‌خوای چه کاری روی لیارا انجام بدی.
        </p>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {PRIMARY_ACTIONS.map(({ id, title, hint, send, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onSubmit(send)}
            className="group rounded-xl border border-border bg-background p-4 text-right transition-colors hover:border-ring hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <span className="flex items-start gap-3">
              <Icon className="mt-0.5 size-5 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
              <span className="min-w-0">
                <span className="block text-sm font-medium">{title}</span>
                <span className="mt-1 block text-xs leading-6 text-muted-foreground">
                  {hint}
                </span>
              </span>
            </span>
          </button>
        ))}
      </div>

      <Composer className="mt-6" onSubmit={onSubmit} autoFocus />
    </main>
  );
}
