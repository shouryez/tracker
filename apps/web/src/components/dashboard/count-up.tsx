"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Counts from 0 to `value` once it scrolls into view (≈700 ms, ease-out).
 * Server-renders the final value, so there's no layout shift and no-JS still reads right.
 */
export function CountUp({
  value,
  decimals = 0,
  className,
}: {
  value: number;
  decimals?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(value);

  useEffect(() => {
    const el = ref.current;
    if (!el || value === 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    let settle = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const step = () => {
          // Read the clock here: the rAF timestamp can lag performance.now() in some browsers.
          const p = Math.min(1, Math.max(0, (performance.now() - start) / 700));
          setShown(value * (1 - (1 - p) ** 3));
          if (p < 1) frame = requestAnimationFrame(step);
        };
        setShown(0);
        frame = requestAnimationFrame(step);
        // Whatever happens to frames (background tab), land on the real number.
        settle = window.setTimeout(() => setShown(value), 900);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
      clearTimeout(settle);
    };
  }, [value]);

  return (
    <span ref={ref} className={className}>
      {shown.toLocaleString("en-IN", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
    </span>
  );
}
