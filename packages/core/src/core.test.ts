import assert from "node:assert/strict";
import { test } from "node:test";
import {
  applyEvent,
  buildQueue,
  comfortableLevel,
  foldEvents,
  intervalMs,
  problemPoints,
  retention,
  solveEvents,
  suggestNext,
  topicMastery,
  topicTargets,
  topicsOf,
  type QueueItem,
  type ReviewEvent,
  type ReviewState,
} from "./index.ts";

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 0, 1);
const solve = (
  day: number,
  independence: "solo" | "hint" | "solution" | null,
  activeMs: number | null = null,
  proven = independence !== null,
): ReviewEvent => ({ kind: "solve", at: T0 + day * DAY, proven, independence, activeMs });

test("first solve sets the first interval from how it was solved", () => {
  assert.equal(foldEvents([solve(0, "solution")])!.dueAt, T0 + 1 * DAY);
  assert.equal(foldEvents([solve(0, "hint")])!.dueAt, T0 + 3 * DAY);
  assert.equal(foldEvents([solve(0, "solo")])!.dueAt, T0 + 7 * DAY);
  assert.equal(foldEvents([solve(0, null)])!.step, 1); // synced, unknown
});

test("proven reviews climb the ladder; hint drops two steps; solution resets", () => {
  const s = foldEvents([
    solve(0, "solo", 600_000),
    solve(7, "solo", 500_000),
    solve(23, "solo", 500_000),
  ])!;
  assert.equal(s.step, 4);
  assert.equal(s.dueAt, T0 + 23 * DAY + 35 * DAY);
  assert.equal(s.bestMs, 500_000);
  assert.equal(applyEvent(s, solve(60, "hint"))!.step, 2);
  assert.equal(applyEvent(s, solve(60, "solution"))!.step, 0);
});

test("a slow solo review keeps the step", () => {
  const s = foldEvents([solve(0, "solo", 600_000), solve(8, "solo", 800_000)])!;
  assert.equal(s.lastResult, "slow");
  assert.equal(s.step, 2);
});

test("re-solving too early isn't a review", () => {
  const s = foldEvents([solve(0, "solo"), solve(0.2, "solo"), solve(2, "solo")])!;
  assert.equal(s.history.length, 0);
  assert.equal(s.step, 2);
});

test("unproven passes can't go past step 3, proven ones can", () => {
  const events = [0, 4, 12, 30, 70, 140].map((d) => solve(d, null));
  assert.equal(foldEvents(events)!.step, 3);
  const manual: ReviewEvent[] = [
    solve(0, "solo"),
    ...[8, 20, 40, 80].map((d) => ({
      kind: "manual" as const,
      at: T0 + d * DAY,
      rating: "remembered" as const,
    })),
  ];
  assert.equal(foldEvents(manual)!.step, 3);
  const proven = foldEvents([...manual, solve(200, "solo", 1)])!;
  assert.equal(proven.step, 4);
});

test("manual forgot resets; retire hides; restore brings back", () => {
  const s = foldEvents([solve(0, "solo"), { kind: "manual", at: T0 + 8 * DAY, rating: "forgot" }])!;
  assert.equal(s.step, 0);
  assert.equal(s.history.at(-1)!.manual, true);
  const retired = foldEvents([solve(0, "solo"), { kind: "retire", at: T0 + DAY }])!;
  assert.equal(retired.retired, true);
  assert.equal(applyEvent(retired, { kind: "restore", at: T0 + 2 * DAY })!.retired, false);
  assert.equal(foldEvents([{ kind: "manual", at: T0, rating: "forgot" }]), null);
});

test("an accepted submission next to a timed session is the same solve", () => {
  const events = solveEvents(
    [T0 + 60_000, T0 + 10 * DAY],
    [{ at: T0, independence: "hint", activeMs: 900_000 }],
  );
  assert.equal(events.length, 2);
  assert.deepEqual(
    events.map((e) => e.kind === "solve" && e.proven),
    [true, false],
  );
});

