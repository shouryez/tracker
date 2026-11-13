import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { localDate } from "@/lib/time";

/**
 * Calendar subscribe (FEATURES-PLAN F4): an ICS feed of your revision load and the contests
 * on your platforms, for Google Calendar or a phone calendar. The link is signed with the
 * server secret (like email unsubscribe links), so no table is needed. The feed only says
 * how many revisions are due each day, never which problems.
 */

function secret() {
  return process.env.CRON_SECRET || null;
}

export function calendarSignature(userId: string) {
  const key = secret();
  return key ? createHmac("sha256", key).update(`calendar:${userId}`).digest("base64url") : null;
}

export function verifyCalendar(userId: string, sig: string) {
  const expected = calendarSignature(userId);
  if (!expected || expected.length !== sig.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
}

export function calendarUrl(origin: string, userId: string) {
  const sig = calendarSignature(userId);
  return sig ? `${origin}/api/calendar?u=${userId}&s=${sig}` : null;
}

const esc = (s: string) =>
  s
    .replace(/\\/g, "\\\\")
    .replace(/([,;])/g, "\\$1")
    .replace(/\n/g, "\\n");
const stamp = (ms: number) =>
  new Date(ms)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
const dateOnly = (d: string) => d.replace(/-/g, "");
const nextDay = (d: string) => {
  const t = Date.parse(`${d}T12:00:00Z`) + 86_400_000;
  return new Date(t).toISOString().slice(0, 10);
};

export type FeedInput = {
  tz: string;
  now: number;
  /** Due times of the problems on your ladder (overdue ones count as today). */
  dueAts: number[];
  contests: { id: string; name: string; startsAt: number; durationMin: number; url: string }[];
  origin: string;
};

export function buildIcs({ tz, now, dueAts, contests, origin }: FeedInput) {
  const today = localDate(tz, now);
  const counts = new Map<string, number>();
  for (const at of dueAts) {
    const d = at <= now ? today : localDate(tz, at);
    counts.set(d, (counts.get(d) ?? 0) + 1);
  }
  const horizon = localDate(tz, now + 30 * 86_400_000);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//DsaKaro//Revision calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:DsaKaro",
    "X-WR-CALDESC:Revisions due and upcoming contests",
    "REFRESH-INTERVAL;VALUE=DURATION:PT6H",
    "X-PUBLISHED-TTL:PT6H",
  ];
  for (const [day, n] of [...counts].sort()) {
    if (day > horizon) continue;
    lines.push(
      "BEGIN:VEVENT",
      `UID:rev-${day}@dsakaro.site`,
      `DTSTAMP:${stamp(now)}`,
      `DTSTART;VALUE=DATE:${dateOnly(day)}`,
      `DTEND;VALUE=DATE:${dateOnly(nextDay(day))}`,
      `SUMMARY:${esc(`${n} revision${n === 1 ? "" : "s"} due · DsaKaro`)}`,
      `DESCRIPTION:${esc(`Re-solve them before you forget: ${origin}/dashboard/revision`)}`,
      `URL:${origin}/dashboard/revision`,
      "TRANSP:TRANSPARENT",
      "END:VEVENT",
    );
  }
  for (const c of contests) {
    if (c.startsAt < now - 86_400_000) continue;
    lines.push(
      "BEGIN:VEVENT",
      `UID:contest-${esc(c.id)}@dsakaro.site`,
      `DTSTAMP:${stamp(now)}`,
      `DTSTART:${stamp(c.startsAt)}`,
      `DTEND:${stamp(c.startsAt + c.durationMin * 60_000)}`,
      `SUMMARY:${esc(c.name)}`,
      `DESCRIPTION:${esc(`${c.url}\nUpsolve what you miss on DsaKaro: ${origin}/dashboard/contests`)}`,
      `URL:${c.url}`,
      "BEGIN:VALARM",
      "TRIGGER:-PT30M",
      "ACTION:DISPLAY",
      `DESCRIPTION:${esc(`${c.name} starts in 30 minutes`)}`,
      "END:VALARM",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}
