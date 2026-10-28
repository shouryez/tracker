import assert from "node:assert/strict";
import { test } from "node:test";
import { ratingToDifficulty, summariseSubmissions } from "./codeforces.ts";
import { parseCalendar } from "./leetcode.ts";
import { codeforcesTagToTopic, topicName } from "./topics.ts";
import { newVerifyCode, normaliseHandle } from "./index.ts";

test("Codeforces ratings bucket into easy/medium/hard", () => {
  assert.equal(ratingToDifficulty(800), "easy");
  assert.equal(ratingToDifficulty(1399), "easy");
  assert.equal(ratingToDifficulty(1400), "medium");
  assert.equal(ratingToDifficulty(1899), "medium");
  assert.equal(ratingToDifficulty(1900), "hard");
  assert.equal(ratingToDifficulty(undefined), null);
});

test("summariseSubmissions counts each solved problem once", () => {
  const now = Math.floor(Date.now() / 1000);
  const p = (contestId: number, index: string, rating?: number, tags = ["dp"]) => ({
    contestId,
    index,
    name: "x",
    rating,
    tags,
  });
  const sub = (id: number, problem: ReturnType<typeof p>, verdict: string) => ({
    id,
    creationTimeSeconds: now - id,
    problem,
    programmingLanguage: "C++",
    verdict,
    timeConsumedMillis: 0,
    memoryConsumedBytes: 0,
  });
  const { solved, topics, calendar } = summariseSubmissions([
    sub(1, p(1, "A", 800), "OK"),
    sub(2, p(1, "A", 800), "OK"), // same problem again
    sub(3, p(2, "B", 1500, ["dp", "greedy"]), "OK"),
    sub(4, p(3, "C", 2100), "WRONG_ANSWER"),
    sub(5, p(4, "D"), "OK"), // unrated
  ]);
  assert.deepEqual(solved, { total: 3, easy: 1, medium: 1, hard: 0, unknown: 1 });
  assert.equal(topics["dynamic-programming"]?.solved, 3);
  assert.equal(topics.greedy?.solved, 1);
  assert.equal(
    Object.values(calendar).reduce((a, b) => a + b, 0),
    5,
  );
});

test("parseCalendar merges timestamps into UTC days and survives bad input", () => {
  const day = Date.UTC(2026, 9, 20) / 1000;
  assert.deepEqual(parseCalendar(JSON.stringify({ [day]: 3, [day + 3600]: 2 })), {
    "2026-10-20": 5,
  });
  assert.deepEqual(parseCalendar("not json"), {});
  assert.deepEqual(parseCalendar(null), {});
});

test("topic mapping lines Codeforces tags up with LeetCode slugs", () => {
  assert.equal(codeforcesTagToTopic("dp"), "dynamic-programming");
  assert.equal(codeforcesTagToTopic("dsu"), "union-find");
  assert.equal(codeforcesTagToTopic("some new tag"), "some-new-tag");
  assert.equal(topicName("dynamic-programming"), "Dynamic Programming");
  assert.equal(topicName("some-new-tag"), "Some New Tag");
});

test("verify codes and handles", () => {
  assert.match(newVerifyCode(), /^dsakaro-[A-Z2-9]{4}$/);
  assert.equal(normaliseHandle("  @tourist "), "tourist");
  assert.equal(normaliseHandle("bad handle!"), null);
});
