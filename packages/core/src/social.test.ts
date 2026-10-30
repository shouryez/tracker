import assert from "node:assert/strict";
import { test } from "node:test";
import {
  consistencyScore,
  freezeProblem,
  frozenDays,
  MAX_SCORE,
  rankBy,
  streakWithFreezes,
} from "./index.ts";

test("consistency score caps each part", () => {
  assert.equal(MAX_SCORE, 150);
  assert.equal(
    consistencyScore({ activeDays: 5, reviews: 4, focusMs: 2 * 3_600_000, solved: 7 }),
    50 + 8 + 6 + 7,
  );
  // Farming 100 easies alone can't beat steady practice.
  const farmer = consistencyScore({ activeDays: 1, reviews: 0, focusMs: 0, solved: 100 });
  const steady = consistencyScore({ activeDays: 6, reviews: 5, focusMs: 5 * 3_600_000, solved: 8 });
  assert.equal(farmer, 30);
  assert.ok(steady > farmer);
  assert.equal(consistencyScore({ activeDays: 9, reviews: 99, focusMs: 1e9, solved: 99 }), 150);
});

test("ranks share ties", () => {
  const ranked = rankBy(
    [
      { n: "a", s: 5 },
      { n: "b", s: 9 },
      { n: "c", s: 5 },
      { n: "d", s: 1 },
    ],
    (r) => r.s,
  );
  assert.deepEqual(
    ranked.map((r) => `${r.n}${r.rank}`),
    ["b1", "a2", "c2", "d4"],
  );
});

test("frozen days don't break or add to a streak", () => {
  const today = Date.parse("2026-11-10T12:00:00Z");
  const active = new Set(["2026-11-10", "2026-11-09", "2026-11-05", "2026-11-04"]);
  assert.equal(streakWithFreezes(active, new Set(), today), 2);
  const frozen = frozenDays([{ start: "2026-11-06", end: "2026-11-08" }]);
  assert.equal(frozen.size, 3);
  assert.equal(streakWithFreezes(active, frozen, today), 4);
  // Today not active yet: the streak still stands from yesterday.
  assert.equal(streakWithFreezes(new Set(["2026-11-09"]), new Set(), today), 1);
});

test("freeze rules", () => {
  const today = "2026-11-01";
  assert.equal(freezeProblem("2026-11-03", "2026-11-10", today, []), null);
  assert.match(freezeProblem("2026-10-30", "2026-11-02", today, [])!, /past/);
  assert.match(freezeProblem("2026-11-03", "2026-11-30", today, [])!, /at most 14/);
  assert.match(
    freezeProblem("2026-11-05", "2026-11-06", today, [{ start: "2026-11-04", end: "2026-11-08" }])!,
    /overlaps/,
  );
  const two = [
    { start: "2026-11-02", end: "2026-11-03" },
    { start: "2026-11-20", end: "2026-11-21" },
  ];
  assert.match(freezeProblem("2026-12-01", "2026-12-02", today, two)!, /2 freezes/);
  // Past freezes don't count against the limit.
  assert.equal(
    freezeProblem("2026-12-01", "2026-12-02", today, [
      { start: "2026-10-01", end: "2026-10-05" },
      two[1]!,
    ]),
    null,
  );
});

// DsaKaro
