"use client";

import { useRef, type CSSProperties, type ReactNode } from "react";
import { cn } from "@upsolve/ui";
import { useScrollProgress } from "./scene-bits";

const reduced = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The hero's product frame: it starts tilted back on the desk and lies flat, grows a
 * little and catches more lamp light as you scroll it up the screen. Writes one CSS
 * variable (--hp, 0..1) per frame; the transforms read it, so React never re-renders.
 */
export function TiltFrame({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useScrollProgress(
    ref,
    (p) => ref.current?.style.setProperty("--hp", reduced() ? "1" : p.toFixed(4)),
    (r, vh) => [r.top - vh * 0.85, vh * 0.65],
  );
  return (
    <div
      ref={ref}
      className={cn("relative [perspective:1800px]", className)}
      style={{ "--hp": 0 } as CSSProperties}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-[10%] -bottom-10 h-32 rounded-full bg-[radial-gradient(closest-side,rgba(243,180,92,.28),transparent)] blur-2xl"
        style={{ opacity: "calc(.45 + var(--hp) * .55)" }}
      />
      <div
        className="relative origin-[50%_100%] will-change-transform"
        style={{
          transform:
            "rotateX(calc((1 - var(--hp)) * 18deg)) scale(calc(.93 + var(--hp) * .07)) translateY(calc((1 - var(--hp)) * 24px))",
        }}
      >
        {children}
      </div>
    </div>
  );
}

/** Lifts and fades the hero copy slightly as the frame comes up (parallax depth). */
export function HeroCopyDrift({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useScrollProgress(
    ref,
    (p) => {
      const el = ref.current;
      if (!el || reduced()) return;
      el.style.transform = `translateY(${(-p * 60).toFixed(1)}px)`;
      el.style.opacity = String(1 - p * 0.55);
    },
    (r) => [r.top, r.height + 200],
  );
  return (
    <div ref={ref} className={cn("will-change-transform", className)}>
      {children}
    </div>
  );
}

/** Moves its row sideways as the section scrolls past: the shelf drifts under the lamp. */
export function Drift({
  children,
  className,
  distance = 80,
}: {
  children: ReactNode;
  className?: string;
  distance?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useScrollProgress(
    ref,
    (p) => {
      const el = ref.current?.firstElementChild as HTMLElement | null;
      if (!el || reduced()) return;
      el.style.transform = `translateX(${((0.5 - p) * distance).toFixed(1)}px)`;
    },
    (r, vh) => [r.top - vh, r.height + vh],
  );
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
