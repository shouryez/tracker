import type { SolvedCounts } from "@upsolve/adapters";
import { cn } from "@upsolve/ui";

/** Easy / medium / hard share of solved problems as one split bar (DESIGN.md §8). */
export function SolvedSplit({ solved, className }: { solved: SolvedCounts; className?: string }) {
  const parts = [
    { key: "easy", n: solved.easy, cls: "bg-easy" },
    { key: "medium", n: solved.medium, cls: "bg-medium" },
    { key: "hard", n: solved.hard, cls: "bg-hard" },
    { key: "unrated", n: solved.unknown, cls: "hatch border border-line-2" },
  ].filter((p) => p.n > 0);

  return (
    <div className={className}>
      <div
        className="flex h-2.5 gap-[3px] overflow-hidden rounded-full"
        role="img"
        aria-label={`${solved.easy} easy, ${solved.medium} medium, ${solved.hard} hard${solved.unknown ? `, ${solved.unknown} unrated` : ""}`}
      >
        {parts.length === 0 ? (
          <span className="hatch flex-1 rounded-full" />
        ) : (
          parts.map((p) => (
            <span key={p.key} className={cn("rounded-[3px]", p.cls)} style={{ flex: p.n }} />
          ))
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11px] text-ink-3">
        <span>
          <span className="text-easy">{solved.easy}</span> easy
        </span>
        <span>
          <span className="text-medium">{solved.medium}</span> medium
        </span>
        <span>
          <span className="text-hard">{solved.hard}</span> hard
        </span>
        {solved.unknown > 0 && <span>{solved.unknown} unrated</span>}
      </div>
    </div>
  );
}

/** Tiny rating line. Points are oldest first. */
export function Sparkline({
  values,
  className,
  stroke = "var(--primary)",
}: {
  values: number[];
  className?: string;
  stroke?: string;
}) {
  const w = 96;
  const h = 28;
  if (values.length < 2) {
    return <svg className={className} width={w} height={h} aria-hidden="true" />;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - 2 - ((v - min) / span) * (h - 4);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg className={className} width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth="1.6"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

/** Horizontal bar on a hatched track, for topic counts. */
export function TopicBar({ name, value, max }: { name: string; value: number; max: number }) {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-x-2.5 gap-y-1.5 border-t border-dashed border-line-2 py-2 first:border-t-0">
      <span className="truncate text-[13px]">{name}</span>
      <span className="font-mono text-xs">{value}</span>
      <span className="hatch relative col-span-2 h-1.5 overflow-hidden rounded-full">
        <span
          className="absolute inset-y-0 left-0 rounded-full bg-ink"
          style={{ width: `${Math.max(3, (value / Math.max(1, max)) * 100)}%` }}
        />
      </span>
    </div>
  );
}
