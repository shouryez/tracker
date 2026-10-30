import type { CSSProperties, ReactNode } from "react";
import { cn } from "@upsolve/ui";

/** Infinite ticker with edge fades; pauses on hover. Items render twice for a seamless loop. */
export function Marquee({
  children,
  className,
  speed = 40,
}: {
  children: ReactNode;
  className?: string;
  /** Seconds per loop. */
  speed?: number;
}) {
  return (
    <div
      className={cn(
        "group/mq relative flex overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_10%,#000_90%,transparent)]",
        className,
      )}
    >
      {[0, 1].map((k) => (
        <div
          key={k}
          aria-hidden={k === 1 || undefined}
          className="flex shrink-0 animate-[marquee-x_linear_infinite] items-center gap-10 pr-10 group-hover/mq:[animation-play-state:paused] motion-reduce:animate-none"
          style={{ animationDuration: `${speed}s` }}
        >
          {children}
        </div>
      ))}
    </div>
  );
}

/** A few rare shooting stars. Deterministic positions; hidden under reduced motion. */
export function Meteors({ count = 6, className }: { count?: number; className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden motion-reduce:hidden",
        className,
      )}
    >
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className="absolute top-0 h-px w-[90px] rounded-full bg-[linear-gradient(90deg,rgba(255,255,255,.9),transparent)] opacity-0"
          style={{
            left: `${(i * 37 + 18) % 100}%`,
            top: `${(i * 23) % 40}%`,
            animation: `meteor ${7 + (i % 3) * 2}s linear ${i * 2.7}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

/**
 * Streak flame: size and colour scale with the streak (ember → orange → lime core at 30+).
 * At 0 it is a dim ember. Flickers gently; static under reduced motion.
 */
export function StreakFlame({ streak, size = 44 }: { streak: number; size?: number }) {
  const level = streak <= 0 ? 0 : streak < 7 ? 1 : streak < 30 ? 2 : 3;
  const scale = [0.62, 0.8, 0.92, 1][level]!;
  const outer = ["#5a3a2e", "#ff7a45", "#ff7a45", "#ff8a3d"][level]!;
  const inner = ["#7a4a35", "#ffb938", "#ffd166", "#d7ff3a"][level]!;
  return (
    <span
      aria-hidden="true"
      className="relative inline-grid place-items-end"
      style={{ width: size, height: size }}
    >
      {level > 0 && (
        <span
          className="absolute inset-x-[15%] bottom-0 h-1/2 rounded-full blur-[14px]"
          style={{ background: outer, opacity: 0.35 + level * 0.1 }}
        />
      )}
      {/* The flicker runs on an HTML wrapper: Chrome can't hand an animated <svg> to the
          compositor, so animating the svg itself costs a main-thread frame, forever. */}
      <span
        className={cn(
          "relative block origin-bottom",
          level > 0 && "animate-[flame_1.6s_ease-in-out_infinite] motion-reduce:animate-none",
        )}
      >
        <svg viewBox="0 0 32 40" width={size * scale} height={size * scale * 1.25}>
          <path
            d="M16 1c2 7 12 11 12 22a12 12 0 0 1-24 0c0-5 2.5-8 5-10 .3 4 2.5 6 4.5 6.5C12 13 12 6 16 1Z"
            fill={outer}
            opacity={level === 0 ? 0.55 : 1}
          />
          <path
            d="M16 17c1 3.5 6 5.5 6 10.5a6 6 0 0 1-12 0c0-2.4 1.2-3.8 2.4-4.8.2 1.9 1.2 2.9 2.2 3.1C14 22 14 19.5 16 17Z"
            fill={inner}
            opacity={level === 0 ? 0.5 : 1}
          />
        </svg>
      </span>
    </span>
  );
}

export type BeamNode = { id: string; label: string; icon?: ReactNode; x: number; y: number };

/**
 * Glowing beams connecting nodes (e.g. LeetCode → Extension → DsaKaro → Dashboard).
 * Coordinates are percentages of the box. A light pulse travels along each edge.
 */
export function AnimatedBeam({
  nodes,
  edges,
  className,
  height = 220,
}: {
  nodes: BeamNode[];
  edges: [string, string][];
  className?: string;
  height?: number;
}) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  return (
    <div className={cn("relative w-full", className)} style={{ height }}>
      <svg
        className="absolute inset-0 size-full overflow-visible"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="beam-grad" x1="0" x2="1">
            <stop offset="0" stopColor="var(--violet)" stopOpacity="0" />
            <stop offset=".5" stopColor="var(--violet)" />
            <stop offset="1" stopColor="var(--signal)" />
          </linearGradient>
        </defs>
        {edges.map(([a, b], i) => {
          const p = byId.get(a);
          const q = byId.get(b);
          if (!p || !q) return null;
          const mx = (p.x + q.x) / 2;
          const d = `M ${p.x} ${p.y} C ${mx} ${p.y}, ${mx} ${q.y}, ${q.x} ${q.y}`;
          return (
            <g key={`${a}-${b}`}>
              <path
                d={d}
                fill="none"
                stroke="var(--line-2)"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
              <path
                d={d}
                fill="none"
                stroke="url(#beam-grad)"
                strokeWidth="2"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                pathLength={100}
                strokeDasharray="18 82"
                // The glow is a filter redrawn every frame: mouse devices only, not phones.
                className="animate-[beam-travel_2.8s_linear_infinite] motion-reduce:hidden pointer-fine:[filter:drop-shadow(0_0_4px_var(--violet))]"
                style={{ animationDelay: `${i * 0.7}s` } as CSSProperties}
              />
            </g>
          );
        })}
      </svg>
      {nodes.map((n) => (
        <div
          key={n.id}
          className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5"
          style={{ left: `${n.x}%`, top: `${n.y}%` }}
        >
          <span className="grid size-12 place-items-center rounded-[14px] border border-line-2 bg-surface-2 text-ink shadow-e2">
            {n.icon}
          </span>
          <span className="text-11 font-medium whitespace-nowrap text-ink-2">{n.label}</span>
        </div>
      ))}
    </div>
  );
}

// DsaKaro
