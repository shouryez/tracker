"use client";

import { useEffect, useState } from "react";

/** A timer that counts up from `startSeconds`, like the extension's pill. Decorative. */
export function LiveTimer({
  startSeconds,
  className,
}: {
  startSeconds: number;
  className?: string;
}) {
  const [s, setS] = useState(startSeconds);
  useEffect(() => {
    // Respect reduced motion: show a still time.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setS((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const h = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return (
    <span className={className} aria-hidden="true" suppressHydrationWarning>
      {h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`}
    </span>
  );
}
