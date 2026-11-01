"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@upsolve/ui";

const LEVEL = ["bg-heat-0", "bg-heat-1", "bg-heat-2", "bg-heat-3", "bg-heat-4"] as const;
const level = (n: number) => (n === 0 ? 0 : n <= 2 ? 1 : n <= 5 ? 2 : n <= 9 ? 3 : 4);
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const utc = (d: string) => new Date(`${d}T12:00:00Z`);

/**
 * Pixel calendar: cells that fill the card's width (12px minimum) on a 5-step violet → lime ramp, month labels on top, Mon/Wed/Fri
 * on the side, today outlined in lime. Cells fade in diagonally; hover or focus shows the day.
 * `days` is oldest first. On narrow screens it scrolls, starting at today.
 */
export function ActivityHeatmap({ days }: { days: { date: string; count: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const weeks = Math.ceil(days.length / 7);
  const active = days.filter((d) => d.count > 0).length;
  const total = days.reduce((n, d) => n + d.count, 0);

  // Longest run of active days in the window (display only).
  let longest = 0;
  let run = 0;
  for (const d of days) {
    run = d.count > 0 ? run + 1 : 0;
    longest = Math.max(longest, run);
  }

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, []);

  const firstDow = days[0] ? (utc(days[0].date).getUTCDay() + 6) % 7 : 0; // 0 = Mon
  const rowLabel = (r: number) => {
    const dow = (firstDow + r) % 7;
    return dow === 0 ? "Mon" : dow === 2 ? "Wed" : dow === 4 ? "Fri" : "";
  };
  const monthCols: { col: number; label: string }[] = [];
  for (let c = 0; c < weeks; c++) {
    const d = days[c * 7];
    if (!d) continue;
    const m = utc(d.date).getUTCMonth();
    const prev = c > 0 && days[(c - 1) * 7] ? utc(days[(c - 1) * 7]!.date).getUTCMonth() : -1;
    // Skip a label that would collide with the previous one (needs ~3 columns).
    const last = monthCols.at(-1);
    if (m !== prev && (!last || c - last.col >= 3)) monthCols.push({ col: c, label: MONTHS[m]! });
  }

  const h = hover === null ? null : days[hover];
  const fmt = (d: string) =>
    utc(d).toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });

  return (
    <div>
      <div ref={scroller} className="overflow-x-auto pb-1 [contain:inline-size]">
        {/* One grid for labels and cells, so the cells stretch to the card's width (min 12px,
            then it scrolls) and the month and weekday labels stay lined up at any size. */}
        <div
          className="grid w-full min-w-fit gap-[3px] sm:gap-1"
          style={{ gridTemplateColumns: `auto repeat(${weeks}, minmax(12px, 1fr))` }}
          onMouseLeave={() => setHover(null)}
        >
          <span aria-hidden="true" className="z-10 max-sm:sticky max-sm:left-0 max-sm:bg-surface" />
          {Array.from({ length: weeks }, (_, c) => {
            const m = monthCols.find((x) => x.col === c);
            return (
              <span
                key={`m${c}`}
                aria-hidden="true"
                className="relative h-4 font-mono text-[10px] text-ink-3 sm:text-11"
              >
                {m && (
                  <span className="absolute bottom-0.5 left-0 whitespace-nowrap">{m.label}</span>
                )}
              </span>
            );
          })}
          <div
            aria-hidden="true"
            className="z-10 grid grid-rows-7 gap-[3px] pr-1.5 max-sm:sticky max-sm:left-0 max-sm:bg-surface font-mono text-[10px] text-ink-3 sm:gap-1 sm:text-11"
            style={{ gridRow: "2 / span 7" }}
          >
            {Array.from({ length: 7 }, (_, r) => (
              <span key={r} className="flex items-center">
                {rowLabel(r)}
              </span>
            ))}
          </div>
          <div
            role="img"
            aria-label={`Activity: ${active} active days and ${total} solves in the last ${weeks} weeks; longest run ${longest} days`}
            className="grid grid-flow-col grid-rows-7 gap-[3px] sm:gap-1"
            style={{
              gridColumn: `2 / span ${weeks}`,
              gridRow: "2 / span 7",
              gridTemplateColumns: "subgrid",
            }}
          >
            {days.map((d, i) => {
              const today = i === days.length - 1;
              const col = Math.floor(i / 7);
              const row = i % 7;
              return (
                <span
                  key={d.date}
                  onMouseEnter={() => setHover(i)}
                  className={cn(
                    "aspect-square w-full animate-[fade-in-pop_500ms_var(--ease-out)_backwards] rounded-[3px] transition-transform duration-[var(--dur-fast)] hover:scale-[1.25] motion-reduce:animate-none sm:rounded-[5px]",
                    LEVEL[level(d.count)],
                    today && "ring-2 ring-signal ring-offset-1 ring-offset-surface",
                    level(d.count) === 4 && "shadow-[0_0_8px_-1px_var(--heat-4)]",
                    hover === i && !today && "ring-1 ring-ink/70",
                  )}
                  style={{ animationDelay: `${(col + row) * 12}ms` }}
                />
              );
            })}
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-12 text-ink-3">
        <span aria-live="polite" className="tnum min-h-[18px]">
          {h ? (
            <>
              <span className="font-[600] text-ink">{h.count} solved</span> · {fmt(h.date)}
            </>
          ) : (
            <>
              <span className="text-ink-2">{active}</span> active days ·{" "}
              <span className="text-ink-2">{longest}</span>-day best run
            </>
          )}
        </span>
        <span className="flex items-center gap-1.5 font-mono text-[10.5px]">
          less
          {LEVEL.map((c) => (
            <span key={c} className={cn("size-3 rounded-[3px]", c)} />
          ))}
          more
        </span>
      </div>
    </div>
  );
}
