import { useId } from "react";
import type { SolvedCounts } from "@upsolve/adapters";
import { SegmentedProgress, cn } from "@upsolve/ui";

/** Easy / medium / hard share of solved problems: segmented bar + legend chips. */
export function SolvedSplit({ solved, className }: { solved: SolvedCounts; className?: string }) {
  const segments = [
    { label: "Easy", value: solved.easy, color: "var(--easy)" },
    { label: "Medium", value: solved.medium, color: "var(--medium)" },
    { label: "Hard", value: solved.hard, color: "var(--hard)" },
    { label: "Unrated", value: solved.unknown, color: "var(--ink-4)" },
  ];
  const total = solved.easy + solved.medium + solved.hard + solved.unknown;
  return (
    <div className={className}>
      {total === 0 ? (
        <div className="h-2 rounded-full bg-surface-3" />
      ) : (
        <SegmentedProgress segments={segments} />
      )}
      <ul className="mt-2.5 flex flex-wrap gap-x-3.5 gap-y-1 text-12 text-ink-3">
        {segments
          .filter((s) => s.label !== "Unrated" || s.value > 0)
          .map((s) => (
            <li key={s.label} className="flex items-center gap-1.5">
              <i
                aria-hidden="true"
                className="size-2 rounded-[2px]"
                style={{ background: s.color }}
              />
              <span className="tnum font-[600] text-ink">{s.value}</span> {s.label.toLowerCase()}
            </li>
          ))}
      </ul>
    </div>
  );
}

/** Tiny rating line with a gradient area and the latest point highlighted. Oldest first. */
export function Sparkline({
  values,
  className,
  stroke = "var(--primary)",
  width = 96,
  height = 30,
}: {
  values: number[];
  className?: string;
  stroke?: string;
  width?: number;
  height?: number;
}) {
  const id = useId();
  const w = width;
  const h = height;
  if (values.length < 2) {
    return <svg className={className} width={w} height={h} aria-hidden="true" />;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map(
    (v, i) =>
      [(i / (values.length - 1)) * (w - 4) + 2, h - 3 - ((v - min) / span) * (h - 6)] as const,
  );
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join("");
  const last = pts.at(-1)!;
  return (
    <svg className={className} width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={stroke} stopOpacity=".3" />
          <stop offset="1" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line}L${last[0]},${h}L${pts[0]![0]},${h}Z`} fill={`url(#${id})`} />
      <path
        d={line}
        fill="none"
        stroke={stroke}
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
        pathLength={100}
        strokeDasharray="100"
        className="animate-draw"
      />
      <circle cx={last[0]} cy={last[1]} r="2.6" fill={stroke} />
      <circle cx={last[0]} cy={last[1]} r="5" fill={stroke} opacity=".25" />
    </svg>
  );
}

/** Horizontal bar with a gradient fill and the value at the end. */
export function TopicBar({
  name,
  value,
  max,
  top,
  color = "var(--violet)",
}: {
  name: string;
  value: number;
  max: number;
  top?: boolean;
  color?: string;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-x-2.5 gap-y-1.5 py-1.5">
      <span className={cn("truncate text-13", top ? "font-[600] text-ink" : "text-ink-2")}>
        {name}
      </span>
      <span className="tnum font-mono text-12">{value}</span>
      <span className="relative col-span-2 h-2 overflow-hidden rounded-full bg-surface-3">
        <span
          className="absolute inset-y-0 left-0 origin-left animate-[grow-x_900ms_var(--ease-out)_both] rounded-full"
          style={{
            width: `${Math.max(3, (value / Math.max(1, max)) * 100)}%`,
            background: `linear-gradient(90deg, color-mix(in srgb, ${color} 55%, transparent), ${color})`,
            boxShadow: top ? `0 0 12px -2px ${color}` : undefined,
          }}
        />
      </span>
    </div>
  );
}
