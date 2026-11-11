"use client";

import { useEffect, useState } from "react";
import { CheckDraw, Spinner, cn } from "@upsolve/ui";

/**
 * Multi-step loader (FRONTEND-PLAN §8 Onboarding 1): while a slow job runs, its steps tick
 * one by one so you can see what's happening. Steps advance on a gentle timer, the last one
 * waits for the real job, and everything ticks when `done` turns true.
 */
export function MultiStepLoader({
  steps,
  done,
  stepMs = 1300,
  className,
}: {
  steps: string[];
  done: boolean;
  stepMs?: number;
  className?: string;
}) {
  const [at, setAt] = useState(0);
  useEffect(() => {
    if (done) return;
    const t = window.setInterval(() => setAt((n) => Math.min(steps.length - 1, n + 1)), stepMs);
    return () => clearInterval(t);
  }, [done, stepMs, steps.length]);
  const current = done ? steps.length : at;
  return (
    <ol className={cn("flex flex-col gap-2", className)} aria-live="polite">
      {steps.map((s, i) => {
        const state = i < current ? "done" : i === current ? "now" : "next";
        return (
          <li
            key={s}
            className={cn(
              "flex items-center gap-2.5 text-13 transition-opacity duration-300",
              state === "next" ? "opacity-40" : "opacity-100",
            )}
          >
            <span
              className={cn(
                "grid size-5 shrink-0 place-items-center rounded-full",
                state === "done"
                  ? "bg-[var(--signal-mark)] text-signal-ink"
                  : "shadow-[inset_0_0_0_1.5px_var(--line-2)] text-ink-3",
              )}
            >
              {state === "done" ? (
                <CheckDraw size={11} />
              ) : state === "now" ? (
                <Spinner className="size-3" />
              ) : null}
            </span>
            <span className={cn(state === "now" ? "font-[600] text-ink" : "text-ink-2")}>{s}</span>
          </li>
        );
      })}
    </ol>
  );
}
