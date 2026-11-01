import assert from "node:assert/strict";
import { test } from "node:test";
import { breakState, focusElapsed, focusPhase } from "./focus.ts";

const M = 60_000;
const base = { id: "x", label: null, pausedMs: 0, banked: { focusMs: 0, awayMs: 0, switches: 0, tracked: false } };

test("pomodoro: no break on its own, the next block just continues", () => {
  const p = focusPhase("pomodoro-25", 27 * M)!;
  assert.equal(p.round, 2);
  assert.equal(p.left, 23 * M);
});

test("a break is a pause: it never counts as focus, and shows a countdown", () => {
  const f = { ...base, mode: "pomodoro-25", startedAt: 0, pausedAt: 25 * M };
  assert.equal(focusElapsed(f, 31 * M), 25 * M);
  assert.deepEqual(breakState(f, 27 * M), { length: 5 * M, left: 3 * M });
  assert.ok(breakState(f, 31 * M)!.left < 0); // over, waiting for you
  assert.equal(breakState({ ...f, mode: "stopwatch" }, 27 * M), null);
});
