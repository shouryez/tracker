import assert from "node:assert/strict";
import { test } from "node:test";
import { gfgDifficulty, parseGfgTime, solvedToSubmissions } from "./gfg.ts";
import { matchKey, matchTitles } from "./match.ts";

test("GFG difficulty buckets map to easy/medium/hard", () => {
  assert.equal(gfgDifficulty("School"), "easy");
  assert.equal(gfgDifficulty("Basic"), "easy");
  assert.equal(gfgDifficulty("Easy"), "easy");
  assert.equal(gfgDifficulty("Medium"), "medium");
  assert.equal(gfgDifficulty("Hard"), "hard");
  assert.equal(gfgDifficulty("Weird"), null);
});

test("GFG times are read as IST", () => {
  assert.equal(parseGfgTime("2026-10-17 14:39:28")?.toISOString(), "2026-10-17T09:09:28.000Z");
  assert.equal(parseGfgTime("yesterday"), null);
});

test("solved list becomes one accepted submission per problem", () => {
  const subs = solvedToSubmissions({
    status: "success",
    count: 2,
    result: {
      Easy: {
        "700005": {
          slug: "reverse-a-linked-list",
          pname: "Reverse Linked List",
          lang: "cpp",
          user_subtime: "2026-10-17 14:39:28",
        },
      },
      Basic: {
        "360": {
          slug: "rotate-array-by-n-elements",
          pname: "Rotate Array",
          lang: "python",
          user_subtime: "2016-02-19 14:11:06",
        },
      },
      Hard: {
        "1": { slug: "bad slug!", pname: "x", lang: "c", user_subtime: "2016-02-19 14:11:06" },
      },
    },
  });
  assert.equal(subs.length, 2);
  assert.equal(subs[0]?.externalId, "ac-700005");
  assert.equal(
    subs[0]?.problem.url,
    "https://www.geeksforgeeks.org/problems/reverse-a-linked-list/1",
  );
  assert.equal(subs[1]?.problem.difficulty, "easy");
});

test("title matching is strict", () => {
  assert.equal(matchKey("Reverse a Linked List"), matchKey("Reverse Linked List"));
  assert.equal(matchKey("Bubble Sort"), "bubble sort");
  const candidates = [
    { id: "rev", key: matchKey("Reverse a linked list") },
    { id: "revk", key: matchKey("Reverse a Linked List in groups of given size") },
    { id: "lcp", key: matchKey("Longest Common Prefix in an Array") },
    { id: "bs1", key: matchKey("Bubble Sort") },
  ];
  assert.deepEqual(matchTitles("Reverse Linked List", candidates), { id: "rev", score: 1 });
  assert.equal(
    matchTitles("Longest Common Prefix", candidates),
    null,
    "subset title is not a match",
  );
  assert.equal(matchTitles("Selection Sort", candidates), null);
  assert.notEqual(matchKey("Infix to Postfix Conversion"), matchKey("Postfix to Infix Conversion"));
  assert.equal(matchKey("Roman to Integer"), matchKey("roman to integer"));
  assert.equal(
    matchKey("Leaders in an Array"),
    matchKey("Array Leaders"),
    "order-free without 'to'",
  );
  assert.equal(
    matchTitles("Infix to Postfix Conversion", [
      { id: "p2i", key: matchKey("Postfix to Infix Conversion") },
      { id: "i2p", key: matchKey("Infix to Postfix") },
    ]),
    null,
    "direction mismatch never matches, even fuzzily",
  );
  const dupes = [...candidates, { id: "bs2", key: matchKey("bubble sort") }];
  assert.equal(matchTitles("Bubble sort", dupes), null, "ambiguous exact matches are skipped");
});
