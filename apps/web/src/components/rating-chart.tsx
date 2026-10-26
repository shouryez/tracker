"use client";

import { useState } from "react";

type Point = { at: number; rating: number; name: string };

/** Rating over time: one line, a dot per contest, hover for details. */
export function RatingChart({ points, stroke }: { points: Point[]; stroke: string }) {
  const [hover, setHover] = useState<number | null>(null);
  if (points.length === 0) return null;
  const w = 600;
  const h = 160;
  const pad = { l: 36, r: 10, t: 10, b: 18 };
  const min = Math.min(...points.map((p) => p.rating));
  const max = Math.max(...points.map((p) => p.rating));
  const lo = Math.floor((min - 50) / 100) * 100;
  const hi = Math.ceil((max + 50) / 100) * 100;
  const t0 = points[0]!.at;
  const t1 = points.at(-1)!.at;
  const x = (t: number) => pad.l + (t1 === t0 ? 0.5 : (t - t0) / (t1 - t0)) * (w - pad.l - pad.r);
  const y = (r: number) => pad.t + (1 - (r - lo) / (hi - lo || 1)) * (h - pad.t - pad.b);
  const path = points
    .map((p, i) => `${i ? "L" : "M"}${x(p.at).toFixed(1)},${y(p.rating).toFixed(1)}`)
    .join("");
  const ticks = [lo, Math.round((lo + hi) / 200) * 100, hi];
  const hp = hover === null ? null : points[hover]!;
  const fmt = (t: number) =>
    new Date(t).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" });

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Rating from ${points[0]!.rating} to ${points.at(-1)!.rating} over ${points.length} contests`}
        onMouseLeave={() => setHover(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={pad.l}
              x2={w - pad.r}
              y1={y(t)}
              y2={y(t)}
              stroke="var(--line)"
              strokeDasharray="3 4"
            />
            <text
              x={pad.l - 6}
              y={y(t) + 3}
              textAnchor="end"
              fontSize="10"
              fill="var(--ink-3)"
              fontFamily="var(--font-geist-mono), monospace"
            >
              {t}
            </text>
          </g>
        ))}
        <path d={path} fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
        {points.map((p, i) => (
          <g key={p.at}>
            <circle
              cx={x(p.at)}
              cy={y(p.rating)}
              r={hover === i ? 4.5 : 2.5}
              fill={hover === i ? stroke : "var(--surface)"}
              stroke={stroke}
              strokeWidth="1.5"
            />
            {/* Bigger invisible hit target than the dot. */}
            <circle
              cx={x(p.at)}
              cy={y(p.rating)}
              r="10"
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
          </g>
        ))}
        <text
          x={pad.l}
          y={h - 3}
          fontSize="10"
          fill="var(--ink-3)"
          fontFamily="var(--font-geist-mono), monospace"
        >
          {fmt(t0)}
        </text>
        <text
          x={w - pad.r}
          y={h - 3}
          textAnchor="end"
          fontSize="10"
          fill="var(--ink-3)"
          fontFamily="var(--font-geist-mono), monospace"
        >
          {fmt(t1)}
        </text>
      </svg>
      {hp && (
        <div
          role="status"
          className="pointer-events-none absolute top-0 right-0 rounded-[8px] border border-line bg-surface px-2.5 py-1.5 text-right shadow-card"
        >
          <p className="max-w-[220px] truncate text-[12px] font-medium">{hp.name}</p>
          <p className="font-mono text-[11px] text-ink-3">
            {hp.rating} · {fmt(hp.at)}
          </p>
        </div>
      )}
    </div>
  );
}
