import { INTERVAL_DAYS, type ReviewLogEntry, type TopicMastery } from "@upsolve/core";
import { Tag, cn } from "@upsolve/ui";
import { formatDuration } from "@/lib/sessions-data";

const DAY_MS = 86_400_000;

/** Problem link that opens the extension's timer in review mode. */
export function reviewUrl(url: string): string {
  const u = new URL(url);
  u.searchParams.set("upsolve", "review");
  return u.toString();
}

/** Where a problem sits on the 1 → 3 → 7 → 16 → 35 → 90 day ladder. */
export function StepLadder({ step, className }: { step: number; className?: string }) {
  return (
    <span
      role="img"
      aria-label={`Review interval ${INTERVAL_DAYS[step]} days (step ${step + 1} of ${INTERVAL_DAYS.length})`}
      title={`Every ${INTERVAL_DAYS[step]} days`}
      className={cn("inline-flex gap-[3px]", className)}
    >
      {INTERVAL_DAYS.map((d, i) => (
        <span
          key={d}
          className={cn(
            "size-[7px] rounded-[2px]",
            i <= step ? "bg-ink" : "hatch border border-line-2",
          )}
        />
      ))}
    </span>
  );
}

const RESULT: Record<ReviewLogEntry["result"], { label: string; tone: "ac" | "tle" | "wa" }> = {
  pass: { label: "pass", tone: "ac" },
  slow: { label: "slow", tone: "tle" },
  hint: { label: "hint", tone: "tle" },
  fail: { label: "reset", tone: "wa" },
};

export function ResultTag({
  entry,
}: {
  entry: Pick<ReviewLogEntry, "result" | "proven" | "manual">;
}) {
  const r = RESULT[entry.result];
  return (
    <span className="inline-flex items-center gap-1.5">
      <Tag tone={r.tone} mono>
        {r.label}
      </Tag>
      <span className="font-mono text-[10.5px] text-ink-3">
        {entry.proven ? "re-solved" : entry.manual ? "self-graded" : "synced"}
      </span>
    </span>
  );
}

/** "due today", "3d overdue", "in 5d". */
export function dueLabel(dueAt: number, now: number, endOfToday: number): string {
  if (dueAt > endOfToday) return `in ${Math.ceil((dueAt - now) / DAY_MS)}d`;
  const overdue = Math.floor((now - dueAt) / DAY_MS);
  return overdue >= 1 ? `${overdue}d overdue` : "due today";
}

/** Topic mastery bars; the weakest topic is marked (DESIGN.md §8). */
export function MasteryBars({
  topics,
  showInputs = true,
  weakestTopic,
}: {
  topics: TopicMastery[];
  showInputs?: boolean;
  /** Marks this topic as weakest; defaults to the lowest score in `topics`. */
  weakestTopic?: string | null;
}) {
  if (topics.length === 0) {
    return (
      <p className="text-[13px] text-ink-2">
        Mastery shows up once you&apos;ve solved a few problems.
      </p>
    );
  }
  const weakest =
    weakestTopic !== undefined
      ? weakestTopic
      : topics.length > 1
        ? topics.reduce((a, b) => (b.score < a.score ? b : a)).topic
        : null;
  return (
    <ul>
      {topics.map((t) => {
        const weak = t.topic === weakest;
        const inputs = [
          `${t.solved} solved`,
          t.soloRate !== null ? `${Math.round(t.soloRate * 100)}% solo` : null,
          t.medianMs ? `${formatDuration(t.medianMs)} median` : null,
        ].filter(Boolean);
        return (
          <li
            key={t.topic}
            className="grid grid-cols-[1fr_auto] gap-x-2.5 gap-y-1.5 border-t border-dashed border-line-2 py-2 first:border-t-0 first:pt-0"
            title={`${t.points} of ${t.target} points`}
          >
            <span className="flex min-w-0 items-center gap-2 text-[13px]">
              <span className="truncate">{t.label}</span>
              {weak && (
                <span className="font-mono text-[10px] tracking-[.08em] text-ember uppercase">
                  weakest
                </span>
              )}
            </span>
            <span className={cn("font-mono text-xs", weak && "text-ember")}>{t.score}</span>
            <span className="hatch relative col-span-2 h-1.5 overflow-hidden rounded-full">
              <span
                className={cn(
                  "absolute inset-y-0 left-0 rounded-full",
                  weak ? "bg-ember" : "bg-ink",
                )}
                style={{ width: `${Math.max(2, t.score)}%` }}
              />
            </span>
            {showInputs && (
              <span className="col-span-2 font-mono text-[10.5px] text-ink-3">
                {inputs.join(" · ")}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Reviews coming due over the next 14 days. */
export function UpcomingStrip({ upcoming, now }: { upcoming: number[]; now: number }) {
  const max = Math.max(1, ...upcoming);
  return (
    <div>
      <div
        className="grid h-[110px] grid-cols-14 items-end gap-1"
        role="img"
        aria-label={`Reviews due in the next 14 days: ${upcoming.join(", ")}`}
      >
        {upcoming.map((n, i) => {
          const day = new Date(now + (i + 1) * DAY_MS).toLocaleDateString("en-IN", {
            weekday: "short",
            day: "numeric",
            month: "short",
          });
          return (
            <div key={i} className="flex h-full flex-col justify-end" title={`${day}: ${n} due`}>
              <div className="hatch relative h-full w-full overflow-hidden rounded-[4px]">
                {n > 0 && (
                  <div
                    className="absolute inset-x-0 bottom-0 rounded-[4px] bg-ink"
                    style={{ height: `${(n / max) * 100}%` }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between font-mono text-[10.5px] text-ink-3">
        <span>tomorrow</span>
        <span>+14 days</span>
      </div>
    </div>
  );
}
