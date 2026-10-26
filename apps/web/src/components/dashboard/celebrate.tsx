"use client";

import { useEffect } from "react";

const MILESTONES = [7, 14, 30, 50, 75, 100, 150, 200, 365];

/** A short confetti burst in brand colours. Skipped for reduced motion. */
export async function burst(opts: { origin?: { x: number; y: number } } = {}) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const confetti = (await import("canvas-confetti")).default;
  confetti({
    particleCount: 90,
    spread: 70,
    startVelocity: 38,
    ticks: 160,
    scalar: 0.9,
    origin: opts.origin ?? { x: 0.5, y: 0.35 },
    colors: ["#d7ff3a", "#6e7bff", "#ffffff", "#ff7a45"],
    disableForReducedMotion: true,
  });
}

/** Celebrates each streak milestone once (remembered per browser). */
export function StreakCelebration({ streak }: { streak: number }) {
  useEffect(() => {
    const hit = [...MILESTONES].reverse().find((m) => streak >= m);
    if (!hit) return;
    const key = `upsolve:streak-celebrated:${hit}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
    } catch {
      return; // can't remember it, so don't risk celebrating on every visit
    }
    void burst();
  }, [streak]);
  return null;
}
