"use client";

import { ArrowUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { config } from "@/lib/config";
import { cn } from "@/lib/utils";

export const COMPOSER_PLACEHOLDER =
  "هر سؤال یا خطایی درباره لیارا داری اینجا بنویس...";

/**
 * Shared composer for both surfaces.
 *
 * Enter sends, Shift+Enter adds a line, so multi-line logs can be pasted and
 * edited before sending. Oversized input is reported here rather than making a
 * round trip only to be rejected by the server.
 */
export function Composer({
  onSubmit,
  disabled,
  autoFocus,
  className,
}: {
  onSubmit: (text: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
}) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const tooLong = value.length > config.maxMessageChars;
  const canSend = value.trim().length > 0 && !tooLong && !disabled;

  useEffect(() => {
    const node = textareaRef.current;
    if (!node) return;
    node.style.height = "auto";
    node.style.height = `${Math.min(node.scrollHeight, 200)}px`;
  }, [value]);

  function send() {
    if (!canSend) return;
    onSubmit(value.trim());
    setValue("");
  }

  return (
    <div className={className}>
      <div
        className={cn(
          "flex items-end gap-2 rounded-2xl border bg-background p-2 transition-colors focus-within:border-ring",
          tooLong ? "border-destructive" : "border-border",
        )}
      >
        <textarea
          ref={textareaRef}
          value={value}
          autoFocus={autoFocus}
          rows={1}
          disabled={disabled}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              send();
            }
          }}
          placeholder={COMPOSER_PLACEHOLDER}
          aria-label={COMPOSER_PLACEHOLDER}
          className="max-h-[200px] min-h-9 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm leading-6 outline-none placeholder:text-muted-foreground disabled:opacity-60"
        />
        <button
          type="button"
          onClick={send}
          disabled={!canSend}
          aria-label="ارسال"
          className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <ArrowUp className="size-4" />
        </button>
      </div>

      {tooLong ? (
        <p role="alert" className="mt-1.5 px-1 text-xs text-destructive">
          متن خیلی طولانیه. لطفاً فقط بخش مهم لاگ یا خطا رو بفرست (حداکثر{" "}
          {config.maxMessageChars.toLocaleString("fa-IR")} کاراکتر).
        </p>
      ) : (
        <p className="mt-1.5 px-1 text-[0.7rem] text-muted-foreground">
          برای خط جدید Shift+Enter بزن. لاگ و خطا رو می‌تونی مستقیم بچسبونی.
        </p>
      )}
    </div>
  );
}
