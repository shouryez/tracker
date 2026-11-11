"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type PointerEvent } from "react";
import { cn } from "@upsolve/ui";

export type Day = { date: string; ac: number; wa: number; other: number };

/* One hovered day shared by every chart on the page (FRONTEND-PLAN §8 Insights 1). */
let hovered: string | null = null;
const subs = new Set<() => void>();
const setHovered = (d: string | null) => {
  if (d === hovered) return;
  hovered = d;
  subs.forEach((f) => f());
};
const useHovered = () =>
  useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => hovered,
    () => null,
  );

/** Bars draw themselves in once per tab session, not on every visit. */
function useDrawOnce(key: string) {
  const [draw, setDraw] = useState(false);
  useEffect(() => {
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      return;
    }
    const t = window.setTimeout(() => setDraw(true), 0);
    return () => clearTimeout(t);
  }, [key]);
  return draw;
}

const fmt = (d: string, o: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString("en-GB", { ...o, timeZone: "UTC" });

/**
 * Submissions per day, scrubbable: hover, drag or use the arrow keys, and a crosshair with a
 * frosted readout follows; the same day lights up in the week comparison below.
 */
export function DailyChart({ days }: { days: Day[] }) {
  const max = Math.max(3, ...days.map((d) => d.ac + d.wa + d.other));
  const box = useRef<HTMLDivElement>(null);
  const h = useHovered();
  const draw = useDrawOnce("dsakaro:drawn:daily");
  const idx = h ? days.findIndex((d) => d.date === h) : -1;
  const pick = (e: PointerEvent<HTMLDivElement>) => {
    const r = box.current!.getBoundingClientRect();
    const i = Math.min(
      days.length - 1,
      Math.max(0, Math.floor(((e.clientX - r.left) / r.width) * days.length)),
    );
    setHovered(days[i]!.date);
  };
  const d = idx >= 0 ? days[idx]! : null;
  return (
    <div>
      <div className="grid grid-cols-[24px_minmax(0,1fr)] gap-2">
        <div className="flex h-40 flex-col justify-between text-right font-mono text-11 text-ink-3">
          <span>{max}</span>
          <span>{Math.round(max / 2)}</span>
          <span>0</span>
        </div>
        <div
          ref={box}
          tabIndex={0}
          role="group"
          aria-label="Submissions per day. Use the arrow keys to read each day."
          data-cursor="crosshair"
          onPointerMove={pick}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            pick(e);
          }}
          onPointerLeave={(e) => {
            if (!e.currentTarget.hasPointerCapture(e.pointerId)) setHovered(null);
          }}
          onBlur={() => setHovered(null)}
          onKeyDown={(e) => {
            if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
            e.preventDefault();
            const at = idx < 0 ? days.length - 1 : idx + (e.key === "ArrowLeft" ? -1 : 1);
            setHovered(days[Math.min(days.length - 1, Math.max(0, at))]!.date);
          }}
          className="relative flex h-40 touch-pan-y items-end gap-1 rounded-[4px] border-b border-line-2 bg-[linear-gradient(var(--line)_1px,transparent_1px)] bg-[length:100%_50%] outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-mark)]"
        >
          {days.map((day, i) => (
            <div
              key={day.date}
              className={cn(
                "flex h-full flex-1 origin-bottom flex-col-reverse gap-0.5 transition-opacity duration-150",
                draw && "animate-[grow-y_700ms_var(--ease-out)_backwards]",
                idx >= 0 && idx !== i && "opacity-45",
              )}
              style={draw ? { animationDelay: `${i * 15}ms` } : undefined}
            >
              {day.ac > 0 && (
                <span
                  className="rounded-[2px] bg-signal"
                  style={{ height: `${(day.ac / max) * 100}%` }}
                />
              )}
              {day.wa > 0 && (
                <span
                  className="rounded-[2px] bg-[var(--rose)]"
                  style={{ height: `${(day.wa / max) * 100}%` }}
                />
              )}
              {day.other > 0 && (
                <span
                  className="rounded-[2px] bg-line-3"
                  style={{ height: `${(day.other / max) * 100}%` }}
                />
              )}
            </div>
          ))}
          {d && (
            <>
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 w-px bg-ink-3"
                style={{ left: `${((idx + 0.5) / days.length) * 100}%` }}
              />
              <span
                role="status"
                className="glass-overlay pointer-events-none absolute -top-2 rounded-[12px] px-3 py-2 text-12"
                style={{
                  left: `clamp(0px, calc(${((idx + 0.5) / days.length) * 100}% - 80px), calc(100% - 170px))`,
                }}
              >
                <span className="block font-[650]">
                  {fmt(d.date, { weekday: "short", day: "numeric", month: "short" })}
                </span>
                <span className="tnum text-ink-2">
                  <span className="text-signal-text">{d.ac} accepted</span> · {d.wa} wrong ·{" "}
                  {d.other} other
                </span>
              </span>
            </>
          )}
        </div>
      </div>
      <div className="mt-2 flex justify-between pl-8 font-mono text-11 text-ink-3">
        {[0, 7, 14, 21, days.length - 1].map((i) =>
          days[i] ? (
            <span key={i}>{i === days.length - 1 ? "Today" : fmt(days[i]!.date)}</span>
          ) : null,
        )}
      </div>
    </div>
  );
}

