"use client";

import { useEffect, useMemo, useRef } from "react";
import { reducedMotion } from "@/lib/feel";

/**
 * Variable proximity (FRONTEND-PLAN §0.10): letters near the cursor get bolder, easing the
 * variable font's weight axis, so a headline seems to lean towards you. Desktop only; under
 * reduced motion it's plain text at `from` weight. Use sparingly: onboarding, login, empty
 * states, 404.
 */
export function VariableProximity({
  text,
  from = 560,
  to = 820,
  radius = 140,
  className,
}: {
  text: string;
  /** Resting weight. */
  from?: number;
  /** Weight right under the cursor. */
  to?: number;
  /** Reach in px. */
  radius?: number;
  className?: string;
}) {
  const root = useRef<HTMLSpanElement>(null);
  const words = useMemo(() => text.split(/(\s+)/), [text]);

  useEffect(() => {
    const el = root.current;
    if (!el || !window.matchMedia("(pointer: fine)").matches || reducedMotion()) return;
    const letters = Array.from(el.querySelectorAll<HTMLSpanElement>("[data-l]"));
    const current = letters.map(() => from);
    let px = -1e4;
    let py = -1e4;
    let raf = 0;

    const frame = () => {
      raf = 0;
      const box = el.getBoundingClientRect();
      // Far away: everything eases back to rest, then the loop stops.
      const near =
        px > box.left - radius &&
        px < box.right + radius &&
        py > box.top - radius &&
        py < box.bottom + radius;
      let busy = false;
      letters.forEach((l, i) => {
        let goal = from;
        if (near) {
          const r = l.getBoundingClientRect();
          const d = Math.hypot(px - (r.left + r.width / 2), py - (r.top + r.height / 2));
          const k = Math.max(0, 1 - d / radius);
          goal = from + (to - from) * k * k * (3 - 2 * k);
        }
        const next = current[i]! + (goal - current[i]!) * 0.22;
        if (Math.abs(next - current[i]!) > 0.5) busy = true;
        current[i] = next;
        l.style.fontVariationSettings = `"wght" ${Math.round(next)}`;
      });
      if (busy) raf = requestAnimationFrame(frame);
    };
    const onMove = (e: PointerEvent) => {
      px = e.clientX;
      py = e.clientY;
      if (!raf) raf = requestAnimationFrame(frame);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
    };
  }, [from, to, radius, text]);

  return (
    <span ref={root} className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.map((w, wi) =>
          /^\s+$/.test(w) ? (
            w
          ) : (
            <span key={wi} className="inline-block whitespace-nowrap">
              {Array.from(w).map((ch, ci) => (
                <span key={ci} data-l style={{ fontVariationSettings: `"wght" ${from}` }}>
                  {ch}
                </span>
              ))}
            </span>
          ),
        )}
      </span>
    </span>
  );
}
