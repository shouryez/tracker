// Lab mode: while a focus session runs, time on coding sites counts as focus and
// everything else as away. Only the two totals and a switch count are kept; no URL,
// title or tab content is ever stored or uploaded.

export type LabCategory = "focus" | "away";

export type LabState = {
  focusId: string;
  startedAt: number;
  /** When the totals were last advanced. */
  lastAt: number;
  lastCat: LabCategory;
  focusMs: number;
  awayMs: number;
  switches: number;
};

export type LabTotals = { focusMs: number; awayMs: number; switches: number; tracking: boolean };

const CODING_HOSTS = [
  "leetcode.com",
  "leetcode.cn",
  "geeksforgeeks.org",
  "codeforces.com",
  "codechef.com",
  "atcoder.jp",
  "takeuforward.org",
  "neetcode.io",
  "hackerrank.com",
  "interviewbit.com",
  "cses.fi",
  "spoj.com",
  "visualgo.net",
];

/** Video titles that count as studying when the tab is YouTube. */
const DSA_WORDS =
  /\b(dsa|leetcode|algorithm|data structure|array|string|linked list|tree|graph|dp|dynamic programming|recursion|backtracking|binary search|sliding window|two pointer|heap|stack|queue|trie|greedy|bit manipulation|striver|neetcode|codeforces|coding interview|placement|competitive programming)\b/i;

/** A single gap longer than this (the worker slept, the laptop closed) is not counted. */
const MAX_STEP_MS = 3 * 60_000;

function hostMatches(host: string, domain: string) {
  return host === domain || host.endsWith(`.${domain}`);
}

/** Classifies a tab. `null` url means no browser window has focus. */
export function categorize(
  url: string | null | undefined,
  title: string | null | undefined,
  webOrigin: string,
): LabCategory {
  if (!url) return "away";
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return "away";
  }
  if (u.origin === webOrigin) return "focus";
  const host = u.hostname.replace(/^www\./, "");
  if (CODING_HOSTS.some((d) => hostMatches(host, d))) return "focus";
  if (hostMatches(host, "youtube.com") && u.pathname === "/watch")
    return DSA_WORDS.test(title ?? "") ? "focus" : "away";
  return "away";
}

export function newLab(focusId: string, startedAt: number, cat: LabCategory): LabState {
  return {
    focusId,
    startedAt,
    lastAt: startedAt,
    lastCat: cat,
    focusMs: 0,
    awayMs: 0,
    switches: 0,
  };
}

/** Adds the time since the last step to the previous category, then moves to `cat`. */
export function advance(s: LabState, now: number, cat: LabCategory): LabState {
  const step = Math.max(0, Math.min(now - s.lastAt, MAX_STEP_MS));
  const next = { ...s, lastAt: now, lastCat: cat };
  if (s.lastCat === "focus") next.focusMs += step;
  else next.awayMs += step;
  if (cat !== s.lastCat && cat === "away") next.switches += 1;
  return next;
}

export function totals(s: LabState | null | undefined): LabTotals {
  return s
    ? { focusMs: s.focusMs, awayMs: s.awayMs, switches: s.switches, tracking: true }
    : { focusMs: 0, awayMs: 0, switches: 0, tracking: false };
}
