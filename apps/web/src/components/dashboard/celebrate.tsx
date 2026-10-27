"use client";

import { useEffect } from "react";

const MILESTONES = [7, 14, 30, 50, 75, 100, 150, 200, 365];

/**
 * Pixel confetti: square particles in brand colours (the logo's pixel motif).
 * Lazy-loads canvas-confetti. Skipped for reduced motion. `small` is for row-level wins.
 */
export async function burst(opts: { origin?: { x: number; y: number }; small?: boolean } = {}) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const confetti = (await import("canvas-confetti")).default;
  confetti({
    particleCount: opts.small ? 28 : 90,
    spread: opts.small ? 55 : 70,
    startVelocity: opts.small ? 22 : 38,
    ticks: opts.small ? 90 : 160,
    scalar: opts.small ? 0.7 : 0.95,
    shapes: ["square"],
    flat: true,
    origin: opts.origin ?? { x: 0.5, y: 0.35 },
    colors: ["#d7ff3a", "#a48bff", "#6e7bff", "#ffffff", "#34d6d0"],
    disableForReducedMotion: true,
  });
}

/** Burst from an element (e.g. the checkbox that was just ticked). */
export function burstFrom(el: Element | null, small = true) {
  if (!el) return burst({ small });
  const r = el.getBoundingClientRect();
  return burst({
    small,
    origin: {
      x: (r.left + r.width / 2) / window.innerWidth,
      y: (r.top + r.height / 2) / window.innerHeight,
    },
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

/** Celebrates a real achievement once per `id` (e.g. "queue-2026-10-28"), remembered per browser. */
export function CelebrateOnce({ id }: { id: string }) {
  useEffect(() => {
    const key = `upsolve:celebrated:${id}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
    } catch {
      return;
    }
    void burst();
  }, [id]);
  return null;
}
