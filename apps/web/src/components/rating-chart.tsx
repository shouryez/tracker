"use client";

import { useEffect, useId, useRef, useState } from "react";

type Point = { at: number; rating: number; name: string };

/** Codeforces rank colours by rating floor, faint behind the line. */
export const CF_BANDS = [
  { min: 0, color: "#9a9a9a" },
  { min: 1200, color: "#3ddc97" },
  { min: 1400, color: "#34d6d0" },
  { min: 1600, color: "#5e8bff" },
  { min: 1900, color: "#b07cff" },
  { min: 2100, color: "#ffb938" },
  { min: 2400, color: "#ff5a78" },
];

/**
 * Rating over time: gradient area, a line that draws in, a marker per contest, a crosshair
 * and glass tooltip on hover. Optional rank `bands` tint the background by rating range.
 */
export function RatingChart({
  points,
  stroke,
  bands,
}: {
  points: Point[];
  stroke: string;
  bands?: { min: number; color: string }[];
}) {
  const [hover, setHover] = useState<number | null>(null);
  const [w, setW] = useState(600);
  const box = useRef<HTMLDivElement>(null);
  const gid = useId();
  // Draw at the container's real width so axis text stays 10px at any card size.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      if (e) setW(Math.max(280, Math.round(e.contentRect.width)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  if (points.length === 0) return null;
  const h = 200;
  const pad = { l: 38, r: 12, t: 12, b: 20 };
  const min = Math.min(...points.map((p) => p.rating));
  const max = Math.max(...points.map((p) => p.rating));
  const lo = Math.floor((min - 50) / 100) * 100;
  const hi = Math.ceil((max + 50) / 100) * 100;
  const t0 = points[0]!.at;
  const t1 = points.at(-1)!.at;
  const x = (t: number) => pad.l + (t1 === t0 ? 0.5 : (t - t0) / (t1 - t0)) * (w - pad.l - pad.r);
  const y = (r: number) => pad.t + (1 - (r - lo) / (hi - lo || 1)) * (h - pad.t - pad.b);
  const line = points
    .map((p, i) => `${i ? "L" : "M"}${x(p.at).toFixed(1)},${y(p.rating).toFixed(1)}`)
    .join("");
  const area = `${line}L${x(t1).toFixed(1)},${h - pad.b}L${x(t0).toFixed(1)},${h - pad.b}Z`;
  const ticks = [lo, Math.round((lo + hi) / 200) * 100, hi];
  const hp = hover === null ? null : points[hover]!;
  const prev = hover !== null && hover > 0 ? points[hover - 1]!.rating : null;
  const fmt = (t: number) =>
    new Date(t).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" });
  const mono = "var(--font-geist-mono), monospace";

  return (
    <div ref={box} className="relative">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Rating from ${points[0]!.rating} to ${points.at(-1)!.rating} over ${points.length} contests`}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={stroke} stopOpacity=".28" />
            <stop offset="1" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>
        {bands?.map((b, i) => {
          const top = Math.min(hi, bands[i + 1]?.min ?? hi);
          const bottom = Math.max(lo, b.min);
          if (top <= lo || bottom >= hi || top <= bottom) return null;
          return (
            <rect
              key={b.min}
              x={pad.l}
              width={w - pad.l - pad.r}
              y={y(top)}
              height={y(bottom) - y(top)}
              fill={b.color}
              opacity=".06"
            />
          );
        })}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={w - pad.r} y1={y(t)} y2={y(t)} stroke="var(--chart-grid)" />
            <text
              x={pad.l - 8}
              y={y(t) + 3}
              textAnchor="end"
              fontSize="10"
              fill="var(--ink-3)"
              fontFamily={mono}
            >
              {t}
            </text>
          </g>
        ))}
        <path
          d={area}
          fill={`url(#${gid})`}
          className="animate-[fade-in-pop_900ms_var(--ease-out)_both] [transform-origin:bottom]"
        />
        <path
          d={line}
          fill="none"
          stroke={stroke}
          strokeWidth="2.2"
          strokeLinejoin="round"
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray="100"
          className="animate-[draw_1200ms_var(--ease-out)_both]"
          style={{ filter: `drop-shadow(0 0 6px ${stroke})` }}
        />
        {hp && (
          <line
            x1={x(hp.at)}
            x2={x(hp.at)}
            y1={pad.t}
            y2={h - pad.b}
            stroke="var(--line-3)"
            strokeDasharray="3 3"
          />
        )}
        {points.map((p, i) => (
          <g key={p.at}>
            <circle
              cx={x(p.at)}
              cy={y(p.rating)}
              r={hover === i ? 5 : 2.6}
              fill={hover === i ? stroke : "var(--surface)"}
              stroke={stroke}
              strokeWidth="1.6"
            />
            <circle
              cx={x(p.at)}
              cy={y(p.rating)}
              r="11"
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
          </g>
        ))}
        <text x={pad.l} y={h - 4} fontSize="10" fill="var(--ink-3)" fontFamily={mono}>
          {fmt(t0)}
        </text>
        <text
          x={w - pad.r}
          y={h - 4}
          textAnchor="end"
          fontSize="10"
          fill="var(--ink-3)"
          fontFamily={mono}
        >
          {fmt(t1)}
        </text>
      </svg>
      {hp && (
        <div
          role="status"
          className="glass pointer-events-none absolute top-0 right-0 rounded-[10px] border border-line-2 px-3 py-2 text-right shadow-e3"
        >
          <p className="max-w-[240px] truncate text-12 font-[600]">{hp.name}</p>
          <p className="tnum text-12 text-ink-2">
            <span className="font-[600] text-ink">{hp.rating}</span>
            {prev !== null && (
              <span className={hp.rating >= prev ? "text-success" : "text-hard"}>
                {" "}
                {hp.rating >= prev ? "+" : ""}
                {hp.rating - prev}
              </span>
            )}{" "}
            · {fmt(hp.at)}
          </p>
        </div>
      )}
    </div>
  );
}
