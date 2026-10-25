// Day boundaries in the user's own timezone. Pure; unit-tested.

const DAY_MS = 86_400_000;

/** UTC offset of `tz` at `at`, in ms (IST → +19 800 000). */
export function tzOffsetMs(tz: string, at: number): number {
  const name = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "longOffset" })
    .formatToParts(at)
    .find((p) => p.type === "timeZoneName")?.value;
  const m = /GMT([+-])(\d{2}):(\d{2})/.exec(name ?? "");
  if (!m) return 0; // "GMT" alone = UTC
  return (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 3_600_000 + Number(m[3]) * 60_000);
}

/** Start and end (exclusive) of the local day containing `now`, as epoch ms. */
export function localDay(tz: string, now: number): { start: number; end: number } {
  const offset = tzOffsetMs(tz, now);
  const start = Math.floor((now + offset) / DAY_MS) * DAY_MS - offset;
  return { start, end: start + DAY_MS };
}

/** "YYYY-MM-DD" of `at` in `tz`. */
export function localDate(tz: string, at: number): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

/**
 * The current time for a request-time server component. These render once per
 * request (after `connection()` in getCurrentUser), so reading the clock is
 * safe there; the React lint rule only knows about re-rendering client code.
 */
export function requestNow(): number {
  return Date.now();
}
