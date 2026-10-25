import assert from "node:assert/strict";
import { test } from "node:test";
import { renderWeeklyEmail, type WeeklyDigest } from "./weekly-email-render.ts";

const digest: WeeklyDigest = {
  name: "Asha Rao",
  weekLabel: "20 – 26 Oct",
  solved: 12,
  solvedPrevWeek: 9,
  focusMs: 5 * 3_600_000 + 20 * 60_000,
  reviewsDone: 6,
  dueToday: 4,
  last30: Array.from({ length: 30 }, (_, i) => i % 4),
  insights: ["Graphs is your weakest topic (12/100).", "Try <script>alert(1)</script> next."],
};
const links = {
  revision: "https://upsolve.test/dashboard/revision",
  dashboard: "https://upsolve.test/dashboard",
  unsubscribe: "https://upsolve.test/api/email/unsubscribe?u=1&s=2",
  settings: "https://upsolve.test/dashboard/settings",
};

test("weekly email: subject, numbers, CTA and escaping", () => {
  const { subject, html, text } = renderWeeklyEmail(digest, links);
  assert.equal(subject, "Your week: 12 solved · 4 to revise today");
  assert.match(html, /5h 20m/);
  assert.match(html, /3 more than the week before/);
  assert.match(html, /Revise 4 today/);
  assert.match(html, /Hey Asha,/);
  assert.ok(!html.includes("<script>"));
  assert.match(html, /Try &lt;script&gt;/);
  assert.match(html, /u=1&amp;s=2/);
  assert.match(text, /Unsubscribe: https:\/\/upsolve.test\/api\/email\/unsubscribe\?u=1&s=2/);
  assert.equal((html.match(/border-radius:3px/g) ?? []).length, 30);
});

test("weekly email without reviews due points to the dashboard", () => {
  const { subject, html } = renderWeeklyEmail(
    { ...digest, dueToday: 0, solved: 0, solvedPrevWeek: 0 },
    links,
  );
  assert.equal(subject, "Your week: 0 solved, 5h 20m focused");
  assert.match(html, /a quiet week/);
  assert.match(html, /Open your dashboard/);
});
