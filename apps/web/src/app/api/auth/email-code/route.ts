import { createClient } from "@supabase/supabase-js";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { supabaseUrl } from "@/lib/env";
import { safeNextPath } from "@/lib/safe-next";

// Sign-in / sign-up by email. Supabase makes the one-time code and link (admin
// generateLink, which also creates the user on sign-up); we send the email through Resend
// ourselves, so it always shows the 6-digit code, whatever the dashboard template says.

const Body = z.object({
  email: z.email().max(254),
  mode: z.enum(["login", "signup"]),
  next: z.string().max(300).optional(),
});

/** Best-effort per-instance limit on top of the per-email cooldown below. */
const hits = new Map<string, number[]>();
function tooMany(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 10 * 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 8;
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function render(code: string, link: string, signup: boolean) {
  const what = signup ? "create your account" : "sign in";
  const subject = `Your DsaKaro code: ${code}`;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#f2f2f4">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f2f4;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;border-radius:18px;overflow:hidden;background:#ffffff">
  <tr><td style="background:#0b0b0f;padding:24px 28px">
    <div style="font:500 11px/1 ui-monospace,Consolas,monospace;color:#d7ff3a;letter-spacing:.1em;text-transform:uppercase">DsaKaro</div>
    <div style="font:600 22px/1.25 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#f4f4f6;padding-top:10px">Your code to ${what}</div>
  </td></tr>
  <tr><td style="padding:26px 28px 6px">
    <div style="font:700 36px/1 ui-monospace,Consolas,monospace;letter-spacing:.3em;color:#0b0b0f;background:#f2f2f4;border-radius:14px;padding:18px 0;text-align:center">${esc(code)}</div>
    <p style="font:400 14px/1.55 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#3a3a44;margin:18px 0 0">Type it on the DsaKaro page. It works once and expires in 1 hour.</p>
  </td></tr>
  <tr><td style="padding:14px 28px 26px;font:400 13px/1.55 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#6a6a76">
    Or <a href="${esc(link)}" style="color:#0b0b0f">${what} with this link</a>.
  </td></tr>
  <tr><td style="padding:14px 28px;border-top:1px solid #ececf0;font:400 11.5px/1.5 ui-monospace,Consolas,monospace;color:#8a8a96">
    Didn't ask for this? Ignore this email; nothing happens without the code.
  </td></tr>
</table></td></tr></table></body></html>`;
  const text = `Your DsaKaro code: ${code}\n\nType it on the DsaKaro page. It works once and expires in 1 hour.\n\nOr ${what} with this link: ${link}\n\nDidn't ask for this? Ignore this email.`;
  return { subject, html, text };
}

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false, error: "Enter a valid email." }, { status: 400 });
  const email = parsed.data.email.trim().toLowerCase();
  const signup = parsed.data.mode === "signup";
  const next = safeNextPath(parsed.data.next ?? null);

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (tooMany(ip))
    return Response.json({ ok: false, error: "Too many codes requested. Try again in a few minutes." }, { status: 429 });

  const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const apiKey = process.env.RESEND_API_KEY;
  if (!serviceKey || !apiKey || !supabaseUrl)
    return Response.json({ ok: false, error: "Email sign-in isn't set up yet. Use Google." }, { status: 503 });

  const [user] = (await db().execute(sql`
    select id,
      greatest(coalesce(recovery_sent_at, 'epoch'), coalesce(confirmation_sent_at, 'epoch'))
        > now() - interval '55 seconds' as recent
    from auth.users where lower(email) = ${email} limit 1`)) as unknown as {
    id: string;
    recent: boolean;
  }[];
  // Signing in never creates an account; that's what sign-up is for.
  if (!user && !signup) return Response.json({ ok: false, noAccount: true }, { status: 404 });
  if (user?.recent)
    return Response.json({ ok: false, error: "A code was just sent. Check your inbox.", wait: 55 }, { status: 429 });

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  const props = data?.properties;
  if (error || !props?.email_otp || !props.hashed_token) {
    console.error("[email-code] generateLink failed", error?.message);
    return Response.json({ ok: false, error: "Couldn't create a code. Try again, or use Google." }, { status: 502 });
  }

  const origin = new URL(request.url).origin;
  const link = `${origin}/auth/callback?token_hash=${encodeURIComponent(props.hashed_token)}&type=${props.verification_type}&next=${encodeURIComponent(next)}`;
  const { subject, html, text } = render(props.email_otp, link, signup && !user);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.AUTH_EMAIL_FROM ?? "DsaKaro <no-reply@dsakaro.site>",
      to: [email],
      subject,
      html,
      text,
    }),
  });
  if (!res.ok) {
    console.error("[email-code] send failed", res.status, await res.text().catch(() => ""));
    return Response.json({ ok: false, error: "Couldn't send the email. Try again, or use Google." }, { status: 502 });
  }
  return Response.json({ ok: true });
}
