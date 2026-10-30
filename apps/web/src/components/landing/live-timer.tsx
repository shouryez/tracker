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
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return (
    <span className={className} aria-hidden="true" suppressHydrationWarning>
      {mm}:{ss}
    </span>
  );
}

// DsaKaro
