import { eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { profiles } from "@upsolve/db";
import { db, userTag } from "@/lib/db";
import { verifyUnsubscribe, type EmailKind } from "@/lib/weekly-email";

const NAMES: Record<EmailKind, string> = { weekly: "weekly email", daily: "daily reminder email" };

// Signed links from the weekly and daily emails (t=daily). GET asks for confirmation (link scanners
// open links); POST unsubscribes, which is also what mail apps' one-click button sends.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function page(body: string, status = 200) {
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DsaKaro email</title></head>
<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#0b0b0f;color:#f4f4f6;font:15px/1.5 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;padding:16px">
<main style="max-width:420px">${body}</main></body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

function params(request: Request) {
  const url = new URL(request.url);
  const u = url.searchParams.get("u") ?? "";
  const s = url.searchParams.get("s") ?? "";
  const kind: EmailKind = url.searchParams.get("t") === "daily" ? "daily" : "weekly";
  return UUID.test(u) && verifyUnsubscribe(u, s, kind)
    ? { userId: u, query: url.search, kind }
    : null;
}

export async function GET(request: Request) {
  const p = params(request);
  if (!p)
    return page(
      "<p>This unsubscribe link isn't valid. You can turn the email off in Settings.</p>",
      400,
    );
  return page(`<h1 style="font-size:22px;margin:0 0 8px">Stop the ${NAMES[p.kind]}?</h1>
<p style="color:#a3a3b0;margin:0 0 20px">You can turn it back on in Settings any time.</p>
<form method="post" action="/api/email/unsubscribe${p.query.replace(/"/g, "")}">
<button style="background:#c6f16b;color:#0b0b0f;border:0;border-radius:999px;padding:12px 18px;font-weight:600;font-size:14px;cursor:pointer">Unsubscribe</button>
</form>`);
}

export async function POST(request: Request) {
  const p = params(request);
  if (!p) return page("<p>This unsubscribe link isn't valid.</p>", 400);
  await db()
    .update(profiles)
    .set(p.kind === "daily" ? { dailyEmail: false } : { weeklyEmail: false })
    .where(eq(profiles.userId, p.userId));
  revalidateTag(userTag(p.userId), { expire: 0 });
  return page(`<h1 style="font-size:22px;margin:0 0 8px">Unsubscribed</h1>
<p style="color:#a3a3b0;margin:0">No more ${NAMES[p.kind]}s. Turn it back on in Settings whenever you like.</p>`);
}
