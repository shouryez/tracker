"use client";

import { useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";

const DAY = 86_400_000;

type Curve = { lastAt: number; dueAt: number; now: number };

/**
 * An estimated forgetting curve: recall falls as e^(−t/S), with S set so it reaches 80% on
 * the day the problem is due (that's what the ladder is tuned for). Purely illustrative.
 */
function model({ lastAt, dueAt, now }: Curve) {
  const interval = Math.max(0.5, (dueAt - lastAt) / DAY);
  const S = interval / Math.log(1 / 0.8);
  const t = Math.max(0, (now - lastAt) / DAY);
  return { interval, S, t, recall: Math.exp(-t / S) };
}

const fmt = (ms: number) =>
  new Date(ms).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

function CurveCard({ c }: { c: Curve }) {
  const { interval, S, t, recall } = model(c);
  const W = 216;
  const H = 70;
  const span = Math.max(interval * 1.6, t * 1.15, 1);
  const x = (d: number) => (d / span) * W;
  const y = (r: number) => H - r * H;
  const pts = Array.from({ length: 41 }, (_, i) => {
    const d = (i / 40) * span;
    return `${x(d).toFixed(1)},${y(Math.exp(-d / S)).toFixed(1)}`;
  });
  const pct = Math.round(recall * 100);
  const below = recall < 0.8;
  return (
    <div className="glass-overlay w-[248px] rounded-[16px] p-3.5 text-12">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-display text-[22px] leading-none font-[650] tracking-[-0.03em]">
          ≈{pct}%
        </span>
        <span className="text-ink-3">recall now · estimate</span>
      </div>
      <svg
        viewBox={`-4 -4 ${W + 8} ${H + 8}`}
        width={W + 8}
        height={H + 8}
        className="mt-2 overflow-visible"
      >
        <line
          x1={0}
          x2={W}
          y1={y(0.8)}
          y2={y(0.8)}
          stroke="var(--ink)"
          strokeOpacity=".18"
          strokeDasharray="3 4"
        />
        <polyline
          points={pts.join(" ")}
          fill="none"
          stroke="var(--signal-mark)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <line
          x1={x(interval)}
          x2={x(interval)}
          y1={0}
          y2={H}
          stroke="var(--amber)"
          strokeOpacity=".5"
        />
        <circle
          cx={x(t)}
          cy={y(recall)}
          r="4.5"
          fill={below ? "var(--primary)" : "var(--signal-mark)"}
          stroke="var(--bg)"
          strokeWidth="2"
        />
      </svg>
      <p className="mt-1.5 text-ink-2">
        {below ? (
          <>
            Below 80% since <b className="font-[600] text-ink">{fmt(c.dueAt)}</b>. Re-solve it to
            reset the curve.
          </>
        ) : (
          <>
            Dips below 80% on <b className="font-[600] text-ink">{fmt(c.dueAt)}</b>, the day
            it&apos;s due.
          </>
        )}
      </p>
    </div>
  );
}

/**
 * Wraps a queue row (`li` or `tr`): hovering it shows the problem's memory curve in a
 * frosted card that follows the pointer (FRONTEND-PLAN §8 Revision 2). Mouse only; the
 * row's own text already says when it's due.
 */
export function CurveHover({
  as = "li",
  curve,
  className,
  style,
  children,
  ...rest
}: {
  as?: "li" | "tr" | "div";
  curve: Curve;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
} & Record<`data-${string}`, string | number | undefined>) {
  const [at, setAt] = useState<{ x: number; y: number } | null>(null);
  const raf = useRef(0);
  const Tag = as;
  const place = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    const { clientX, clientY } = e;
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => setAt({ x: clientX, y: clientY }));
  };
  // Keep the card on screen: flip left/up near the edges.
  const left = at ? (at.x + 280 > innerWidth ? at.x - 264 : at.x + 18) : 0;
  const top = at ? (at.y + 170 > innerHeight ? at.y - 160 : at.y + 18) : 0;
  return (
    <Tag
      className={className}
      style={style}
      onPointerMove={place}
      onPointerLeave={() => {
        cancelAnimationFrame(raf.current);
        setAt(null);
      }}
      {...rest}
    >
      {children}
      {at &&
        createPortal(
          <div
            aria-hidden="true"
            className="pointer-events-none fixed z-[80] animate-[pop-open_var(--dur-fast)_var(--ease-out)]"
            style={{ left, top }}
          >
            <CurveCard c={curve} />
          </div>,
          document.body,
        )}
    </Tag>
  );
}
