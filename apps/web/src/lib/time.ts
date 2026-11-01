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

/**
 * The study day around `now`: like localDay, but it ends at `resetHour` local time instead of
 * midnight (Settings → "Day resets at"), so a 1 am session can still count for "today".
 */
export function studyDay(tz: string, now: number, resetHour = 0): { start: number; end: number } {
  const shift = resetHour * 3_600_000;
  const d = localDay(tz, now - shift);
  return { start: d.start + shift, end: d.end + shift };
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

/** Start of the local week (Monday 00:00 in `tz`) containing `now`, as epoch ms. */
export function localWeekStart(tz: string, now: number): number {
  const { start } = localDay(tz, now);
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" }).format(now);
  const sinceMonday = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(weekday);
  return start - Math.max(0, sinceMonday) * DAY_MS;
}
