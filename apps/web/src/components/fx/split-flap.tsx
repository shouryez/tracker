"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@upsolve/ui";
import { feel } from "@/lib/feel";

/** One split-flap digit: when it changes, the old top half falls over to reveal the new. */
function Flap({ ch, size }: { ch: string; size: "md" | "lg" }) {
  const [prev, setPrev] = useState(ch);
  const [flipKey, setFlipKey] = useState(0);
  // Track the last digit we showed, to animate from it (state derived from props).
  const [shown, setShown] = useState(ch);
  if (ch !== shown) {
    setPrev(shown);
    setShown(ch);
    setFlipKey((k) => k + 1);
  }
  const box = size === "lg" ? "h-[58px] w-[42px] text-[40px]" : "h-[40px] w-[30px] text-[27px]";
  const half = "absolute inset-x-0 overflow-hidden";
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flap relative inline-block rounded-[8px] font-display font-[650] tabular-nums [perspective:240px]",
        box,
      )}
    >
      {/* Static: new top, new bottom (the bottom gets covered until the flap lands) */}
      <span className={cn(half, "flap-top top-0 h-1/2")}>
        <span className="flap-ch">{ch}</span>
      </span>
      <span className={cn(half, "flap-bottom bottom-0 h-1/2")}>
        <span className="flap-ch flap-ch-low">{flipKey > 0 ? prev : ch}</span>
      </span>
      {flipKey > 0 && (
        <>
          {/* Old top falls forward */}
          <span key={`t${flipKey}`} className={cn(half, "flap-top flap-fall top-0 h-1/2")}>
            <span className="flap-ch">{prev}</span>
          </span>
          {/* New bottom swings down into place */}
          <span key={`b${flipKey}`} className={cn(half, "flap-bottom flap-land bottom-0 h-1/2")}>
            <span className="flap-ch flap-ch-low">{ch}</span>
          </span>
        </>
      )}
      <span className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-px bg-black/45" />
    </span>
  );
}

const pad = (n: number) => String(Math.max(0, n)).padStart(2, "0");

/**
 * A split-flap countdown (FRONTEND-PLAN §8 Contests 1): DD HH MM SS on falling flaps, one
 * tick a second. Flap clicks play only when sound is on and the board is on screen.
 */
export function SplitFlapCountdown({
  to,
  size = "md",
  className,
}: {
  /** Target time (ms). */
  to: number;
  size?: "md" | "lg";
  className?: string;
}) {
  const [now, setNow] = useState<number | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const seen = useRef(false);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => (seen.current = !!e?.isIntersecting));
    if (root.current) io.observe(root.current);
    const tick = () => {
      setNow(Date.now());
      if (seen.current) feel.flap();
    };
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 1000);
    return () => {
      io.disconnect();
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);
  const left = now === null ? 0 : Math.max(0, to - now);
  const s = Math.floor(left / 1000);
  const parts = [
    { v: pad(Math.floor(s / 86400)), unit: "days" },
    { v: pad(Math.floor((s % 86400) / 3600)), unit: "hrs" },
    { v: pad(Math.floor((s % 3600) / 60)), unit: "min" },
    { v: pad(s % 60), unit: "sec" },
  ];
  const label =
    now === null
      ? "Counting down"
      : `${parts[0]!.v} days ${parts[1]!.v} hours ${parts[2]!.v} minutes left`;
  return (
    <div
      ref={root}
      role="timer"
      aria-label={label}
      className={cn("flex items-end gap-2.5", className)}
    >
      {parts.map((p, i) => (
        <div key={p.unit} className="flex items-end gap-2.5">
          <div className="flex flex-col items-center gap-1.5">
            <div className="flex gap-1">
              {p.v.split("").map((ch, k) => (
                <Flap key={k} ch={now === null ? "0" : ch} size={size} />
              ))}
            </div>
            <span className="text-11 font-[600] text-ink-3">{p.unit}</span>
          </div>
          {i < parts.length - 1 && (
            <span
              aria-hidden="true"
              className={cn(
                "pb-6 font-display font-[650] text-ink-4",
                size === "lg" ? "text-[30px]" : "text-[20px]",
              )}
            >
              :
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
