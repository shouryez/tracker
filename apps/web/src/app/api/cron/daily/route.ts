import { sendDailyReminders } from "@/lib/daily-email";

export const maxDuration = 300;

/**
 * Sends daily reminder emails, called with `Authorization: Bearer $CRON_SECRET`:
 * hourly by GitHub Actions (each user at their reminder hour), and once a day by Vercel
 * with ?all=1 to catch anyone not reached yet. Without RESEND_API_KEY it only counts.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret)
    return Response.json({ ok: false, error: "CRON_SECRET is not set" }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  const result = await sendDailyReminders(url.origin, { all: url.searchParams.get("all") === "1" });
  return Response.json({ ok: true, ...result });
}
