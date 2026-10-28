import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { sql } from "drizzle-orm";
import { suggestNext, type Difficulty } from "@upsolve/core";
import { getProfile } from "@/lib/data";
import { db } from "@/lib/db";
import {
  getLearning,
  getNextCandidates,
  getTopicTargets,
  masteryOf,
  revisionQueue,
} from "@/lib/learning";
import { localDate, localDay } from "@/lib/time";
import { renderWeeklyEmail, type WeeklyDigest } from "@/lib/weekly-email-render";

// Weekly email (PLAN.md Phase 4). Sent by /api/cron/weekly through Resend's
// HTTP API when RESEND_API_KEY is set; previewable at /api/email/weekly/preview.

const DAY_MS = 86_400_000;

export async function buildDigest(userId: string, now = Date.now()): Promise<WeeklyDigest | null> {
  const profile = await getProfile(userId);
  if (!profile?.onboardedAt) return null;
  const tz = profile.timezone;
  const today = localDay(tz, now);
  const weekStart = today.start - 7 * DAY_MS;

  const [learning, targets, candidates, counts, perDay] = await Promise.all([
    getLearning(userId),
    getTopicTargets(),
    getNextCandidates(userId),
    db().execute(sql`
      select
        (select count(distinct pp.problem_id)::int from submissions s
          join platform_problems pp on pp.id = s.platform_problem_id
          where s.user_id = ${userId} and s.verdict = 'AC'
            and s.submitted_at >= to_timestamp(${weekStart / 1000})
            and s.submitted_at < to_timestamp(${today.start / 1000})) as solved,
        (select count(distinct pp.problem_id)::int from submissions s
          join platform_problems pp on pp.id = s.platform_problem_id
          where s.user_id = ${userId} and s.verdict = 'AC'
            and s.submitted_at >= to_timestamp(${(weekStart - 7 * DAY_MS) / 1000})
            and s.submitted_at < to_timestamp(${weekStart / 1000})) as "prevSolved",
        (select coalesce(sum(active_ms), 0)::float8 from practice_sessions
          where user_id = ${userId}
            and started_at >= to_timestamp(${weekStart / 1000})
            and started_at < to_timestamp(${today.start / 1000})) as "focusMs"`),
    db().execute(sql`
      select to_char(s.submitted_at at time zone ${tz}, 'YYYY-MM-DD') as day,
             count(distinct s.platform_problem_id)::int as n
      from submissions s
      where s.user_id = ${userId} and s.verdict = 'AC'
        and s.submitted_at >= to_timestamp(${(today.start - 30 * DAY_MS) / 1000})
        and s.submitted_at < to_timestamp(${today.start / 1000})
      group by 1`),
  ]);

  const c = (counts as unknown as { solved: number; prevSolved: number; focusMs: number }[])[0]!;
  const byDay = new Map(
    (perDay as unknown as { day: string; n: number }[]).map((r) => [r.day, r.n]),
  );
  const last30 = Array.from(
    { length: 30 },
    (_, i) => byDay.get(localDate(tz, today.start - (30 - i) * DAY_MS + DAY_MS / 2)) ?? 0,
  );

  const mastery = masteryOf(learning, targets, now);
  const queue = revisionQueue(learning, mastery, { tz, cap: profile.reviewCap, now });
  const reviewsDone = learning.reduce(
    (n, p) => n + p.state.history.filter((h) => h.at >= weekStart && h.at < today.start).length,
    0,
  );

  const insights: string[] = [];
  const practised = mastery.filter((m) => m.solved > 0);
  if (practised.length > 1) {
    const weakest = practised.reduce((a, b) => (b.score < a.score ? b : a));
    const strongest = practised.reduce((a, b) => (b.score > a.score ? b : a));
    insights.push(
      `${weakest.label} is your weakest topic at ${weakest.score}/100; ${strongest.label} leads at ${strongest.score}.`,
    );
  }
  if (queue.today.length + queue.backlog > 0) {
    insights.push(
      `${queue.today.length + queue.backlog} problem${queue.today.length + queue.backlog === 1 ? " is" : "s are"} due for revision. Re-solving them with the extension proves you still can.`,
    );
  }
  const solvedBy: Record<Difficulty, number> = { easy: 0, medium: 0, hard: 0 };
  for (const p of learning) if (p.difficulty) solvedBy[p.difficulty]++;
  const [next] = suggestNext(candidates, mastery, solvedBy, 1);
  if (next) insights.push(`Try next: ${next.title} (${next.sheet}). ${next.reason}.`);
  if (insights.length === 0)
    insights.push("Connect a platform or follow a sheet to get personal tips here.");

  const fmt = (ms: number) =>
    new Date(ms).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: tz });
  return {
    name: profile.name,
    weekLabel: `${fmt(weekStart + DAY_MS / 2)} – ${fmt(today.start - DAY_MS / 2)}`,
    solved: c.solved,
    solvedPrevWeek: c.prevSolved,
    focusMs: c.focusMs,
    reviewsDone,
    dueToday: queue.today.length,
    last30,
    insights: insights.slice(0, 3),
  };
}

// ---------------------------------------------------------------- unsubscribe links

function secret(): string | null {
  return process.env.CRON_SECRET || null;
}

export function unsubscribeSignature(userId: string): string | null {
  const key = secret();
  return key ? createHmac("sha256", key).update(`unsubscribe:${userId}`).digest("base64url") : null;
}

export function verifyUnsubscribe(userId: string, sig: string): boolean {
  const expected = unsubscribeSignature(userId);
  if (!expected || expected.length !== sig.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
}

export function emailLinks(origin: string, userId: string) {
  const sig = unsubscribeSignature(userId) ?? "";
  return {
    revision: `${origin}/dashboard/revision`,
    dashboard: `${origin}/dashboard`,
    settings: `${origin}/dashboard/settings#learning`,
    unsubscribe: `${origin}/api/email/unsubscribe?u=${userId}&s=${sig}`,
  };
}

// ---------------------------------------------------------------- sending

export async function sendWeeklyEmails(
  origin: string,
): Promise<{ sent: number; skipped: number; failed: number; dryRun: boolean }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "DsaKaro <weekly@dsakaro.site>";
  const recipients = (await db().execute(sql`
    select p.user_id as "userId", u.email
    from profiles p join auth.users u on u.id = p.user_id
    where p.weekly_email and p.onboarded_at is not null and u.email is not null`)) as unknown as {
    userId: string;
    email: string;
  }[];

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  for (const r of recipients) {
    const digest = await buildDigest(r.userId);
    // Nothing happened and nothing is due: don't send an empty email.
    if (!digest || (digest.solved === 0 && digest.focusMs === 0 && digest.dueToday === 0)) {
      skipped++;
      continue;
    }
    if (!apiKey) {
      skipped++;
      continue;
    }
    const links = emailLinks(origin, r.userId);
    const { subject, html, text } = renderWeeklyEmail(digest, links);
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [r.email],
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
      console.error("[weekly-email] send failed", res.status, await res.text().catch(() => ""));
    }
  }
  return { sent, skipped, failed, dryRun: !apiKey };
}
