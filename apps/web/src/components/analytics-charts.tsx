import type { ReactNode } from "react";
import { cn } from "@upsolve/ui";
import type { Analytics } from "@/lib/analytics-data";
import { formatDuration } from "@/lib/sessions-data";

/** Small hover label above a mark (the mark's parent needs `group relative`). */
function Tip({ children }: { children: ReactNode }) {
  return (
    <span
      role="tooltip"
      className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2 rounded-[6px] border border-line bg-surface px-2 py-1 font-mono text-[10.5px] whitespace-nowrap text-ink opacity-0 shadow-card transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
    >
      {children}
    </span>
  );
}

/** Accepted submissions per hour of the day; the busiest hour in indigo. */
export function HourBars({ byHour }: { byHour: number[] }) {
  const max = Math.max(1, ...byHour);
  const peak = byHour.indexOf(Math.max(...byHour));
  const label = (h: number) => `${String(h).padStart(2, "0")}:00`;
  return (
    <div>
      <div className="grid h-[150px] grid-cols-24 items-end gap-[3px]">
        {byHour.map((n, h) => (
          <div
            key={h}
            tabIndex={0}
            aria-label={`${label(h)}: ${n} accepted`}
            className="group relative flex h-full flex-col justify-end outline-none"
          >
            <Tip>
              {label(h)} · {n} AC
            </Tip>
            <div
              className={cn(
                "w-full rounded-t-[4px] rounded-b-[2px] transition-opacity group-hover:opacity-80",
                n === 0 ? "hatch h-1" : h === peak ? "bg-primary" : "bg-ink",
              )}
              style={n === 0 ? undefined : { height: `${Math.max(4, (n / max) * 100)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-4 font-mono text-[10.5px] text-ink-3">
        <span>00:00</span>
        <span>06:00</span>
        <span>12:00</span>
        <span>18:00</span>
      </div>
    </div>
  );
}

const VERDICT: Record<string, { label: string; cls: string }> = {
  AC: { label: "Accepted", cls: "bg-ok" },
  WA: { label: "Wrong answer", cls: "bg-bad" },
  TLE: { label: "Time limit", cls: "bg-warn" },
  MLE: { label: "Memory limit", cls: "bg-medium" },
  RE: { label: "Runtime error", cls: "bg-hard" },
  CE: { label: "Compile error", cls: "bg-ink-3" },
  OTHER: { label: "Other", cls: "hatch border border-line-2" },
};

/** Share of each verdict as one split bar, with a labelled legend. */
export function VerdictMix({ verdicts }: { verdicts: Analytics["verdicts"] }) {
  const total = verdicts.reduce((n, v) => n + v.n, 0);
  if (total === 0) return <p className="text-[13px] text-ink-2">No submissions in this range.</p>;
  return (
    <div>
      <div
        className="flex h-3 gap-[2px] overflow-hidden rounded-full"
        role="img"
        aria-label={verdicts
          .map((v) => `${VERDICT[v.verdict]?.label ?? v.verdict} ${v.n}`)
          .join(", ")}
      >
        {verdicts.map((v) => (
          <span
            key={v.verdict}
            className={cn("rounded-[3px]", VERDICT[v.verdict]?.cls ?? "bg-ink-3")}
            style={{ flex: v.n }}
            title={`${VERDICT[v.verdict]?.label ?? v.verdict}: ${v.n}`}
          />
        ))}
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12.5px]">
        {verdicts.map((v) => (
          <li key={v.verdict} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className={cn("size-2 rounded-[2px]", VERDICT[v.verdict]?.cls ?? "bg-ink-3")}
            />
            <span className="flex-1 text-ink-2">{VERDICT[v.verdict]?.label ?? v.verdict}</span>
            <span className="font-mono text-[11.5px]">
              {v.n} <span className="text-ink-3">· {Math.round((v.n / total) * 100)}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const DIFF_CLS = {
  easy: "bg-easy",
  medium: "bg-medium",
  hard: "bg-hard",
  unrated: "bg-ink-3",
} as const;

/** Focus time per difficulty, with how many were solved and the median solve time. */
export function DifficultyTime({ rows }: { rows: Analytics["byDifficulty"] }) {
  if (rows.length === 0)
    return <p className="text-[13px] text-ink-2">No timed sessions in this range.</p>;
  const max = Math.max(1, ...rows.map((r) => r.activeMs));
  return (
    <ul>
      {rows.map((r) => (
        <li
          key={r.difficulty}
          className="grid grid-cols-[1fr_auto] gap-x-2.5 gap-y-1.5 border-t border-dashed border-line-2 py-2.5 first:border-t-0 first:pt-0"
        >
          <span className="text-[13px] capitalize">{r.difficulty}</span>
          <span className="font-mono text-xs">{formatDuration(r.activeMs)}</span>
          <span className="hatch relative col-span-2 h-1.5 overflow-hidden rounded-full">
            <span
              className={cn("absolute inset-y-0 left-0 rounded-full", DIFF_CLS[r.difficulty])}
              style={{ width: `${Math.max(2, (r.activeMs / max) * 100)}%` }}
            />
          </span>
          <span className="col-span-2 font-mono text-[10.5px] text-ink-3">
            {r.solved} solved{r.medianMs ? ` · median solve ${formatDuration(r.medianMs)}` : ""}
          </span>
        </li>
      ))}
    </ul>
  );
}
