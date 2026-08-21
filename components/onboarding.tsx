"use client";

import { Rocket, TerminalSquare } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { MODE_THEMES } from "@/lib/ui/modes";

/**
 * First-run introduction, shown once.
 *
 * A full-page flow rather than a modal: three short screens read fine at 375px
 * this way, where a desktop dialog squeezed onto a phone does not. Skipping is
 * available on every screen — an introduction the user cannot leave is a wall.
 *
 * The only thing stored is a completion marker. No questions, no journey state,
 * no project details, nothing sensitive.
 */

export const ONBOARDING_KEY = "lio_onboarding_v1";

/** Reads the marker defensively: private mode can make localStorage throw. */
export function hasCompletedOnboarding(): boolean {
  try {
    return window.localStorage.getItem(ONBOARDING_KEY) === "completed";
  } catch {
    // Unavailable storage should not trap the user in the introduction.
    return true;
  }
}

function markCompleted() {
  try {
    window.localStorage.setItem(ONBOARDING_KEY, "completed");
  } catch {
    // Nothing to do: the flow still ends, it just may run again next visit.
  }
}

const SCREENS = [
  {
    id: "intro",
    title: "لیو، هم‌تیمی فنی تو در لیارا",
    body: "لازم نیست بین مستندات دنبال جواب بگردی. مشکلت رو به لیو بگو؛ جواب مشخص و قدم بعدی رو بهت می‌گه.",
    action: "ببین لیو چه کارهایی می‌کنه",
    theme: null,
    Icon: null,
  },
  {
    id: "troubleshoot",
    title: "عیب‌یابی با لیو",
    body: "خطا یا لاگ پروژه‌ت رو بفرست. لیو مستندات مرتبط رو بررسی می‌کنه، مشکل رو تشخیص می‌ده و یک راه‌حل مشخص بهت می‌ده.",
    action: "بعدی",
    theme: MODE_THEMES.troubleshooting,
    Icon: TerminalSquare,
  },
  {
    id: "deploy",
    title: "دیپلوی با لیو",
    body: "پروژه‌ت رو معرفی کن؛ لیو از آماده‌سازی تا دیپلوی روی لیارا قدم‌به‌قدم کنارت میاد.",
    action: "شروع کنیم",
    theme: MODE_THEMES.deployment,
    Icon: Rocket,
  },
] as const;

export function Onboarding({ onDone }: { onDone: () => void }) {
  const [index, setIndex] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const screen = SCREENS[index];

  // Move focus to the new heading each step so keyboard and screen-reader users
  // are not left behind on a button that no longer exists.
  useEffect(() => {
    headingRef.current?.focus();
  }, [index]);

  function finish() {
    markCompleted();
    onDone();
  }

  function next() {
    if (index === SCREENS.length - 1) finish();
    else setIndex((current) => current + 1);
  }

  return (
    <main
      className="flex min-h-full flex-1 flex-col items-center justify-center px-5 py-10"
      style={screen.theme ? { backgroundColor: screen.theme.soft } : undefined}
    >
      <div className="flex w-full max-w-md flex-col items-center text-center">
        {screen.Icon ? (
          <screen.Icon
            aria-hidden="true"
            strokeWidth={1.5}
            className="size-14 sm:size-16"
            style={{ color: screen.theme!.accent }}
          />
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element -- animated WebP;
             next/image would re-encode and drop the animation. */
          <img
            src="/images/liv-wave-web-512.webp"
            srcSet="/images/liv-wave-web-small.webp 256w, /images/liv-wave-web-512.webp 512w"
            sizes="(max-width: 640px) 128px, 160px"
            alt="لیو، دستیار هوش مصنوعی لیارا"
            width={512}
            height={532}
            className="h-auto w-32 max-w-full sm:w-40"
          />
        )}

        <h1
          ref={headingRef}
          tabIndex={-1}
          className="mt-5 text-xl font-semibold outline-none sm:text-2xl"
          style={screen.theme ? { color: screen.theme.ink } : undefined}
        >
          {screen.title}
        </h1>

        <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">
          {screen.body}
        </p>

        <button
          type="button"
          onClick={next}
          style={screen.theme ? { backgroundColor: screen.theme.accent } : undefined}
          className="mt-7 w-full rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          {screen.action}
        </button>

        <button
          type="button"
          onClick={finish}
          className="mt-3 rounded-md px-3 py-2 text-xs text-muted-foreground underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          رد کردن
        </button>

        <p className="mt-5 text-[0.7rem] text-muted-foreground" aria-live="polite">
          {index + 1} از {SCREENS.length}
        </p>
      </div>
    </main>
  );
}
