import assert from "node:assert/strict";
import { test } from "node:test";
import { buddyLevel } from "./buddies.ts";
import { studyDay } from "./time.ts";

const IST = "Asia/Kolkata";
const at = (iso: string) => Date.parse(iso);

test("study day: midnight reset by default", () => {
  const d = studyDay(IST, at("2026-11-02T01:30:00+05:30"));
  assert.equal(d.start, at("2026-11-02T00:00:00+05:30"));
});

test("study day: a 4 am reset keeps 1:30 am on the day before", () => {
  const late = studyDay(IST, at("2026-11-02T01:30:00+05:30"), 4);
  assert.equal(late.start, at("2026-11-01T04:00:00+05:30"));
  assert.equal(late.end, at("2026-11-02T04:00:00+05:30"));
  const morning = studyDay(IST, at("2026-11-02T09:00:00+05:30"), 4);
  assert.equal(morning.start, at("2026-11-02T04:00:00+05:30"));
});

test("buddy levels build up with the session", () => {
  const m = 60_000;
  assert.equal(buddyLevel("idle", 0), "idle");
  assert.equal(buddyLevel("paused", 200 * m), "paused");
  assert.equal(buddyLevel("studying", 10 * m), 1);
  assert.equal(buddyLevel("studying", 60 * m), 2);
  assert.equal(buddyLevel("studying", 125 * m), 3);
  assert.equal(buddyLevel("studying", 190 * m), 4);
});