/**
 * This week against last (FRONTEND-PLAN §8 Insights 2): last week's bars sit behind this
 * week's. Drag the handle (or use the arrow keys) to wipe between them; the totals and the
 * hovered day stay in sync with the daily chart.
 */
export function WeekCompare({ days }: { days: Day[] }) {
  const last14 = days.slice(-14);
  const prev = last14.slice(0, 7);
  const cur = last14.slice(7);
  const total = (w: Day[]) => w.reduce((n, d) => n + d.ac, 0);
  const max = Math.max(2, ...last14.map((d) => d.ac));
  const [split, setSplit] = useState(0.5);
  const box = useRef<HTMLDivElement>(null);
  const h = useHovered();
  const draw = useDrawOnce("dsakaro:drawn:week");
  const set = (clientX: number) => {
    const r = box.current!.getBoundingClientRect();
    setSplit(Math.min(1, Math.max(0, (clientX - r.left) / r.width)));
  };
  const diff = total(cur) - total(prev);
  const bars = (w: Day[], ghost: boolean) => (
    <div className="absolute inset-0 flex items-end gap-2 px-1">
      {w.map((d, i) => (
        <div key={d.date} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
          <span
            className={cn(
              "w-full origin-bottom rounded-[6px] transition-[box-shadow] duration-150",
              ghost
                ? "border border-dashed border-ink-3/60 bg-[color-mix(in_srgb,var(--ink)_6%,transparent)]"
                : "bg-[linear-gradient(180deg,var(--signal),color-mix(in_srgb,var(--signal)_55%,transparent))]",
              draw && "animate-[grow-y_700ms_var(--ease-out)_backwards]",
              !ghost && h === d.date && "shadow-[0_0_0_2px_var(--signal-mark)]",
            )}
            style={{
              height: `${Math.max(3, (d.ac / max) * 100)}%`,
              animationDelay: draw ? `${i * 40}ms` : undefined,
            }}
          />
        </div>
      ))}
    </div>
  );
  return (
    <div className="flex flex-col gap-3">
      <p className="text-13 text-ink-2">
        <span className="tnum font-display text-[28px] font-[650] text-ink">{total(cur)}</span>{" "}
        accepted this week
        <span className={cn("tnum ml-2 font-[600]", diff >= 0 ? "text-signal-text" : "text-bad")}>
          {diff >= 0 ? "+" : ""}
          {diff} vs last week
        </span>
      </p>
      <div
        ref={box}
        role="slider"
        tabIndex={0}
        aria-label="Compare this week with last week"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(split * 100)}
        aria-valuetext={`${total(cur)} this week, ${total(prev)} last week`}
        data-cursor="grab"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          set(e.clientX);
        }}
        onPointerMove={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) set(e.clientX);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") setSplit((s) => Math.max(0, s - 0.1));
          else if (e.key === "ArrowRight") setSplit((s) => Math.min(1, s + 0.1));
          else return;
          e.preventDefault();
        }}
        className="relative h-40 cursor-ew-resize touch-pan-y select-none rounded-[14px] bg-[color-mix(in_srgb,var(--ink)_3%,transparent)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-mark)]"
      >
        {/* Last week everywhere; this week revealed right of the handle. */}
        {bars(prev, true)}
        <div className="absolute inset-0" style={{ clipPath: `inset(0 0 0 ${split * 100}%)` }}>
          {bars(cur, false)}
        </div>
        <span
          aria-hidden="true"
          className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-[var(--signal-mark)]"
          style={{ left: `${split * 100}%` }}
        >
          <span className="absolute top-1/2 left-1/2 grid size-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[var(--signal-mark)] text-[11px] font-[700] text-signal-ink shadow-e2">
            ⇆
          </span>
        </span>
        <span className="pointer-events-none absolute top-2 left-3 text-11 font-[600] text-ink-3">
          Last week
        </span>
        <span className="pointer-events-none absolute top-2 right-3 text-11 font-[600] text-signal-text">
          This week
        </span>
      </div>
      <div className="flex gap-2 px-1 font-mono text-11 text-ink-3">
        {cur.map((d) => (
          <span
            key={d.date}
            className={cn("flex-1 text-center", h === d.date && "font-[700] text-ink")}
          >
            {fmt(d.date, { weekday: "narrow" })}
          </span>
        ))}
      </div>
    </div>
  );
}
