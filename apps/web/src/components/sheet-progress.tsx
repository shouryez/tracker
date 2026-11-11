"use client";

import { useEffect, useMemo, useState, useSyncExternalStore, type CSSProperties } from "react";
import { cn } from "@upsolve/ui";

export type StepCount = { name: string; done: number; total: number };

/** Ticks on a sheet broadcast this, so counts on the page update before the server does. */
export const SHEET_TICK = "dsakaro:sheet-tick";
export type SheetTick = { step: string; delta: 1 | -1 };

const short = (name: string) => name.replace(/^Step\s*\d+\s*[:·.-]?\s*/i, "");

/** Live per-step counts: the server's numbers plus ticks made on this page. */
export function useLiveSteps(initial: StepCount[]) {
  const [deltas, setDeltas] = useState<Record<string, number>>({});
  useEffect(() => {
    const on = (e: Event) => {
      const { step, delta } = (e as CustomEvent<SheetTick>).detail;
      setDeltas((d) => ({ ...d, [step]: (d[step] ?? 0) + delta }));
    };
    window.addEventListener(SHEET_TICK, on);
    return () => window.removeEventListener(SHEET_TICK, on);
  }, []);
  return useMemo(
    () =>
      initial.map((s) => ({
        ...s,
        done: Math.min(s.total, Math.max(0, s.done + (deltas[s.name] ?? 0))),
      })),
    [initial, deltas],
  );
}

/**
 * Floating progress strip (FRONTEND-PLAN §8 Sheets 4): once the sheet's header scrolls away,
 * a frosted strip shows the step you're reading and the whole sheet, and ticks fly into it.
 */
export function SheetProgressStrip({ steps, headId }: { steps: StepCount[]; headId: string }) {
  const live = useLiveSteps(steps);
  const [shown, setShown] = useState(false);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const head = document.getElementById(headId);
    if (!head) return;
    const io = new IntersectionObserver(([e]) => setShown(!!e && !e.isIntersecting), {
      rootMargin: "-40px 0px 0px 0px",
    });
    io.observe(head);
    // The step section nearest the top of the screen.
    const sections = Array.from(document.querySelectorAll<HTMLElement>("section[id^='step-']"));
    const so = new IntersectionObserver(
      (entries) => {
        const top = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (top) setCurrent(Number(top.target.id.slice(5)) - 1);
      },
      { rootMargin: "-20% 0px -60% 0px" },
    );
    sections.forEach((s) => so.observe(s));
    return () => {
      io.disconnect();
      so.disconnect();
    };
  }, [headId]);

  const done = live.reduce((n, s) => n + s.done, 0);
  const total = live.reduce((n, s) => n + s.total, 0);
  const st = live[current];
  const pct = total ? done / total : 0;
  return (
    <div
      aria-hidden={!shown}
      className={cn(
        "glass-chrome fixed bottom-[92px] left-1/2 z-30 flex w-[min(560px,calc(100vw-24px))] -translate-x-1/2 items-center gap-4 rounded-full py-2.5 pr-5 pl-4 lg:bottom-6",
        "transition-[opacity,translate] duration-[var(--dur-base)] ease-[var(--ease-out)]",
        shown ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0",
      )}
    >
      {st && (
        <span className="min-w-0 flex-1 truncate text-13">
          <span className="font-[600] text-ink">{short(st.name)}</span>{" "}
          <span className="tnum text-ink-3">
            {st.done}/{st.total}
          </span>
        </span>
      )}
      <span
        data-sheet-progress=""
        className="relative h-1.5 w-[38%] overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--ink)_10%,transparent)]"
        style={{ "--fly-x": pct } as CSSProperties}
      >
        <span
          className="absolute inset-y-0 left-0 rounded-full bg-[var(--signal-mark)] transition-[width] duration-500 ease-out"
          style={{ width: `${pct * 100}%` }}
        />
      </span>
      <span className="tnum shrink-0 text-13 font-[650]">{Math.round(pct * 100)}%</span>
    </div>
  );
}

/**
 * The sheet as a constellation (FRONTEND-PLAN §8 Sheets 2): each step is a cluster of stars,
 * one per problem, lit when solved. Hover a cluster for its name; click to jump to it.
 */
