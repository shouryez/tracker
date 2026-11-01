import assert from "node:assert/strict";
import { test } from "node:test";
import { localCalendar } from "./stats.ts";

const local = { sinceKey: "2026-10-01", todayKey: "2026-11-02" };

test("stored submissions on your own days replace the platform's UTC calendar", () => {
  const cal = localCalendar(
    [{ platform: "leetcode", calendar: { "2026-09-20": 4, "2026-11-01": 2 } }],
    { ...local, byPlatform: { leetcode: { "2026-11-02": 2 } } },
  );
  // A 1 am IST solve: UTC said 1 Nov, your day says 2 Nov. Older days stay from the calendar.
  assert.deepEqual(cal, { "2026-09-20": 4, "2026-11-02": 2 });
});

test("too few stored submissions: keep the platform calendar", () => {
  const cal = localCalendar(
    [{ platform: "leetcode", calendar: { "2026-10-10": 10, "2026-10-11": 10 } }],
    { ...local, byPlatform: { leetcode: { "2026-10-11": 1 } } },
  );
  assert.deepEqual(cal, { "2026-10-10": 10, "2026-10-11": 10 });
});
