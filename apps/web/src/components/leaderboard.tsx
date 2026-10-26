import Link from "next/link";
import { MAX_SCORE } from "@upsolve/core";
import { cn } from "@upsolve/ui";
import { formatDuration } from "@/lib/sessions-data";
import { BOARD_METRICS, rankBoard, type BoardMetric, type BoardRow } from "@/lib/social-data";

/** Metric tabs; `href` builds the link for a metric (keeps the page's other params). */
export function MetricTabs({
  metric,
  href,
}: {
  metric: BoardMetric;
  href: (m: BoardMetric) => string;
}) {
  return (
    <nav aria-label="Rank by" className="flex rounded-full border border-line bg-surface p-1">
      {BOARD_METRICS.map((m) => (
        <Link
          key={m.value}
          href={href(m.value)}
          scroll={false}
          aria-current={m.value === metric ? "page" : undefined}
          className={cn(
            "rounded-full px-3 py-1.5 text-[12.5px] whitespace-nowrap transition-colors duration-[var(--dur-base)]",
            m.value === metric ? "bg-ink text-bg" : "text-ink-2 hover:text-ink",
          )}
        >
          {m.label}
        </Link>
      ))}
    </nav>
  );
}

/** A ranked board. The viewer's own row is highlighted. */
export function Leaderboard({
  rows,
  metric,
  viewerId,
  empty,
}: {
  rows: BoardRow[];
  metric: BoardMetric;
  viewerId: string;
  empty: string;
}) {
  const ranked = rankBoard(rows, metric);
  if (ranked.length === 0) return <p className="text-[13px] text-ink-2">{empty}</p>;
  const top = Math.max(1, ...ranked.map((r) => value(r, metric)));

  return (
    <ol className="flex flex-col">
      {ranked.map((r) => {
        const me = r.userId === viewerId;
        return (
          <li
            key={r.userId}
            className={cn(
              "grid grid-cols-[28px_1fr_auto] items-center gap-x-3 gap-y-1.5 border-t border-dashed border-line-2 px-2 py-2.5 first:border-t-0",
              me && "rounded-md border-transparent bg-surface-2",
            )}
          >
            <span
              className={cn(
                "num text-center text-[15px]",
                r.rank === 1 ? "rounded-[6px] bg-signal text-signal-ink" : "text-ink-3",
              )}
            >
              {r.rank}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[13.5px] font-medium">
                {r.name ?? r.handle ?? "Someone"}
                {me && <span className="ml-1.5 font-mono text-[10.5px] text-ink-3">you</span>}
              </span>
              <span className="block truncate font-mono text-[11px] text-ink-3">
                {r.activeDays}/7 days · {r.reviews} revised · {formatDuration(r.focusMs)} focus ·{" "}
                {r.solved} solved
              </span>
            </span>
            <span className="text-right">
              <span className="num text-[18px]">{label(r, metric)}</span>
            </span>
            <span className="hatch relative col-span-2 col-start-2 h-1 overflow-hidden rounded-full">
              <span
                className={cn(
                  "absolute inset-y-0 left-0 rounded-full",
                  me ? "bg-primary" : "bg-ink",
                )}
                style={{ width: `${Math.max(2, (value(r, metric) / top) * 100)}%` }}
              />
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function value(r: BoardRow, metric: BoardMetric) {
  return metric === "consistency" ? r.score : metric === "solved" ? r.solved : (r.rating ?? 0);
}

function label(r: BoardRow, metric: BoardMetric) {
  return metric === "consistency"
    ? `${r.score}`
    : metric === "solved"
      ? `${r.solved}`
      : `${r.rating ?? "—"}`;
}

/** How the consistency score is made, so it never feels arbitrary. */
export function ScoreExplainer() {
  return (
    <p className="text-[12.5px] leading-relaxed text-ink-3">
      <span className="text-ink-2">Consistency</span> (out of {MAX_SCORE}) resets every Monday: 10
      per active day, 2 per revision (up to 15), 3 per focus hour (up to 10) and 1 per problem
      solved (up to 20). Showing up daily beats a one-night grind.
    </p>
  );
}
