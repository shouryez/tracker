"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@upsolve/ui";
import { feel } from "@/lib/feel";

export type CalDay = {
  /** New problems solved that day (titles, up to 6). */
  solved: string[];
  solvedCount: number;
  /** Revisions graded that day. */
  revised: number;
  /** Future: revisions due that day (titles, up to 6). */
  due: string[];
  dueCount: number;
  contests: { name: string; time: string }[];
};

const WEEK = ["M", "T", "W", "T", "F", "S", "S"];
const iso = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

/**
 * Practice calendar (FEATURES-PLAN F3): the past (what you solved and revised) and the
 * future (revision load and contests) on one month grid. Click or arrow onto a day to read
 * it. Data comes ready from the server; this only lays it out.
 */
export function PracticeCalendar({
  days,
  today,
  minMonth,
  maxMonth,
}: {
  days: Record<string, CalDay>;
  /** Local YYYY-MM-DD. */
  today: string;
  /** YYYY-MM bounds for navigation. */
  minMonth: string;
  maxMonth: string;
}) {
  const [ym, setYm] = useState(today.slice(0, 7));
  const [picked, setPicked] = useState(today);
  const [y, m] = ym.split("-").map(Number) as [number, number];
  const cells = useMemo(() => {
    const first = new Date(Date.UTC(y, m - 1, 1));
    const lead = (first.getUTCDay() + 6) % 7; // Monday first
    const n = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return [
      ...Array.from({ length: lead }, () => null),
      ...Array.from({ length: n }, (_, i) => iso(y, m - 1, i + 1)),
    ];
  }, [y, m]);
  const maxSolved = Math.max(1, ...Object.values(days).map((d) => d.solvedCount + d.revised));
  const maxDue = Math.max(1, ...Object.values(days).map((d) => d.dueCount));
  const move = (delta: number) => {
    const d = new Date(Date.UTC(y, m - 1 + delta, 1));
    const next = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    if (next < minMonth || next > maxMonth) return;
    feel.tick();
    setYm(next);
  };
  const day = days[picked];
  const label = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <span className="font-display text-[18px] font-[650]">{label}</span>
          <span className="flex gap-1">
            <button
              type="button"
              aria-label="Previous month"
              disabled={ym <= minMonth}
              onClick={() => move(-1)}
              className="grid size-8 place-items-center rounded-full text-ink-2 hover:bg-surface-3 disabled:opacity-30"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              aria-label="Next month"
              disabled={ym >= maxMonth}
              onClick={() => move(1)}
              className="grid size-8 place-items-center rounded-full text-ink-2 hover:bg-surface-3 disabled:opacity-30"
            >
              <ChevronRight size={16} />
            </button>
          </span>
        </div>
        <div className="grid grid-cols-7 gap-1.5" role="grid" aria-label={`Practice in ${label}`}>
          {WEEK.map((w, i) => (
            <span
              key={i}
              className="pb-1 text-center text-11 font-[600] text-ink-4"
              role="columnheader"
            >
              {w}
            </span>
          ))}
          {cells.map((d, i) => {
            if (!d) return <span key={`x${i}`} />;
            const info = days[d];
            const past = d < today;
            const isToday = d === today;
            const act = info ? info.solvedCount + info.revised : 0;
            const heat = act ? 0.12 + 0.6 * (act / maxSolved) : 0;
            const load = info?.dueCount ? 0.1 + 0.45 * (info.dueCount / maxDue) : 0;
            return (
              <button
                key={d}
                type="button"
                role="gridcell"
                aria-selected={picked === d}
                aria-label={`${d}: ${act ? `${info!.solvedCount} new, ${info!.revised} revised` : ""}${info?.dueCount ? ` ${info.dueCount} due` : ""}${info?.contests.length ? `, ${info.contests.length} contest` : ""}`}
                onClick={() => {
                  setPicked(d);
                  feel.tick();
                }}
                className={cn(
                  "relative flex h-12 flex-col items-start justify-between rounded-[12px] p-1.5 text-left text-12 transition-[box-shadow,transform] duration-150 hover:-translate-y-px sm:h-14",
                  picked === d
                    ? "shadow-[inset_0_0_0_2px_var(--signal-mark)]"
                    : "shadow-[inset_0_0_0_1px_var(--line)]",
                  isToday && "ring-2 ring-primary ring-offset-2 ring-offset-[var(--surface)]",
                )}
                style={{
                  background:
                    past || isToday
                      ? heat
                        ? `color-mix(in srgb, var(--signal) ${Math.round(heat * 100)}%, transparent)`
                        : undefined
                      : load
                        ? `color-mix(in srgb, var(--amber) ${Math.round(load * 100)}%, transparent)`
                        : undefined,
                }}
              >
                <span className={cn("tnum font-[600]", past && !act && "text-ink-4")}>
                  {Number(d.slice(8))}
                </span>
                <span className="flex w-full items-center justify-between gap-1">
                  {!past && info?.dueCount ? (
                    <span className="tnum text-[10px] font-[700] text-ink-2">{info.dueCount}</span>
                  ) : (
                    <span />
                  )}
                  {info?.contests.length ? (
                    <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-11 text-ink-3">
          <span className="flex items-center gap-1.5">
            <i className="size-2.5 rounded-[3px] bg-[color-mix(in_srgb,var(--signal)_55%,transparent)]" />{" "}
            solved and revised
          </span>
          <span className="flex items-center gap-1.5">
            <i className="size-2.5 rounded-[3px] bg-[color-mix(in_srgb,var(--amber)_45%,transparent)]" />{" "}
            revisions due
          </span>
          <span className="flex items-center gap-1.5">
            <i className="size-1.5 rounded-full bg-primary" /> contest
          </span>
        </p>
      </div>
      <aside
        className="surface-inset flex flex-col gap-3 self-start rounded-[18px] p-4"
        aria-live="polite"
      >
        <p className="font-display text-[16px] font-[650]">
          {new Date(`${picked}T12:00:00Z`).toLocaleDateString("en-GB", {
            weekday: "long",
            day: "numeric",
            month: "long",
            timeZone: "UTC",
          })}
          {picked === today && <span className="ml-2 text-12 font-[600] text-primary">today</span>}
        </p>
        {!day || (!day.solvedCount && !day.revised && !day.dueCount && !day.contests.length) ? (
          <p className="text-13 text-ink-3">
            {picked < today ? "A rest day." : "Nothing scheduled yet."}
          </p>
        ) : (
          <>
            {(day.solvedCount > 0 || day.revised > 0) && (
              <div>
                <p className="text-12 font-[600] text-signal-text">
                  {day.solvedCount} new · {day.revised} revised
                </p>
                <ul className="mt-1 flex flex-col gap-0.5 text-13">
                  {day.solved.map((t) => (
                    <li key={t} className="truncate">
                      {t}
                    </li>
                  ))}
                  {day.solvedCount > day.solved.length && (
                    <li className="text-ink-3">+{day.solvedCount - day.solved.length} more</li>
                  )}
                </ul>
              </div>
            )}
            {day.dueCount > 0 && (
              <div>
                <p className="text-12 font-[600] text-medium">{day.dueCount} due</p>
                <ul className="mt-1 flex flex-col gap-0.5 text-13">
                  {day.due.map((t) => (
                    <li key={t} className="truncate">
                      {t}
                    </li>
                  ))}
                  {day.dueCount > day.due.length && (
                    <li className="text-ink-3">+{day.dueCount - day.due.length} more</li>
                  )}
                </ul>
              </div>
            )}
            {day.contests.length > 0 && (
              <div>
                <p className="text-12 font-[600] text-primary">Contests</p>
                <ul className="mt-1 flex flex-col gap-0.5 text-13">
                  {day.contests.map((c) => (
                    <li key={c.name} className="flex justify-between gap-2">
                      <span className="truncate">{c.name}</span>
                      <span className="tnum shrink-0 text-ink-3">{c.time}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </aside>
    </div>
  );
}
