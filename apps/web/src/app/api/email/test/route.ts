import { sql } from "drizzle-orm";
import { buildReminder } from "@/lib/daily-email";
import { renderDailyReminder, type DailyReminder } from "@/lib/daily-email-render";
import { db } from "@/lib/db";
import { buildDigest, emailLinks } from "@/lib/weekly-email";
import { renderWeeklyEmail } from "@/lib/weekly-email-render";

/**
 * Sends a test daily reminder and weekly email to ONE existing user, at their own address,
 * marked [Test]. Admin only (Authorization: Bearer $CRON_SECRET). Doesn't count as the
 * day's reminder. When nothing is due, the reminder uses a short example list.
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey)
    return Response.json({ ok: false, error: "RESEND_API_KEY is not set" }, { status: 503 });
  const { to } = (await request.json().catch(() => ({}))) as { to?: unknown };
  if (typeof to !== "string")
    return Response.json({ ok: false, error: "Send { to }" }, { status: 400 });

  const [user] = (await db().execute(sql`
    select u.id, u.email from auth.users u where lower(u.email) = lower(${to}) limit 1`)) as unknown as {
    id: string;
    email: string;
  }[];
  if (!user)
    return Response.json(
      { ok: false, error: "No DsaKaro account has that email" },
      { status: 404 },
    );

  const origin = new URL(request.url).origin;
  const from = process.env.EMAIL_FROM ?? "DsaKaro <reminders@dsakaro.site>";
  const send = async (subject: string, html: string, text: string) => {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [user.email], subject: `[Test] ${subject}`, html, text }),
    });
    return { ok: res.ok, status: res.status, body: res.ok ? undefined : await res.text() };
  };

  const example: DailyReminder = {
    name: null,
    dayLabel: new Date().toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone: "Asia/Kolkata",
    }),
    streak: 3,
    due: [
      {
        title: "Coin Change (example)",
        url: "https://leetcode.com/problems/coin-change/",
        difficulty: "medium",
      },
    ],
    plan: [{ title: "Two Sum (example)", url: null }],
  };
  const reminder = (await buildReminder(user.id)) ?? example;
  const dl = emailLinks(origin, user.id, "daily");
  const daily = renderDailyReminder(reminder, {
    revision: dl.revision,
    today: `${origin}/dashboard/today`,
    settings: `${origin}/dashboard/settings#reminders`,
    unsubscribe: dl.unsubscribe,
  });
  const results: Record<string, unknown> = {
    daily: await send(daily.subject, daily.html, daily.text),
  };

  const digest = await buildDigest(user.id);
  if (digest) {
    const weekly = renderWeeklyEmail(digest, emailLinks(origin, user.id));
    results.weekly = await send(weekly.subject, weekly.html, weekly.text);
  } else results.weekly = { skipped: "not onboarded" };

  return Response.json({ ok: true, from, usedExample: reminder === example, results });
}
