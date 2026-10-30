import { INTERVAL_DAYS, type ReviewLogEntry, type TopicMastery } from "@upsolve/core";
import { StrengthLadder, Tag, WeakestChip, cn } from "@upsolve/ui";
import { formatDuration } from "@/lib/sessions-data";

const DAY_MS = 86_400_000;

/** Problem link that opens the extension's timer in review mode. */
export function reviewUrl(url: string): string {
  const u = new URL(url);
  u.searchParams.set("upsolve", "review");
  return u.toString();
}

/** Where a problem sits on the 1 → 3 → 7 → 16 → 35 → 90 day ladder. */
export function StepLadder({
  step,
  overdue,
  className,
}: {
  step: number;
  overdue?: boolean;
  className?: string;
}) {
  return (
    <StrengthLadder
      stage={step + 1}
      overdue={overdue}
      compact
      dueLabel={`every ${INTERVAL_DAYS[step]} days`}
      className={className}
    />
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

/** Mastery tier colour: rose < 25 ≤ amber < 60 ≤ teal. */
export function masteryColor(score: number) {
  return score < 25 ? "var(--hard)" : score < 60 ? "var(--medium)" : "var(--easy)";
}

/** Topic mastery bars, coloured by tier; the weakest topic is flagged. */
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
      <p className="text-13 text-ink-2">Mastery shows up once you&apos;ve solved a few problems.</p>
    );
  }
  const weakest =
    weakestTopic !== undefined
      ? weakestTopic
      : topics.length > 1
        ? topics.reduce((a, b) => (b.score < a.score ? b : a)).topic
        : null;
  return (
    <ul className="flex flex-col gap-2.5">
      {topics.map((t, i) => {
        const weak = t.topic === weakest;
        const color = masteryColor(t.score);
        const inputs = [
          `${t.solved} solved`,
          t.soloRate !== null ? `${Math.round(t.soloRate * 100)}% solo` : null,
          t.medianMs ? `${formatDuration(t.medianMs)} median` : null,
        ].filter(Boolean);
        return (
          <li key={t.topic} title={`${t.points} of ${t.target} points`}>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-2 text-13">
                <span className="truncate">{t.label}</span>
                {weak && <WeakestChip />}
              </span>
              <span className="tnum font-mono text-12" style={{ color }}>
                {t.score}
              </span>
            </div>
            <span className="relative block h-2 rounded-full bg-surface-3">
              <span
                className="absolute inset-y-0 left-0 origin-left animate-[grow-x_900ms_var(--ease-out)_backwards] rounded-full"
                style={{
                  width: `${Math.max(2, t.score)}%`,
                  background: `linear-gradient(90deg, color-mix(in srgb, ${color} 45%, transparent), ${color})`,
                  animationDelay: `${i * 60}ms`,
                }}
              />
            </span>
            {showInputs && (
              <span className="mt-1 block text-11 text-ink-3">{inputs.join(" · ")}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Reviews coming due over the next 14 days: a day strip with stacked dots (one per review,
 * capped at 6 with a +n), hover for the count. Planned days, so empty columns stay quiet.
 */
export function UpcomingStrip({ upcoming, now }: { upcoming: number[]; now: number }) {
  const total = upcoming.reduce((a, b) => a + b, 0);
  return (
    <div>
      <div
        className="grid grid-cols-7 gap-1.5 sm:grid-cols-14"
        role="img"
        aria-label={`Reviews due in the next 14 days: ${total} in total`}
      >
        {upcoming.map((n, i) => {
          const d = new Date(now + (i + 1) * DAY_MS);
          const label = d.toLocaleDateString("en-IN", {
            weekday: "short",
            day: "numeric",
            month: "short",
          });
          const shown = Math.min(n, 6);
          return (
            <div
              key={i}
              title={`${label}: ${n} due`}
              className={cn(
                "flex h-[112px] flex-col items-center justify-between rounded-[10px] border px-1 py-2 transition-colors",
                i === 0
                  ? "border-violet-line bg-violet-soft"
                  : "border-line bg-surface-inset hover:border-line-2",
              )}
            >
              <span className="flex flex-col-reverse items-center gap-[3px]">
                {Array.from({ length: shown }, (_, k) => (
                  <i
                    key={k}
                    className="size-[7px] animate-[fade-in-pop_400ms_var(--ease-out)_backwards] rounded-[2px] bg-violet shadow-[0_0_6px_-1px_var(--violet)]"
                    style={{ animationDelay: `${i * 30 + k * 40}ms` }}
                  />
                ))}
                {n > 6 && <span className="tnum font-mono text-[9.5px] text-violet">+{n - 6}</span>}
              </span>
              <span className="text-center leading-tight">
                <span className="tnum block text-12 font-[600] text-ink">{n || "·"}</span>
                <span className="block font-mono text-[9.5px] text-ink-3">
                  {i === 0 ? "tmrw" : d.toLocaleDateString("en-IN", { weekday: "narrow" })}
                  {i === 0 ? "" : d.getDate()}
                </span>
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-12 text-ink-3">
        <span className="tnum text-ink-2">{total}</span> reviews over the next two weeks
      </p>
    </div>
  );
}

// DsaKaro
