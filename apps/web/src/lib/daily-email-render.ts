// The daily reminder email as HTML + plain text. Pure; unit-tested. Same look as the
// weekly email (tables and inline styles: email clients ignore the app's CSS).

export type DailyReminder = {
  name: string | null;
  /** "Sun, 2 Nov" in the user's timezone. */
  dayLabel: string;
  streak: number;
  /** Revisions due today, weakest and oldest first (already capped at the user's limit). */
  due: { title: string; url: string; difficulty: "easy" | "medium" | "hard" | null }[];
  /** Today's to-do items still open (rolled-over ones included). */
  plan: { title: string; url: string | null }[];
};

const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );

const DIFF: Record<string, string> = { easy: "#2fa86d", medium: "#d89a12", hard: "#e0485f" };
const FONT = "-apple-system,Segoe UI,Helvetica,Arial,sans-serif";
const MONO = "ui-monospace,Consolas,monospace";
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function renderDailyReminder(
  d: DailyReminder,
  links: { revision: string; today: string; settings: string; unsubscribe: string },
): { subject: string; html: string; text: string } {
  const first = d.name?.split(" ")[0] ?? "there";
  const parts = [
    d.due.length > 0 && plural(d.due.length, "revision") + " due",
    d.plan.length > 0 && plural(d.plan.length, "task") + " left today",
  ].filter(Boolean) as string[];
  const subject = `${parts.join(" · ")}${d.streak > 1 ? ` · ${d.streak}-day streak` : ""}`;
  const headline =
    d.streak > 1 ? `Keep your ${d.streak}-day streak going.` : "Twenty minutes is enough today.";
  const cta =
    d.due.length > 0
      ? { href: links.revision, label: `Revise ${plural(d.due.length, "problem")}` }
      : { href: links.today, label: "Open today's plan" };

  const row = (title: string, href: string | null, tag: string | null, color: string) => `
      <tr><td style="padding:9px 0;border-top:1px solid #ececf0;font:500 14px/1.4 ${FONT};color:#1b1b22">
        ${href ? `<a href="${esc(href)}" style="color:#1b1b22;text-decoration:none">${esc(title)}</a>` : esc(title)}
        ${tag ? `<span style="font:600 10.5px/1 ${MONO};color:${color};text-transform:uppercase;letter-spacing:.06em;padding-left:8px">${esc(tag)}</span>` : ""}
      </td></tr>`;
  const section = (label: string, rows: string) =>
    rows
      ? `<tr><td style="padding:22px 28px 0">
    <div style="font:500 11px/1 ${MONO};color:#8a8a96;letter-spacing:.08em;text-transform:uppercase;padding-bottom:8px">${esc(label)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
  </td></tr>`
      : "";

  const dueRows = d.due
    .map((p) => row(p.title, p.url, p.difficulty, DIFF[p.difficulty ?? ""] ?? "#8a8a96"))
    .join("");
  const planRows = d.plan
    .slice(0, 6)
    .map((p) => row(p.title, p.url, null, ""))
    .join("");
  const more =
    d.plan.length > 6
      ? `<tr><td style="padding:8px 0 0;font:400 12.5px/1.4 ${FONT};color:#8a8a96">+${d.plan.length - 6} more on your list</td></tr>`
      : "";

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#f2f2f4">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f2f4;padding:24px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;border-radius:18px;overflow:hidden;background:#ffffff">
  <tr><td style="background:#0b0b0f;padding:26px 28px 24px">
    <div style="font:500 11px/1 ${MONO};color:#c6f16b;letter-spacing:.1em;text-transform:uppercase">DsaKaro · ${esc(d.dayLabel)}</div>
    <div style="font:600 25px/1.2 ${FONT};letter-spacing:-.03em;color:#f4f4f6;padding-top:12px">Hey ${esc(first)},<br><span style="color:#8a8a96">${esc(headline)}</span></div>
  </td></tr>
  ${section("Revise today", dueRows)}
  ${section("Still on today's list", planRows + more)}
  <tr><td style="padding:24px 28px 28px">
    <a href="${esc(cta.href)}" style="display:inline-block;background:#c6f16b;color:#0b0b0f;font:600 14px/1 ${FONT};padding:13px 20px;border-radius:999px;text-decoration:none">${esc(cta.label)} →</a>
  </td></tr>
  <tr><td style="padding:16px 28px;border-top:1px solid #ececf0;font:400 11.5px/1.5 ${MONO};color:#8a8a96">
    One email a day at your reminder hour, only when something is waiting. <a href="${esc(links.settings)}" style="color:#8a8a96">Change the time</a> · <a href="${esc(links.unsubscribe)}" style="color:#8a8a96">Unsubscribe</a>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;

  const text = [
    `DsaKaro · ${d.dayLabel}`,
    "",
    `Hey ${first}, ${headline}`,
    ...(d.due.length ? ["", "Revise today:", ...d.due.map((p) => `- ${p.title}: ${p.url}`)] : []),
    ...(d.plan.length
      ? ["", "Still on today's list:", ...d.plan.slice(0, 6).map((p) => `- ${p.title}`)]
      : []),
    "",
    `${cta.label}: ${cta.href}`,
    "",
    `Change the time: ${links.settings}`,
    `Unsubscribe: ${links.unsubscribe}`,
  ].join("\n");

  return { subject, html, text };
}
