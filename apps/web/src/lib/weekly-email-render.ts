// The weekly email as HTML + plain text (DESIGN.md §9.5). Pure; unit-tested.
// Email clients need tables and inline styles, so this doesn't use the app's CSS.

export type WeeklyDigest = {
  name: string | null;
  /** "20 – 26 Oct" */
  weekLabel: string;
  solved: number;
  solvedPrevWeek: number;
  focusMs: number;
  reviewsDone: number;
  dueToday: number;
  /** Solves per day for the last 30 days, oldest first. */
  last30: number[];
  insights: string[];
};

const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );

function hours(ms: number): string {
  const m = Math.round(ms / 60_000);
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ""}`;
}

const PIXEL = ["#26262f", "#4a5a12", "#7d9a17", "#b4dc22", "#d7ff3a"];
function level(n: number, max: number): number {
  if (n === 0) return 0;
  return Math.min(4, Math.max(1, Math.ceil((n / Math.max(1, max)) * 4)));
}

export function renderWeeklyEmail(
  d: WeeklyDigest,
  links: { revision: string; dashboard: string; unsubscribe: string; settings: string },
): { subject: string; html: string; text: string } {
  const first = d.name?.split(" ")[0] ?? "there";
  const delta = d.solved - d.solvedPrevWeek;
  const deltaText =
    d.solvedPrevWeek === 0 && d.solved === 0
      ? "a quiet week"
      : delta === 0
        ? "same as the week before"
        : `${Math.abs(delta)} ${delta > 0 ? "more" : "fewer"} than the week before`;
  const subject =
    d.dueToday > 0
      ? `Your week: ${d.solved} solved · ${d.dueToday} to revise today`
      : `Your week: ${d.solved} solved, ${hours(d.focusMs)} focused`;
  const max = Math.max(...d.last30);
  const cta =
    d.dueToday > 0
      ? { href: links.revision, label: `Revise ${d.dueToday} today` }
      : { href: links.dashboard, label: "Open your dashboard" };

  const stat = (value: string, label: string) => `
      <td style="padding:0 18px 0 0;vertical-align:top">
        <div style="font:600 30px/1 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;letter-spacing:-.03em;color:#f4f4f6">${esc(value)}</div>
        <div style="font:400 11px/1.4 ui-monospace,Consolas,monospace;color:#a3a3b0;text-transform:uppercase;letter-spacing:.06em;padding-top:6px">${esc(label)}</div>
      </td>`;

  const pixels = d.last30
    .map(
      (n) =>
        `<td style="width:12px;height:12px;padding:0 3px 0 0"><div style="width:12px;height:12px;border-radius:3px;background:${PIXEL[level(n, max)]}"></div></td>`,
    )
    .join("");

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#f2f2f4">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f2f4;padding:24px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;border-radius:18px;overflow:hidden;background:#ffffff">
  <tr><td style="background:#0b0b0f;padding:28px 28px 24px">
    <div style="font:500 11px/1 ui-monospace,Consolas,monospace;color:#d7ff3a;letter-spacing:.1em;text-transform:uppercase">DsaKaro · ${esc(d.weekLabel)}</div>
    <div style="font:600 26px/1.15 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;letter-spacing:-.03em;color:#f4f4f6;padding:12px 0 22px">Hey ${esc(first)},<br><span style="color:#686876">${esc(deltaText)}.</span></div>
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      ${stat(String(d.solved), "solved")}
      ${stat(hours(d.focusMs), "focused")}
      ${stat(String(d.reviewsDone), "reviews")}
    </tr></table>
    <table role="presentation" cellpadding="0" cellspacing="0" style="padding-top:22px"><tr>${pixels}</tr></table>
    <div style="font:400 10.5px/1.4 ui-monospace,Consolas,monospace;color:#686876;padding-top:8px">last 30 days</div>
  </td></tr>
  <tr><td style="padding:24px 28px 8px;font:400 14.5px/1.55 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#2a2a33">
    ${d.insights.map((i) => `<p style="margin:0 0 12px;padding-left:14px;border-left:3px solid #d7ff3a">${esc(i)}</p>`).join("")}
  </td></tr>
  <tr><td style="padding:8px 28px 28px">
    <a href="${esc(cta.href)}" style="display:inline-block;background:#d7ff3a;color:#0b0b0f;font:600 14px/1 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;padding:13px 20px;border-radius:999px;text-decoration:none">${esc(cta.label)} →</a>
  </td></tr>
  <tr><td style="padding:16px 28px;border-top:1px solid #ececf0;font:400 11.5px/1.5 ui-monospace,Consolas,monospace;color:#8a8a96">
    You get this every Monday. <a href="${esc(links.settings)}" style="color:#8a8a96">Settings</a> · <a href="${esc(links.unsubscribe)}" style="color:#8a8a96">Unsubscribe</a>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;

  const text = [
    `DsaKaro · ${d.weekLabel}`,
    "",
    `Hey ${first}, ${deltaText}.`,
    `${d.solved} solved · ${hours(d.focusMs)} focused · ${d.reviewsDone} reviews`,
    "",
    ...d.insights.map((i) => `- ${i}`),
    "",
    `${cta.label}: ${cta.href}`,
    "",
    `Unsubscribe: ${links.unsubscribe}`,
  ].join("\n");

  return { subject, html, text };
}

// DsaKaro
