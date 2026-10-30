import { sendWeeklyEmails } from "@/lib/weekly-email";

export const maxDuration = 300;

/**
 * Sends the weekly email to everyone who has it on. Called every Monday by the
 * scheduler (vercel.json) with `Authorization: Bearer $CRON_SECRET`. Without
 * RESEND_API_KEY it does a dry run and only reports counts.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret)
    return Response.json({ ok: false, error: "CRON_SECRET is not set" }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const result = await sendWeeklyEmails(new URL(request.url).origin);
  return Response.json({ ok: true, ...result });
}

// DsaKaro
