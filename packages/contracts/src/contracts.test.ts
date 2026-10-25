import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { ExtHistoryRequest, ExtSessionsRequest } from "./index.ts";

const session = {
  clientId: randomUUID(),
  platform: "leetcode",
  titleSlug: "koko-eating-bananas",
  title: "875. Koko Eating Bananas",
  startedAt: Date.UTC(2026, 9, 25, 10),
  endedAt: Date.UTC(2026, 9, 25, 10, 25),
  activeMs: 18 * 60_000,
  idleMs: 4 * 60_000,
  outcome: "solved",
  independence: "solo",
  note: null,
  mistakeTags: ["edge-case"],
  submissions: [
    {
      id: "1234567890",
      verdict: "WA",
      language: "cpp",
      runtimeMs: null,
      memoryKb: null,
      at: Date.UTC(2026, 9, 25, 10, 20),
    },
    {
      id: "1234567891",
      verdict: "AC",
      language: "cpp",
      runtimeMs: 12,
      memoryKb: 20480,
      at: Date.UTC(2026, 9, 25, 10, 24),
    },
  ],
};

test("a normal session validates and defaults mode", () => {
  const parsed = ExtSessionsRequest.parse({ sessions: [session] });
  assert.equal(parsed.sessions[0]?.mode, "practice");
});

test("rejects bad slugs, unknown tags and run-code ids", () => {
  const bad = (patch: object) =>
    ExtSessionsRequest.safeParse({ sessions: [{ ...session, ...patch }] }).success;
  assert.equal(bad({ titleSlug: "../etc/passwd" }), false);
  assert.equal(bad({ mistakeTags: ["lazy"] }), false);
  assert.equal(bad({ submissions: [{ ...session.submissions[0], id: "runcode_123_abc" }] }), false);
  assert.equal(bad({ activeMs: -1 }), false);
});

test("history items carry no code field", () => {
  const parsed = ExtHistoryRequest.parse({
    items: [{ ...session.submissions[1], titleSlug: "two-sum", title: "Two Sum", code: "secret" }],
  });
  assert.equal("code" in parsed.items[0]!, false);
});
