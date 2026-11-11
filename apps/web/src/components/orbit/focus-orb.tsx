import type { CSSProperties, ReactNode } from "react";
import { cn } from "@upsolve/ui";
import { NumberTicker } from "@/components/fx/number-ticker";

/**
 * The Orbit focus orb: a glossy ember sphere inside a watch bezel (60 ticks and a progress
 * arc), with concentric orbit rings. Each ring can carry a mint dot that slowly orbits.
 * Everything is concentric with the orb. Pure SVG + CSS, so it renders on the server.
 */
export function FocusOrb({
  size,
  orb,
  progress,
  rings = [],
  dots = [],
  center,
  caption,
  label,
  className,
}: {
  /** The square stage in px. */
  size: number;
  /** Orb diameter in px. */
  orb: number;
  /** 0..1 around the bezel. */
  progress: number;
  /** Ring radii in px, inside out. */
  rings?: number[];
  /** Dot size per ring (0 = no dot), inside out. */
  dots?: number[];
  center: ReactNode;
  caption?: ReactNode;
  /** Accessible description of what the orb shows. */
  label: string;
  className?: string;
}) {
  const c = size / 2;
  const R = orb / 2;
  const bez = R + 16;
  const arcR = bez - 6;
  const circ = 2 * Math.PI * arcR;
  const p = Math.max(0, Math.min(1, progress));
  const gid = `orb-arc-${size}-${orb}`;
  const ticks = Array.from({ length: 60 }, (_, k) => {
    const a = ((k * 6 - 90) * Math.PI) / 180;
    const r1 = bez + (k % 5 ? 3 : 0);
    const r2 = bez + 8;
    return {
      x1: c + r1 * Math.cos(a),
      y1: c + r1 * Math.sin(a),
      x2: c + r2 * Math.cos(a),
      y2: c + r2 * Math.sin(a),
      major: k % 5 === 0,
    };
  });
  return (
    <div
      role="img"
      aria-label={label}
      // Read by lib/orbit-fx.ts (ring promotion flights).
      data-focus-orb=""
      data-rings={JSON.stringify(rings)}
      data-size={size}
      className={cn("group/orb relative shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute rounded-full motion-safe:animate-[orbit-glow_5s_ease-in-out_infinite]"
        style={{
          left: c - orb * 0.9,
          top: c - orb * 0.9,
          width: orb * 1.8,
          height: orb * 1.8,
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--primary) 30%, transparent), color-mix(in srgb, var(--primary) 8%, transparent) 45%, transparent 70%)",
        }}
      />
      <svg
        aria-hidden="true"
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        className="absolute inset-0 overflow-visible"
      >
        <defs>
          <linearGradient id={gid} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#ffc39e" />
            <stop offset="1" stopColor="#e2753f" />
          </linearGradient>
        </defs>
        {rings.map((r, i) => (
          <circle
            key={r}
            data-orb-ring={i}
            cx={c}
            cy={c}
            r={r}
            fill="none"
            stroke="var(--ink)"
            strokeOpacity={Math.max(0.03, 0.1 - i * 0.014)}
            strokeDasharray={i >= rings.length - 2 && rings.length > 2 ? "2 7" : undefined}
          />
        ))}
        {ticks.map((t, k) => (
          <line
            key={k}
            x1={t.x1}
            y1={t.y1}
            x2={t.x2}
            y2={t.y2}
            stroke="var(--ink)"
            strokeOpacity={t.major ? 0.28 : 0.12}
            strokeWidth="1.2"
          />
        ))}
        <circle
          cx={c}
          cy={c}
          r={arcR}
          fill="none"
          stroke="var(--ink)"
          strokeOpacity=".06"
          strokeWidth="4"
        />
        <circle
          cx={c}
          cy={c}
          r={arcR}
          fill="none"
          stroke={`url(#${gid})`}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${(circ * p).toFixed(1)} ${circ.toFixed(1)}`}
          transform={`rotate(-90 ${c} ${c})`}
          style={{ filter: "drop-shadow(0 0 6px rgba(240,136,79,.6))" }}
        />
        {rings.map((r, i) => {
          const d = dots[i] ?? 0;
          if (!d) return null;
          const a = ((-140 + i * 38) * Math.PI) / 180;
          return (
            <g
              key={`d${r}`}
              className="motion-safe:animate-[orbit-spin_linear_infinite]"
              style={
                {
                  transformBox: "view-box",
                  transformOrigin: `${c}px ${c}px`,
                  animationDuration: `${70 + i * 18}s`,
                  animationDirection: i % 2 ? "reverse" : "normal",
                } as CSSProperties
              }
            >
              <circle
                cx={c + r * Math.cos(a)}
                cy={c + r * Math.sin(a)}
                r={d}
                fill="var(--signal)"
                opacity={1 - i * 0.1}
                style={{
                  filter: "drop-shadow(0 0 6px color-mix(in srgb, var(--signal) 75%, transparent))",
                }}
              />
            </g>
          );
        })}
      </svg>
      <div
        className="orbit-orb absolute grid place-content-center text-center transition-[box-shadow] duration-500 motion-safe:animate-[orbit-breathe_5s_ease-in-out_infinite] group-hover/orb:shadow-[inset_-16px_-24px_46px_rgba(80,25,5,.42),inset_10px_14px_30px_rgba(255,255,255,.3),0_0_0_1px_rgba(255,220,195,.35),0_40px_110px_-20px_rgba(240,136,79,.75)]"
        style={{ left: c - R, top: c - R, width: orb, height: orb }}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-[9%] left-[20%] h-[19%] w-[36%] rounded-full bg-[radial-gradient(ellipse,rgba(255,255,255,.72),transparent_70%)] blur-[1.5px]"
        />
        <span className="relative font-display text-[2.6em] leading-none tracking-[-0.04em] tabular-nums">
          {center}
        </span>
        {caption && (
          <span className="relative mt-1 text-[12.5px] font-[600] text-[rgba(42,18,5,.72)]">
            {caption}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * A compact row of the six revision ladder steps with their counts. Inside a `.rung-scope`,
 * hovering or focusing a chip highlights that rung's problems and orb ring (globals.css).
 */
export function LadderChips({ counts, className }: { counts: number[]; className?: string }) {
  const steps = [1, 3, 7, 16, 35, 90];
  return (
    <div className={cn("grid grid-cols-3 gap-2 sm:grid-cols-6", className)}>
      {steps.map((d, i) => {
        const n = counts[i] ?? 0;
        const s = 6 + Math.min(n, 12) * 0.5;
        return (
          <div
            key={d}
            data-rung-chip={i}
            tabIndex={0}
            aria-label={`Day ${d}: ${n} problem${n === 1 ? "" : "s"}`}
            className="flex cursor-default flex-col items-start gap-1.5 rounded-[14px] bg-[color-mix(in_srgb,var(--ink)_4%,transparent)] p-3 shadow-[inset_0_0_0_1px_var(--line)] transition-[box-shadow,background-color] duration-[var(--dur-base)] outline-none hover:shadow-[inset_0_0_0_1px_var(--signal-mark)] focus-visible:shadow-[inset_0_0_0_2px_var(--signal-mark)]"
          >
            <i
              className="rounded-full bg-signal shadow-[0_0_8px_color-mix(in_srgb,var(--signal)_60%,transparent)]"
              style={{ width: s, height: s, opacity: n ? 1 - i * 0.1 : 0.25 }}
            />
            <b className="font-display text-[22px] leading-none font-[650] tracking-[-0.03em]">
              <NumberTicker value={n} roll={false} />
            </b>
            <span className="text-12 font-[550] text-ink-3">Day {d}</span>
          </div>
        );
      })}
    </div>
  );
}
