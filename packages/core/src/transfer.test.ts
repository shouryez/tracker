import assert from "node:assert/strict";
import { test } from "node:test";
import { foldEvents, isSibling, mainPattern, type ReviewEvent } from "./index.ts";

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 0, 1);
const solo = (day: number): ReviewEvent => ({
  kind: "solve",
  at: T0 + day * DAY,
  proven: true,
  independence: "solo",
  activeMs: 600_000,
});
const transfer = (day: number): ReviewEvent => ({
  kind: "transfer",
  at: T0 + day * DAY,
  sibling: "s1",
});

test("main pattern skips broad topics", () => {
  assert.equal(mainPattern(["array", "binary-search"]), "binary-search");
  assert.equal(mainPattern(["array"]), "arrays");
  assert.equal(mainPattern([]), null);
});

test("siblings share the main pattern", () => {
  assert.equal(isSibling(["array", "binary-search"], ["binary-search", "math"]), true);
  assert.equal(isSibling(["array", "binary-search"], ["array", "greedy"]), false);
});

test("a sibling solve while due clears the revision and climbs two rungs", () => {
  // Solo first solve: step 2 (7 days). Sibling on day 7 climbs to step 4 (35 days).
  const s = foldEvents([solo(0), transfer(7)])!;
  assert.equal(s.step, 4);
  assert.equal(s.dueAt, T0 + 7 * DAY + 35 * DAY);
  assert.equal(s.history.at(-1)!.sibling, "s1");
});

test("a sibling solve before the revision is due changes nothing", () => {
  const s = foldEvents([solo(0), transfer(3)])!;
  assert.equal(s.step, 2);
  assert.equal(s.history.length, 0);
});
