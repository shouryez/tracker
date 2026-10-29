"use client";

import { useEffect, useRef, useState } from "react";
import NumberFlow from "@number-flow/react";

const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Rolling number. Server-renders the real value; the first time it scrolls into view it
 * rolls up from 0, and it re-rolls between values when `value` changes (e.g. after a sync).
 * Reduced motion: instant updates.
 */
export function NumberTicker({
  value,
  decimals = 0,
  suffix,
  className,
  roll = true,
}: {
  value: number;
  decimals?: number;
  suffix?: string;
  className?: string;
  /** Roll up from 0 the first time it's seen. Off: start at `value`, only roll on changes. */
  roll?: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(value);
  const [animated, setAnimated] = useState(true);
  const [rolled, setRolled] = useState(!roll);

  useEffect(() => {
    const el = ref.current;
    if (!el || rolled || value === 0 || reduced()) return;
    let settle = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        io.disconnect();
        setAnimated(false);
        setShown(0);
        // Whatever happens to frames (background tab), land on the real number.
        settle = window.setTimeout(() => {
          setAnimated(true);
          setRolled(true);
        }, 400);
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            setAnimated(true);
            setShown(value);
            setRolled(true);
          }),
        );
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      clearTimeout(settle);
    };
  }, [value, rolled]);

  // After the first roll, follow value changes directly.
  const display = rolled ? value : shown;

  return (
    <span ref={ref} className={className}>
      <NumberFlow
        value={display}
        animated={animated}
        locales="en-IN"
        format={{ minimumFractionDigits: decimals, maximumFractionDigits: decimals }}
        suffix={suffix}
        transformTiming={{ duration: 900, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }}
        spinTiming={{ duration: 900, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }}
        respectMotionPreference
      />
    </span>
  );
}
