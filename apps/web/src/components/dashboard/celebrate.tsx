"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { SignalType } from "@/components/fx/signal-type";

const MILESTONES = [7, 14, 30, 50, 75, 100, 150, 200, 365];
const SOLVED = [10, 25, 50, 100, 150, 200, 300, 500, 750, 1000];

/** "Share your card" for a milestone: the image is drawn on the server from your numbers. */
function offerCard(title: string, kind: "streak" | "solved") {
  // The milestone powers on like a sign inside the toast.
  const headline = (
    <SignalType
      text={title}
      trigger="mount"
      delay={0.25}
      glow={0.8}
      interference={0}
      clickCycle={false}
      instability={0.4}
    />
  );
  toast.success(headline, {
    description: "Your share card is ready.",
    duration: 10_000,
    action: {
      label: "Get the card",
      onClick: () => window.open(`/api/share-card?download=1&milestone=${kind}`, "_blank"),
    },
  });
}

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
    colors: ["#c6f16b", "#7cb7ff", "#f5b94d", "#ffffff"],
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
export function StreakCelebration({ streak, solved }: { streak: number; solved?: number }) {
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
    offerCard(`${hit}-day streak`, "streak");
  }, [streak]);
  useEffect(() => {
    if (solved === undefined) return;
    const hit = [...SOLVED].reverse().find((m) => solved >= m);
    if (!hit) return;
    const key = `upsolve:solved-celebrated:${hit}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
    } catch {
      return;
    }
    void burst();
    offerCard(`${hit} problems solved`, "solved");
  }, [solved]);
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
