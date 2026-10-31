import "server-only";
import { sql } from "drizzle-orm";
import { reviewUrl } from "@/components/learning";
import { bestHour } from "@/lib/daily-data";
import { getProfile } from "@/lib/data";
import { db } from "@/lib/db";
import { getLearning, getTopicTargets, masteryOf, revisionQueue } from "@/lib/learning";
import { getTodayPlan } from "@/lib/plan";
import { localDate } from "@/lib/time";
import { renderDailyReminder, type DailyReminder } from "@/lib/daily-email-render";
import { emailLinks } from "@/lib/weekly-email";

// Daily reminder email: at the user's reminder hour, only on days with revisions due or
// today's plan unfinished, at most once a day. Sent by /api/cron/daily (an hourly trigger,
// plus a daily catch-all) through Resend when RESEND_API_KEY is set.

const DAY_MS = 86_400_000;

/** Days in a row with an Accepted solve, up to today (or yesterday, if nothing yet today). */
async function streakOf(userId: string, tz: string, now: number) {
  const rows = (await db().execute(sql`
    select distinct to_char(s.submitted_at at time zone ${tz}, 'YYYY-MM-DD') as day
    from submissions s
    where s.user_id = ${userId} and s.verdict = 'AC'
      and s.submitted_at >= to_timestamp(${(now - 60 * DAY_MS) / 1000})`)) as unknown as {
    day: string;
  }[];
  const days = new Set(rows.map((r) => r.day));
  let t = now;
  if (!days.has(localDate(tz, t))) t -= DAY_MS;
  let n = 0;
  while (days.has(localDate(tz, t))) {
    n++;
    t -= DAY_MS;
  }
  return n;
}

/** Today's reminder for a user, or null when there's nothing waiting (or not onboarded). */
export async function buildReminder(
  userId: string,
  now = Date.now(),
): Promise<DailyReminder | null> {
  const profile = await getProfile(userId);
  if (!profile?.onboardedAt) return null;
  const tz = profile.timezone;
  const cap = profile.reviewCap;
  const [learning, targets, plan, streak] = await Promise.all([
    getLearning(userId),
    getTopicTargets(),
    getTodayPlan(userId, tz, cap, now),
    streakOf(userId, tz, now),
  ]);
  const queue = revisionQueue(learning, masteryOf(learning, targets, now), { tz, cap, now });
  const due = queue.today.map((p) => ({
    title: p.title,
    url: reviewUrl(p.url),
    difficulty: p.difficulty,
  }));
  const open = plan.items.filter((i) => !i.done).map((i) => ({ title: i.title, url: i.url }));
  if (due.length === 0 && open.length === 0) return null;
  return {
    name: profile.name,
    dayLabel: new Date(now).toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone: tz,
    }),
    streak,
    due,
    plan: open,
  };
}

const localHour = (tz: string, now: number) =>
  Number(
    new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone: tz }).format(
      now,
    ),
  );

/**
 * Sends today's reminders. Hourly runs send to everyone whose reminder hour has come (so a
 * missed run catches up later the same day); `all` (the daily catch-all) ignores the hour.
 * Each user is claimed for the day before sending, so overlapping runs never send twice.
 */
export async function sendDailyReminders(
  origin: string,
  opts: { all?: boolean; now?: number } = {},
): Promise<{ sent: number; skipped: number; failed: number; dryRun: boolean }> {
  const now = opts.now ?? Date.now();
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "DsaKaro <reminders@dsakaro.site>";
  const candidates = (await db().execute(sql`
    select p.user_id as "userId", u.email, p.timezone, p.reminder_hour as "reminderHour"
    from profiles p join auth.users u on u.id = p.user_id
    where p.daily_email and p.onboarded_at is not null and u.email is not null
      and (p.daily_email_sent_on is null
           or p.daily_email_sent_on < (now() at time zone p.timezone)::date)`)) as unknown as {
    userId: string;
    email: string;
    timezone: string;
    reminderHour: number | null;
  }[];

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  for (const c of candidates) {
    const tz = c.timezone || "Asia/Kolkata";
    if (!opts.all) {
      const hour = c.reminderHour ?? (await bestHour(c.userId, tz));
      if (localHour(tz, now) < hour) continue; // not yet: a later run sends it
    }
    const reminder = await buildReminder(c.userId, now);
    if (!reminder || !apiKey) {
      skipped++;
      continue;
    }
    const today = localDate(tz, now);
    const claimed = await db().execute(sql`
      update profiles set daily_email_sent_on = ${today}
      where user_id = ${c.userId}
        and (daily_email_sent_on is null or daily_email_sent_on < ${today}::date)
      returning user_id`);
    if ((claimed as unknown as unknown[]).length === 0) continue; // another run got it

    const links = emailLinks(origin, c.userId, "daily");
    const { subject, html, text } = renderDailyReminder(reminder, {
      revision: links.revision,
      today: `${origin}/dashboard/today`,
      settings: `${origin}/dashboard/settings#reminders`,
      unsubscribe: links.unsubscribe,
    });
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [c.email],
        subject,
        html,
        text,
        headers: {
          "List-Unsubscribe": `<${links.unsubscribe}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      }),
    });
    if (res.ok) sent++;
    else {
      failed++;
      // Give the day back so the next run retries.
      await db().execute(sql`
        update profiles set daily_email_sent_on = null
        where user_id = ${c.userId} and daily_email_sent_on = ${today}::date`);
      console.error("[daily-email] send failed", res.status, await res.text().catch(() => ""));
    }
  }
  return { sent, skipped, failed, dryRun: !apiKey };
}
