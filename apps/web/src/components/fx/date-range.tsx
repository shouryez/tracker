"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { cn, inputClasses } from "@upsolve/ui";

/* Dates are plain "YYYY-MM-DD" strings, handled at UTC noon so timezones never shift a day. */
const toDate = (s: string) => new Date(`${s}T12:00:00Z`);
const toKey = (d: Date) => d.toISOString().slice(0, 10);

const diffDays = (a: string, b: string) =>
  Math.round((toDate(b).getTime() - toDate(a).getTime()) / 864e5);
const fmt = (s: string) =>
  toDate(s).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });

const WEEK = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

/**
 * Calendar popover for a date range: past days disabled, the range highlighted, and days
 * beyond `maxDays` from the start greyed out so the limit is visible before you hit it.
 */
export function DateRangePicker({
  start,
  end,
  onChange,
  min,
  maxDays = 14,
  label = "Choose dates",
}: {
  start: string;
  end: string;
  onChange: (start: string, end: string) => void;
  /** Earliest selectable day (YYYY-MM-DD). */
  min: string;
  maxDays?: number;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => (start || min).slice(0, 7));
  const [hover, setHover] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const first = toDate(`${month}-01`);
  const lead = (first.getUTCDay() + 6) % 7;
  const daysIn = new Date(
    Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const cells: (string | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysIn }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`),
  ];
  const shift = (n: number) => {
    const d = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + n, 1));
    setMonth(toKey(d).slice(0, 7));
  };

  const picking = start && !end;
  const rangeEnd = end || (picking ? hover : null);

  function pick(day: string) {
    if (!start || end) return onChange(day, "");
    if (day < start) return onChange(day, "");
    onChange(start, day);
    setOpen(false);
  }

  const summary =
    start && end
      ? `${fmt(start)} – ${fmt(end)} · ${diffDays(start, end) + 1} days`
      : start
        ? `${fmt(start)} – pick an end date`
        : label;

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(inputClasses({ icon: true }), "relative min-w-[250px] text-left")}
      >
        <CalendarDays
          size={16}
          aria-hidden="true"
          className="absolute top-1/2 left-3 -translate-y-1/2 text-ink-3"
        />
        <span className={cn("tnum", !start && "text-ink-4")}>{summary}</span>
      </button>
      {open && (
        <div
          role="dialog"
          aria-label={label}
          className="glass absolute top-full left-0 z-50 mt-1.5 w-[300px] origin-top-left animate-[pop-open_var(--dur-base)_var(--ease-spring)] rounded-[16px] border border-line-2 p-3 shadow-e3"
        >
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => shift(-1)}
              disabled={month <= min.slice(0, 7)}
              aria-label="Previous month"
              className="grid size-8 place-items-center rounded-full text-ink-2 hover:bg-surface-3 disabled:opacity-30"
            >
              <ChevronLeft size={16} aria-hidden="true" />
            </button>
            <span className="text-13 font-[600]">
              {first.toLocaleDateString("en-IN", {
                month: "long",
                year: "numeric",
                timeZone: "UTC",
              })}
            </span>
            <button
              type="button"
              onClick={() => shift(1)}
              aria-label="Next month"
              className="grid size-8 place-items-center rounded-full text-ink-2 hover:bg-surface-3"
            >
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-y-1 text-center">
            {WEEK.map((w) => (
              <span key={w} className="pb-1 font-mono text-[10px] text-ink-3">
                {w}
              </span>
            ))}
            {cells.map((day, i) => {
              if (!day) return <span key={`e${i}`} />;
              const past = day < min;
              const tooFar = picking && day >= start && diffDays(start, day) >= maxDays;
              const disabled = past || !!tooFar;
              const isEdge = day === start || day === rangeEnd;
              const inRange = start && rangeEnd && day > start && day < rangeEnd;
              return (
                <button
                  key={day}
                  type="button"
                  disabled={disabled}
                  onClick={() => pick(day)}
                  onPointerEnter={() => setHover(day)}
                  aria-pressed={isEdge || undefined}
                  aria-label={fmt(day)}
                  className={cn(
                    "tnum h-8 text-12 transition-colors",
                    inRange && "bg-violet-soft text-ink",
                    day === start && rangeEnd && rangeEnd > start && "rounded-l-full",
                    day === rangeEnd && "rounded-r-full",
                    isEdge
                      ? "rounded-full bg-signal font-[600] text-signal-ink shadow-[0_0_12px_-3px_var(--signal)]"
                      : !inRange && "rounded-full hover:bg-surface-3",
                    day === min && !isEdge && "ring-1 ring-line-3 ring-inset",
                    disabled &&
                      "cursor-not-allowed text-ink-4 line-through decoration-ink-4/40 hover:bg-transparent",
                  )}
                >
                  {Number(day.slice(8))}
                </button>
              );
            })}
          </div>
          <p className="mt-2 border-t border-line pt-2 text-11 text-ink-3">
            {picking
              ? `Pick an end date, up to ${maxDays} days.`
              : `Up to ${maxDays} days per freeze.`}
          </p>
        </div>
      )}
    </div>
  );
}
