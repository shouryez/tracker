"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@upsolve/ui";

const LEVEL = ["bg-heat-0", "bg-heat-1", "bg-heat-2", "bg-heat-3", "bg-heat-4"] as const;
const level = (n: number) => (n === 0 ? 0 : n <= 2 ? 1 : n <= 5 ? 2 : n <= 9 ? 3 : 4);
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const utc = (d: string) => new Date(`${d}T12:00:00Z`);

/**
 * Pixel calendar: 12px cells on a 5-step violet → lime ramp, month labels on top, Mon/Wed/Fri
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
      <div className="flex gap-2">
        <div
          aria-hidden="true"
          className="mt-[18px] grid shrink-0 grid-rows-7 gap-[3px] font-mono text-[10px] text-ink-3"
        >
          {Array.from({ length: 7 }, (_, r) => (
            <span key={r} className="h-3 leading-3">
              {rowLabel(r)}
            </span>
          ))}
        </div>
        <div ref={scroller} className="min-w-0 flex-1 overflow-x-auto pb-1">
          <div className="relative w-max">
            <div
              aria-hidden="true"
              className="relative mb-1.5 h-3 font-mono text-[10px] text-ink-3"
            >
              {monthCols.map((m) => (
                <span key={m.col} className="absolute top-0" style={{ left: m.col * 15 }}>
                  {m.label}
                </span>
              ))}
            </div>
            <div
              role="img"
              aria-label={`Activity: ${active} active days and ${total} solves in the last ${weeks} weeks; longest run ${longest} days`}
              className="grid grid-flow-col grid-rows-[repeat(7,12px)] gap-[3px]"
              style={{ gridTemplateColumns: `repeat(${weeks}, 12px)` }}
              onMouseLeave={() => setHover(null)}
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
                      "size-3 animate-[fade-in-pop_500ms_var(--ease-out)_both] rounded-[3px] transition-transform duration-[var(--dur-fast)] hover:scale-[1.35] motion-reduce:animate-none",
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
