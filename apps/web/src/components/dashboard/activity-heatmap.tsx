"use client";

import { useState } from "react";
import { cn } from "@upsolve/ui";

const LEVEL = [
  "bg-pixel-off",
  "bg-primary/30",
  "bg-primary/55",
  "bg-primary/80",
  "bg-primary",
] as const;
const level = (n: number) => (n === 0 ? 0 : n <= 2 ? 1 : n <= 5 ? 2 : n <= 9 ? 3 : 4);

/**
 * GitHub-style calendar with a hover tooltip per day. Columns fade in left to
 * right; today is lime. `days` is oldest first, a multiple of 7 long.
 */
export function ActivityHeatmap({ days }: { days: { date: string; count: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const weeks = Math.ceil(days.length / 7);
  const active = days.filter((d) => d.count > 0).length;
  const h = hover === null ? null : days[hover];
  const fmt = (d: string) =>
    new Date(`${d}T12:00:00Z`).toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });

  return (
    <div className="relative">
      <div
        role="img"
        aria-label={`Activity heatmap: ${active} active days in the last ${weeks} weeks`}
        className="grid grid-flow-col grid-rows-7 gap-[3px]"
        style={{ gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))` }}
        onMouseLeave={() => setHover(null)}
      >
        {days.map((d, i) => {
          const today = i === days.length - 1;
          return (
            <span
              key={d.date}
              onMouseEnter={() => setHover(i)}
              className={cn(
                "aspect-square animate-[fade-up_var(--dur-slower)_var(--ease-out)_both] rounded-[4px] transition-transform duration-[var(--dur-fast)] hover:scale-125",
                today && d.count > 0
                  ? "bg-signal shadow-[0_0_10px_var(--signal)]"
                  : LEVEL[level(d.count)],
                hover === i && "ring-2 ring-ink/60",
              )}
              style={{ animationDelay: `${Math.floor(i / 7) * 14}ms` }}
            />
          );
        })}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 font-mono text-[11px] text-ink-3">
        <span aria-live="polite">
          {h ? (
            <>
              <span className="text-ink">
                {h.count} submission{h.count === 1 ? "" : "s"}
              </span>{" "}
              · {fmt(h.date)}
            </>
          ) : (
            "Hover a day. Dates in UTC."
          )}
        </span>
        <span className="flex items-center gap-1.5">
          less
          {LEVEL.map((c) => (
            <span key={c} className={cn("size-2.5 rounded-[3px]", c)} />
          ))}
          more
        </span>
      </div>
    </div>
  );
}
