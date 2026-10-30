// Formatting shared by server and client components.

/** 42 min → "42m", 125 min → "2h 5m". */
export function formatDuration(ms: number): string {
  const m = Math.round(ms / 60_000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return m % 60 ? `${h}h ${m % 60}m` : `${h}h`;
}

// DsaKaro
