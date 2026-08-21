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
      <div className="flex flex-col items-center text-center">
        {/*
          Lio's main appearance (docs/LIO_UI_AND_ANIMATION.md). A plain <img>
          keeps the animated WebP playing and its transparency intact — no
          canvas, no animation library, no recolouring of the asset.
          `width`/`height` match the source so the hero reserves its space and
          nothing shifts once the image loads.
        */}
        {/* eslint-disable-next-line @next/next/no-img-element -- next/image
            re-encodes through its optimizer, which drops WebP animation. The
            mascot is an approved asset that must play as delivered
            (docs/LIO_UI_AND_ANIMATION.md). */}
        <img
          src="/images/liv-wave-web-512.webp"
          srcSet="/images/liv-wave-web-small.webp 256w, /images/liv-wave-web-512.webp 512w"
          sizes="(max-width: 640px) 160px, 208px"
          alt="لیو، دستیار هوش مصنوعی لیارا"
          width={512}
          height={532}
          className="h-auto w-40 max-w-full sm:w-52"
        />

        <h1 className="mt-4 text-2xl font-semibold sm:text-3xl">
          سلام، من لیو هستم <span aria-hidden="true">👋</span>
        </h1>
        <p className="mt-3 max-w-md text-sm leading-7 text-muted-foreground sm:text-base">
          توی تمام مراحل دیپلوی کنارت هستم. اگر سؤالی داشتی یا جایی به مشکل خوردی، کافیه بهم بگی.
        </p>
        {/* The official slogan appears once, here, and never in a reply. */}
        <p className="mt-2 text-sm font-medium text-foreground/80">
          نگران نباش، با هم دیپلویش می‌کنیم.
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
