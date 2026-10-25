import assert from "node:assert/strict";
import { test } from "node:test";
import {
  checkUrlSubmissionId,
  historyItem,
  newerId,
  parseMemoryKb,
  parseRuntimeMs,
  problemSlug,
  submissionFromCheck,
  submissionIdFromPath,
  titleFromDocument,
} from "./leetcode.ts";
import { canResume, newSession, toWire, worthUploading } from "./session.ts";
import {
  ARM_AFTER_MS,
  IDLE_AFTER_MS,
  formatClock,
  newTimer,
  onInput,
  setManualPause,
  solve,
  tick,
  type Signals,
  type TimerState,
} from "./timer.ts";

const T0 = 1_790_000_000_000;
const focused = (lastInputAt: number): Signals => ({ visible: true, focused: true, lastInputAt });

/** Ticks once per second from `from` for `seconds`. */
function run(s: TimerState, from: number, seconds: number, sig: (now: number) => Signals) {
  for (let i = 1; i <= seconds; i++) s = tick(s, from + i * 1000, sig(from + i * 1000));
  return s;
}

test("timer arms for 10 s of focus, then counts those seconds as active", () => {
  let s = run(newTimer(T0), T0, 9, (n) => focused(n));
  assert.equal(s.status, "armed");
  s = run(s, T0 + 9000, 1, (n) => focused(n));
  assert.equal(s.status, "active");
  assert.equal(s.activeMs, ARM_AFTER_MS);
  assert.equal(s.startedAt, T0);
});

test("first keystroke starts the timer immediately", () => {
  const s = onInput(newTimer(T0), T0 + 2000);
  assert.equal(s.status, "active");
});

test("hidden tab and 3 minutes without input count as idle", () => {
  let s = onInput(newTimer(T0), T0);
  s = run(s, T0, 60, (n) => focused(n)); // 1 min typing
  s = run(s, T0 + 60_000, 30, () => ({ visible: false, focused: false, lastInputAt: T0 + 60_000 }));
  assert.equal(s.status, "paused");
  assert.equal(s.activeMs, 60_000);
  assert.equal(s.idleMs, 30_000);

  const lastInput = T0 + 90_000;
  s = run(s, T0 + 90_000, 240, () => focused(lastInput)); // visible but no input for 4 min
  assert.equal(s.activeMs, 60_000 + IDLE_AFTER_MS - 1000);
});

test("a laptop sleeping mid-session doesn't inflate active time", () => {
  let s = onInput(newTimer(T0), T0);
  s = tick(s, T0 + 3_600_000, focused(T0 + 3_600_000)); // 1 h gap, then input
  assert.equal(s.activeMs, 5_000);
  assert.equal(s.idleMs, 3_600_000 - 5_000);
});

test("manual pause, solve and clock formatting", () => {
  let s = setManualPause(onInput(newTimer(T0), T0), true, T0);
  s = run(s, T0, 5, (n) => focused(n));
  assert.equal(s.activeMs, 0);
  s = solve(setManualPause(s, false, T0 + 5000), T0 + 6000);
  assert.equal(s.status, "solved");
  assert.equal(formatClock(65_000), "01:05");
  assert.equal(formatClock(3_725_000), "1:02:05");
});

test("URL and title parsing", () => {
  assert.equal(problemSlug("/problems/two-sum/description/"), "two-sum");
  assert.equal(problemSlug("/problems/two-sum"), "two-sum");
  assert.equal(problemSlug("/problemset/"), null);
  assert.equal(
    titleFromDocument("875. Koko Eating Bananas - LeetCode"),
    "875. Koko Eating Bananas",
  );
  assert.equal(titleFromDocument("LeetCode"), null);
});

test("check responses become submissions; run-code and pending results don't", () => {
  const ok = submissionFromCheck(
    "1234567890",
    {
      state: "SUCCESS",
      status_msg: "Accepted",
      lang: "cpp",
      status_runtime: "3 ms",
      memory: 20_971_520,
    },
    T0,
  );
  assert.deepEqual(ok, {
    id: "1234567890",
    verdict: "AC",
    language: "cpp",
    runtimeMs: 3,
    memoryKb: 20480,
    at: T0,
  });
  assert.equal(submissionFromCheck("runcode_1_x", { state: "SUCCESS" }, T0), null);
  assert.equal(submissionFromCheck("123", { state: "STARTED" }, T0), null);
  assert.equal(
    submissionFromCheck("124", { state: "SUCCESS", status_msg: "Wrong Answer" }, T0)?.verdict,
    "WA",
  );
});

test("history rows map without code and skip pending ones", () => {
  const item = historyItem({
    id: 987,
    title: "Two Sum",
    title_slug: "two-sum",
    status_display: "Time Limit Exceeded",
    lang: "python3",
    timestamp: "1790000000",
    runtime: "N/A",
    memory: "16.4 MB",
    is_pending: "Not Pending",
  });
  assert.equal(item?.verdict, "TLE");
  assert.equal(item?.runtimeMs, null);
  assert.equal(item?.memoryKb, 16794);
  assert.equal(item?.at, 1_790_000_000_000);
  assert.equal(
    historyItem({ id: 1, title_slug: "two-sum", timestamp: 1, is_pending: "Pending" }),
    null,
  );
  assert.equal(parseRuntimeMs("12 ms"), 12);
  assert.equal(parseMemoryKb("1 GB"), 1_048_576);
  assert.equal(newerId("1000", "999"), true);
  assert.equal(newerId("998", "999"), false);
});

test("sessions resume within 30 min and only real attempts upload", () => {
  const s = newSession("two-sum", "1. Two Sum", T0, "00000000-0000-4000-8000-000000000000");
  assert.equal(canResume({ ...s, updatedAt: T0 }, T0 + 29 * 60_000), true);
  assert.equal(canResume({ ...s, updatedAt: T0 }, T0 + 31 * 60_000), false);
  assert.equal(canResume({ ...s, outcome: "solved" }, T0), false);
  assert.equal(worthUploading(s), false);
  const started = { ...s, timer: { ...onInput(s.timer, T0), activeMs: 20_000 } };
  assert.equal(worthUploading(started), true);
  assert.equal(toWire(started).startedAt, T0);
});

test("judge-result URLs: old and v2 paths, never run-code", () => {
  assert.equal(
    checkUrlSubmissionId("https://leetcode.com/submissions/detail/2181194085/v2/check/"),
    "2181194085",
  );
  assert.equal(checkUrlSubmissionId("/submissions/detail/2181194085/check/"), "2181194085");
  assert.equal(checkUrlSubmissionId("/submissions/detail/2181194085/check/?x=1"), "2181194085");
  assert.equal(checkUrlSubmissionId("/submissions/detail/runcode_1_abc/v2/check/"), null);
  assert.equal(checkUrlSubmissionId("/submissions/detail/2181194085/"), null);
  assert.equal(submissionIdFromPath("/problems/two-sum/submissions/2181194085/"), "2181194085");
  assert.equal(submissionIdFromPath("/problems/two-sum/submissions/"), null);
  assert.equal(submissionIdFromPath("/problems/two-sum/description/"), null);
});
