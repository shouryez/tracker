import assert from "node:assert/strict";
import { test } from "node:test";
import { renderDailyReminder, type DailyReminder } from "./daily-email-render.ts";

const links = {
  revision: "https://dsakaro.site/dashboard/revision",
  today: "https://dsakaro.site/dashboard/today",
  settings: "https://dsakaro.site/dashboard/settings#reminders",
  unsubscribe: "https://dsakaro.site/api/email/unsubscribe?u=x&s=y&t=daily",
};

const reminder: DailyReminder = {
  name: "Asha Rao",
  dayLabel: "Sun, 2 Nov",
  streak: 12,
  due: [
    {
      title: "Coin Change",
      url: "https://leetcode.com/problems/coin-change/?upsolve=review",
      difficulty: "medium",
    },
    {
      title: "Two Sum <b>",
      url: "https://leetcode.com/problems/two-sum/?upsolve=review",
      difficulty: "easy",
    },
  ],
  plan: Array.from({ length: 8 }, (_, i) => ({ title: `Task ${i + 1}`, url: null })),
};

test("daily reminder: subject counts what's waiting, body lists it, escapes titles", () => {
  const { subject, html, text } = renderDailyReminder(reminder, links);
  assert.equal(subject, "2 revisions due · 8 tasks left today · 12-day streak");
  assert.match(html, /Keep your 12-day streak going/);
  assert.match(html, /Coin Change/);
  assert.match(html, /Two Sum &lt;b&gt;/);
  assert.doesNotMatch(html, /Two Sum <b>/);
  assert.match(html, /\+2 more on your list/);
  assert.match(html, /Revise 2 problems →/);
  assert.match(text, /Unsubscribe: https:\/\/dsakaro\.site\/api\/email\/unsubscribe/);
});

test("daily reminder: only today's list, no streak", () => {
  const { subject, html } = renderDailyReminder(
    { ...reminder, streak: 0, due: [], plan: [{ title: "OS notes", url: null }] },
    links,
  );
  assert.equal(subject, "1 task left today");
  assert.match(html, /Open today&#39;s plan →|Open today's plan →/);
  assert.doesNotMatch(html, /Revise today/);
});
