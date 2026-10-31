"use client";

import { useRef, useState } from "react";
import { cn } from "@upsolve/ui";

/**
 * One box per digit. A single real input sits invisibly over the boxes, so typing,
 * backspace, paste and the phone's "From Messages / Mail" code autofill all work natively;
 * the boxes only draw its value. Calls onComplete once every box is filled.
 */
export function OtpInput({
  length = 6,
  value,
  onChange,
  onComplete,
  error = false,
  disabled = false,
  describedBy,
}: {
  length?: number;
  value: string;
  onChange: (v: string) => void;
  onComplete?: (v: string) => void;
  error?: boolean;
  disabled?: boolean;
  describedBy?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  // Caret goes to the end; editing the middle isn't worth the complexity for a 6-digit code.
  const active = Math.min(value.length, length - 1);

  return (
    <div className="relative mx-auto w-full">
      <div
        // Re-keyed so the shake replays on each wrong code.
        key={error ? "error" : "ok"}
        className={cn(
          "flex justify-center gap-2",
          error && "animate-[otp-shake_380ms_var(--ease-out)]",
        )}
      >
        {Array.from({ length }, (_, i) => {
          const digit = value[i];
          const isActive = focused && i === active && !disabled;
          return (
            <div
              key={i}
              aria-hidden="true"
              className={cn(
                "relative grid aspect-[4/5] w-full max-w-[52px] place-items-center rounded-[14px] border bg-surface-2 shadow-inset",
                "font-mono text-[24px] font-[600] text-ink tabular-nums",
                "transition-[border-color,box-shadow,transform] duration-[var(--dur-fast)]",
                error
                  ? "border-bad/60"
                  : isActive
                    ? "border-signal-2 shadow-[var(--e-inset),0_0_0_4px_color-mix(in_srgb,var(--signal)_16%,transparent)]"
                    : digit
                      ? "border-line-3"
                      : "border-line-2",
                disabled && "opacity-60",
              )}
            >
              {digit ? (
                <span key={digit + i} className="animate-[pop-in_200ms_var(--ease-spring)]">
                  {digit}
                </span>
              ) : (
                isActive && (
                  <span className="h-7 w-[2px] animate-[otp-caret_1s_steps(1)_infinite] rounded-full bg-ink" />
                )
              )}
            </div>
          );
        })}
      </div>
      <input
        ref={ref}
        value={value}
        onChange={(e) => {
          const v = e.target.value.replace(/\D/g, "").slice(0, length);
          onChange(v);
          if (v.length === length && v !== value) onComplete?.(v);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        // Keep the caret at the end, matching the highlighted box.
        onSelect={(e) => {
          const el = e.currentTarget;
          const end = el.value.length;
          if (el.selectionStart !== end) el.setSelectionRange(end, end);
        }}
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="\d*"
        maxLength={length}
        autoFocus
        disabled={disabled}
        aria-label={`${length}-digit code from the email`}
        aria-invalid={error || undefined}
        aria-describedby={describedBy}
        className="absolute inset-0 h-full w-full cursor-text bg-transparent text-transparent caret-transparent opacity-[0.01] outline-none selection:bg-transparent"
      />
    </div>
  );
}
