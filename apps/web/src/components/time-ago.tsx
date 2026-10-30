"use client";

import { useEffect, useState } from "react";

function format(date: Date, now: number) {
  const s = Math.max(0, Math.round((now - date.getTime()) / 1000));
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return d < 30
    ? `${d}d ago`
    : date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

/** Relative time that keeps itself current. Server and client may differ by a few seconds. */
export function TimeAgo({ date }: { date: Date | string }) {
  const d = typeof date === "string" ? new Date(date) : date;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  return (
    <time dateTime={d.toISOString()} title={d.toLocaleString()} suppressHydrationWarning>
      {format(d, now)}
    </time>
  );
}

// DsaKaro
