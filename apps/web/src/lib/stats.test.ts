import assert from "node:assert/strict";
import { test } from "node:test";
import type { PlatformSnapshot } from "@upsolve/adapters";
import {
  activeDays,
  currentStreak,
  heatmapLevels,
  mergeCalendars,
  sumSolved,
  topTopics,
} from "./stats.ts";

const today = new Date("2026-10-25T10:00:00Z");

test("mergeCalendars adds days together", () => {
  assert.deepEqual(mergeCalendars([{ "2026-10-24": 2 }, { "2026-10-24": 1, "2026-10-25": 4 }]), {
    "2026-10-24": 3,
    "2026-10-25": 4,
  });
});

test("currentStreak counts back from today, or from yesterday if today is empty", () => {
  const cal = { "2026-10-25": 1, "2026-10-24": 2, "2026-10-23": 1, "2026-10-21": 5 };
  assert.equal(currentStreak(cal, today), 3);
  const noToday = Object.fromEntries(Object.entries(cal).filter(([d]) => d !== "2026-10-25"));
  assert.equal(currentStreak(noToday, today), 2);
  assert.equal(currentStreak({ "2026-10-20": 1 }, today), 0);
});

test("activeDays and heatmapLevels look back from today", () => {
  const cal = { "2026-10-25": 1, "2026-10-24": 4, "2026-10-23": 12, "2025-01-01": 3 };
  assert.equal(activeDays(cal, today, 7), 3);
  assert.deepEqual(heatmapLevels(cal, today, 4), [0, 4, 2, 1]);
});

test("sumSolved and topTopics merge platforms", () => {
  const snap = (topics: PlatformSnapshot["topics"], total: number): PlatformSnapshot => ({
    handle: "x",
    displayName: null,
    avatarUrl: null,
    solved: { total, easy: total, medium: 0, hard: 0, unknown: 0 },
    rating: null,
    maxRating: null,
    rankLabel: null,
    contests: 0,
    calendar: {},
    topics,
    fetchedAt: "",
  });
  const a = snap({ graph: { name: "Graph", solved: 3 }, math: { name: "Math", solved: 1 } }, 10);
  const b = snap({ graph: { name: "Graph Theory", solved: 4 } }, 5);
  assert.equal(sumSolved([a, b]).total, 15);
  assert.deepEqual(topTopics([a, b], 1), [{ slug: "graph", name: "Graph", solved: 7 }]);
  assert.equal(a.topics.graph?.solved, 3, "inputs are not mutated");
});

// DsaKaro
