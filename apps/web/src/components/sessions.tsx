import { DifficultyTag, Tag, cn } from "@upsolve/ui";
import { formatDuration, type SessionRow, type SessionStats } from "@/lib/sessions-data";
import { TimeAgo } from "./time-ago";

const INDEPENDENCE: Record<NonNullable<SessionRow["independence"]>, string> = {
  solo: "solo",
  hint: "hint",
  solution: "saw solution",
};

/** One extension-tracked session as a list row. */
export function SessionItem({ s }: { s: SessionRow }) {
  return (
    <li className="flex items-center gap-3 border-t border-dashed border-line-2 py-2.5 first:border-t-0 first:pt-0">
      <span className="min-w-0 flex-1">
        <a
          href={s.url}
          target="_blank"
          rel="noreferrer"
          className="block truncate text-[13.5px] font-medium hover:underline"
        >
          {s.title}
        </a>
        <span className="font-mono text-[11px] text-ink-3">
          {formatDuration(s.activeMs)} active · {s.submits} submit{s.submits === 1 ? "" : "s"} ·{" "}
          <TimeAgo date={s.startedAt} />
          {s.note ? ` · “${s.note}”` : ""}
        </span>
      </span>
      {s.independence && <Tag mono>{INDEPENDENCE[s.independence]}</Tag>}
      {s.outcome === "solved" ? (
        <Tag tone="ac" mono>
          solved
        </Tag>
      ) : s.outcome === "abandoned" ? (
        <Tag mono>left</Tag>
      ) : (
        <Tag tone="tle" mono>
          open
        </Tag>
      )}
      {s.difficulty && <DifficultyTag difficulty={s.difficulty} />}
    </li>
  );
}

/** Capsule bars per day on hatched goal tracks; today in indigo (DESIGN.md §8). */
export function FocusBars({ stats, goalMin }: { stats: SessionStats; goalMin: number }) {
  const goalMs = goalMin * 60_000;
  const cap = Math.max(goalMs * 1.33, ...stats.focusByDay.map((d) => d.activeMs));
  const weekday = (day: string) =>
    new Date(`${day}T12:00:00Z`).toLocaleDateString("en-IN", { weekday: "short", timeZone: "UTC" });

  return (
    <div
      className="grid h-[170px] grid-cols-7 items-end gap-2.5"
      role="img"
      aria-label="Focus time per day this week"
    >
      {stats.focusByDay.map((d, i) => {
        const today = i === stats.focusByDay.length - 1;
        const met = d.activeMs >= goalMs;
        return (
          <div
            key={d.day}
            className="flex h-full flex-col items-center justify-end gap-2"
            title={`${weekday(d.day)}: ${formatDuration(d.activeMs)}`}
          >
            <div
              className={cn(
                "hatch relative h-[140px] w-full max-w-10 overflow-hidden rounded-full",
              )}
            >
              <div
                className={cn(
                  "absolute inset-x-0 bottom-0 rounded-full",
                  today ? "bg-primary" : met ? "bg-ink" : "bg-surface-3",
                )}
                style={{ height: `${Math.min(100, (d.activeMs / cap) * 100)}%` }}
              />
              {today && d.activeMs > 0 && (
                <span className="absolute top-1 left-1/2 -translate-x-1/2 rounded-full bg-signal px-1.5 py-0.5 font-mono text-[10px] whitespace-nowrap text-signal-ink">
                  {formatDuration(d.activeMs)}
                </span>
              )}
            </div>
            <span className={cn("font-mono text-[10.5px]", today ? "text-ink" : "text-ink-3")}>
              {weekday(d.day)[0]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Solo / hint / saw-solution split (DESIGN.md §8 "honest count"). Hatched = saw solution. */
export function HonestSplit({
  solo,
  hint,
  solution,
  className,
}: {
  solo: number;
  hint: number;
  solution: number;
  className?: string;
}) {
  const total = solo + hint + solution;
  const parts = [
    { key: "solo", n: solo, cls: "bg-ink" },
    { key: "hint", n: hint, cls: "bg-ink-3" },
    { key: "solution", n: solution, cls: "hatch border border-line-2" },
  ].filter((p) => p.n > 0);
  return (
    <div className={className}>
      <div
        className="flex h-2.5 gap-[3px] overflow-hidden rounded-full"
        role="img"
        aria-label={`${solo} solo, ${hint} with a hint, ${solution} after seeing the solution`}
      >
        {total === 0 ? (
          <span className="hatch flex-1 rounded-full" />
        ) : (
          parts.map((p) => (
            <span key={p.key} className={cn("rounded-[3px]", p.cls)} style={{ flex: p.n }} />
          ))
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11px] text-ink-3">
        <span>
          <span className="text-ink">{solo}</span> solo
        </span>
        <span>
          <span className="text-ink">{hint}</span> hint
        </span>
        <span>
          <span className="text-ink">{solution}</span> saw solution
        </span>
      </div>
    </div>
  );
}
