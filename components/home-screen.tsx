"use client";

import { Rocket, TerminalSquare } from "lucide-react";

import { MODE_THEMES } from "@/lib/ui/modes";

import { Composer } from "./composer";

/**
 * Lio's two primary features, as product objects.
 *
 * Icon and name only — no description inside the card. A paragraph here would
 * turn a choice into reading, and the names already say what each one does.
 * Colour matches the mode the card opens into, so the conversation the user
 * lands in looks like the card they pressed.
 */
export const FEATURES = [
  {
    id: "troubleshoot",
    title: "عیب‌یابی با لیو",
    send: "یه مشکلی برای پروژه‌م پیش اومده.",
    Icon: TerminalSquare,
    theme: MODE_THEMES.troubleshooting,
  },
  {
    id: "deploy",
    title: "دیپلوی با لیو",
    send: "می‌خوام پروژه‌م رو آنلاین کنم.",
    Icon: Rocket,
    theme: MODE_THEMES.deployment,
  },
] as const;

export function HomeScreen({ onSubmit }: { onSubmit: (text: string) => void }) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-4 py-8 sm:py-12">
      <div className="flex flex-col items-center text-center">
        {/*
          Lio's main appearance (docs/LIO_UI_AND_ANIMATION.md). A plain <img>
          keeps the animated WebP playing and its transparency intact.
          `width`/`height` match the source so the hero reserves its space and
          nothing shifts once the image loads.
        */}
        {/* eslint-disable-next-line @next/next/no-img-element -- next/image
            re-encodes through its optimizer, which drops WebP animation. The
            mascot is an approved asset that must play as delivered. */}
        <img
          src="/images/liv-wave-web-512.webp"
          srcSet="/images/liv-wave-web-small.webp 256w, /images/liv-wave-web-512.webp 512w"
          sizes="(max-width: 640px) 128px, 176px"
          alt="لیو، دستیار هوش مصنوعی لیارا"
          width={512}
          height={532}
          className="h-auto w-32 max-w-full sm:w-44"
        />

        <h1 className="mt-3 text-xl font-semibold sm:text-2xl">
          سلام، من لیو هستم <span aria-hidden="true">👋</span>
        </h1>
        <p className="mt-2 max-w-md text-sm leading-7 text-muted-foreground">
          توی تمام مراحل دیپلوی کنارت هستم. اگر سؤالی داشتی یا جایی به مشکل خوردی، کافیه بهم بگی.
        </p>
        {/* The official slogan appears once, here, and never in a reply. */}
        <p className="mt-1.5 text-sm font-medium text-foreground/80">
          نگران نباش، با هم دیپلویش می‌کنیم.
        </p>
      </div>

      <h2 className="mt-8 text-center text-sm font-medium text-muted-foreground">
        لیو چطور کمکت کنه؟
      </h2>

      {/* Stacked on the narrowest screens so each card keeps its square feel. */}
      <div className="mt-3 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
        {FEATURES.map(({ id, title, send, Icon, theme }) => (
          <button
            key={id}
            type="button"
            onClick={() => onSubmit(send)}
            style={{ backgroundColor: theme.soft, borderColor: theme.border }}
            className="group flex aspect-[4/3] flex-col items-center justify-center gap-3 rounded-2xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none min-[420px]:aspect-square"
          >
            <Icon
              aria-hidden="true"
              strokeWidth={1.5}
              className="size-10 transition-transform group-hover:scale-105 sm:size-12"
              style={{ color: theme.accent }}
            />
            <span className="text-sm font-semibold sm:text-base" style={{ color: theme.ink }}>
              {title}
            </span>
          </button>
        ))}
      </div>

      {/* General Q&A stays available, deliberately quieter than the two cards. */}
      <p className="mt-7 text-center text-xs text-muted-foreground">
        یا هر سؤال دیگه‌ای درباره لیارا داری از لیو بپرس
      </p>
      <Composer className="mt-2" onSubmit={onSubmit} />
    </main>
  );
}