test("queue respects the daily cap and orders by priority", () => {
  const state = (dueDay: number): ReviewState => ({
    step: 1,
    dueAt: T0 + dueDay * DAY,
    firstSolvedAt: T0 - 10 * DAY,
    lastAt: T0 - 3 * DAY,
    lastResult: null,
    bestMs: null,
    retired: false,
    history: [],
  });
  const items: QueueItem[] = [
    { problemId: "a", state: state(-1), difficulty: "easy", weakestMastery: 80 },
    { problemId: "b", state: state(-5), difficulty: "hard", weakestMastery: 10 },
    { problemId: "c", state: state(0), difficulty: "medium", weakestMastery: 50 },
    {
      problemId: "d",
      state: { ...state(-9), retired: true },
      difficulty: "hard",
      weakestMastery: 0,
    },
    { problemId: "e", state: state(3), difficulty: "easy", weakestMastery: 0 },
  ];
  const now = T0 + DAY / 2;
  const q = buildQueue(items, { now, endOfToday: T0 + DAY, cap: 2, reviewedToday: 0 });
  assert.deepEqual(
    q.today.map((i) => i.problemId),
    ["b", "c"],
  );
  assert.equal(q.backlog, 1);
  assert.equal(q.upcoming[1], 1); // e is due at the end of the day after tomorrow
  const capped = buildQueue(items, { now, endOfToday: T0 + DAY, cap: 2, reviewedToday: 2 });
  assert.equal(capped.today.length, 0);
  assert.equal(capped.backlog, 3);
});

test("topics map platform tags", () => {
  assert.deepEqual(topicsOf(["array", "hash-table", "dfs", "cpp"]), [
    "arrays",
    "hashing",
    "graphs",
  ]);
  assert.deepEqual(topicsOf(["arrays", "array"]), ["arrays"]);
});

test("mastery weighs difficulty, honesty and retention", () => {
  assert.equal(retention(T0, T0), 1);
  assert.ok(Math.abs(retention(T0, T0 + 45 * DAY) - 0.5) < 1e-9);
  assert.equal(retention(T0, T0 + 1000 * DAY), 0.25);
  const base = { tags: ["graph"], lastSuccessAt: T0, bestMs: null } as const;
  assert.equal(problemPoints({ ...base, difficulty: "hard", independence: "solo" }, T0), 3);
  assert.equal(problemPoints({ ...base, difficulty: "medium", independence: "hint" }, T0), 1.2);

  const targets = topicTargets(
    Array.from({ length: 40 }, () => ({ difficulty: "medium" as const, tags: ["graph"] })),
  );
  assert.equal(targets.graphs, 40);
  assert.equal(targets.trie, 10);
  assert.equal(
    topicTargets(
      Array.from({ length: 500 }, () => ({ difficulty: "hard" as const, tags: ["array"] })),
    ).arrays,
    60,
  );
  const m = topicMastery(
    Array.from({ length: 10 }, () => ({
      ...base,
      difficulty: "medium" as const,
      independence: "solo" as const,
    })),
    targets,
    T0,
  );
  const graphs = m.find((t) => t.topic === "graphs")!;
  assert.equal(graphs.score, 50);
  assert.equal(graphs.soloRate, 1);
  assert.equal(m.find((t) => t.topic === "dp")!.score, 0);
});

test("next problem: weakest topic first, comfortable level plus a nudge", () => {
  assert.equal(comfortableLevel({ easy: 50, medium: 3, hard: 0 }), "easy");
  assert.equal(comfortableLevel({ easy: 50, medium: 40, hard: 2 }), "medium");
  const mastery = topicMastery([], topicTargets([]), T0).map((t) =>
    t.topic === "dp" ? t : { ...t, score: 60 },
  );
  const picks = suggestNext(
    [
      { problemId: "1", difficulty: "easy", tags: ["array"] },
      { problemId: "2", difficulty: "hard", tags: ["dynamic-programming"] },
      { problemId: "3", difficulty: "medium", tags: ["dynamic-programming"] },
      { problemId: "4", difficulty: "easy", tags: ["dynamic-programming"] },
      { problemId: "5", difficulty: "medium", tags: ["dynamic-programming"] },
    ],
    mastery,
    { easy: 50, medium: 3, hard: 0 },
  );
  assert.deepEqual(
    picks.map((p) => p.problemId),
    ["3", "4", "1"],
  );
  assert.match(picks[0]!.reason, /Dynamic programming is at 0\/100 · a step up/);
});

test("interval ladder", () => {
  assert.equal(intervalMs(0), DAY);
  assert.equal(intervalMs(99), 90 * DAY);
});

// DsaKaro

test("snooze pushes a due revision a day out without changing the rung", () => {
  const s = foldEvents([solve(0, "solution")])!;
  // Due on day 1; snoozed on day 2 (overdue) → due day 3, same rung, no new history.
  const z = foldEvents([solve(0, "solution"), { kind: "snooze", at: T0 + 2 * DAY }])!;
  assert.equal(z.dueAt, T0 + 3 * DAY);
  assert.equal(z.step, s.step);
  assert.equal(z.history.length, s.history.length);
  // Snoozing before it's due moves it a day past its due date.
  const early = foldEvents([solve(0, "solution"), { kind: "snooze", at: T0 + DAY / 2 }])!;
  assert.equal(early.dueAt, T0 + 2 * DAY);
});