export function SheetConstellation({ steps }: { steps: StepCount[] }) {
  const live = useLiveSteps(steps);
  const [hover, setHover] = useState<number | null>(null);
  const cols = Math.min(5, Math.max(2, Math.ceil(Math.sqrt(live.length * 1.6))));
  const cell = 130;
  const rows = Math.ceil(live.length / cols);
  const W = cols * cell;
  const H = rows * cell + 16;
  const golden = Math.PI * (3 - Math.sqrt(5));
  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Sheet map: ${live.map((s) => `${short(s.name)} ${s.done} of ${s.total}`).join(", ")}`}
      >
        {/* Faint path through the steps in order */}
        <polyline
          points={live
            .map((_, i) => {
              const r = Math.floor(i / cols);
              const c = i % cols;
              return `${c * cell + cell / 2},${r * cell + cell / 2}`;
            })
            .join(" ")}
          fill="none"
          stroke="var(--ink)"
          strokeOpacity=".07"
          strokeWidth="1.5"
          strokeDasharray="3 6"
        />
        {live.map((s, i) => {
          const r = Math.floor(i / cols);
          const c = i % cols;
          const cx = c * cell + cell / 2;
          const cy = r * cell + cell / 2;
          const spread = Math.min(46, 7 * Math.sqrt(s.total));
          const full = s.total > 0 && s.done === s.total;
          return (
            <g
              key={s.name}
              tabIndex={0}
              role="link"
              aria-label={`${short(s.name)}: ${s.done} of ${s.total}. Go to this step.`}
              className="cursor-pointer outline-none"
              onPointerEnter={() => setHover(i)}
              onPointerLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              onClick={() => (window.location.hash = `step-${i + 1}`)}
              onKeyDown={(e) => {
                if (e.key === "Enter") window.location.hash = `step-${i + 1}`;
              }}
            >
              <circle
                cx={cx}
                cy={cy}
                r={spread + 14}
                fill={
                  hover === i ? "color-mix(in srgb, var(--signal) 8%, transparent)" : "transparent"
                }
                stroke={full ? "var(--signal)" : "transparent"}
                strokeOpacity=".35"
                className="transition-[fill] duration-200"
              />
              {Array.from({ length: s.total }, (_, k) => {
                const rr = spread * Math.sqrt((k + 0.5) / Math.max(1, s.total));
                const a = k * golden;
                const lit = k < s.done;
                return (
                  <circle
                    key={k}
                    cx={cx + rr * Math.cos(a)}
                    cy={cy + rr * Math.sin(a)}
                    r={lit ? 2.6 : 1.8}
                    fill={lit ? "var(--signal)" : "var(--ink)"}
                    opacity={lit ? 0.95 : 0.16}
                    style={
                      lit
                        ? {
                            filter:
                              "drop-shadow(0 0 3px color-mix(in srgb, var(--signal) 70%, transparent))",
                          }
                        : undefined
                    }
                  />
                );
              })}
              <text
                x={cx}
                y={cy + spread + 30}
                textAnchor="middle"
                fontSize="11"
                fill="var(--ink)"
                opacity={hover === i ? 0.95 : 0.5}
                className="font-[600]"
              >
                {String(i + 1).padStart(2, "0")} · {s.done}/{s.total}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="mt-2 min-h-5 text-center text-13 text-ink-2">
        {hover !== null && live[hover] ? (
          <>
            <span className="font-[600] text-ink">{short(live[hover]!.name)}</span> ·{" "}
            {live[hover]!.done} of {live[hover]!.total} solved · click to open
          </>
        ) : (
          "Each cluster is a step, each star a problem. Lit stars are solved."
        )}
      </p>
    </div>
  );
}

const MAP_KEY = "dsakaro:sheet-map";
const MAP_EVENT = "dsakaro:sheet-map";
const readMap = () => {
  try {
    return localStorage.getItem(MAP_KEY) === "1";
  } catch {
    return false;
  }
};
const subscribeMap = (cb: () => void) => {
  window.addEventListener(MAP_EVENT, cb);
  return () => window.removeEventListener(MAP_EVENT, cb);
};

/** The constellation in a card you can open or fold away (remembered per browser). */
export function SheetMapCard({ steps }: { steps: StepCount[] }) {
  const open = useSyncExternalStore(subscribeMap, readMap, () => false);
  const set = (v: boolean) => {
    try {
      localStorage.setItem(MAP_KEY, v ? "1" : "0");
    } catch {}
    window.dispatchEvent(new Event(MAP_EVENT));
  };
  return (
    <section className="surface-card rounded-[24px] p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[14.5px] font-[600]">Sheet map</h2>
          <p className="text-12 text-ink-3">The whole sheet at a glance, step by step.</p>
        </div>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => set(!open)}
          className="glass-control h-8 rounded-full px-3.5 text-12 font-[600] text-ink-2 hover:text-ink"
        >
          {open ? "Hide map" : "Show map"}
        </button>
      </div>
      {open && (
        <div className="mt-4 animate-[blur-in_480ms_var(--ease-out)]">
          <SheetConstellation steps={steps} />
        </div>
      )}
    </section>
  );
}
