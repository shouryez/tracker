// Lab mode: while a focus session runs, time on coding sites counts as focus and
// everything else as away. Only the two totals and a switch count are kept; no URL,
// title or tab content is ever stored or uploaded. What you're on right now is shown
// live on your own DsaKaro page (never saved). The session never pauses itself: off-task
// time is shown and kept out of focus, and only you pause or stop it.

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
  /** Since when the active tab has been a known non-study tab (auto-pause counts from it). */
  awaySince?: number | null;
};

/** A session the extension paused itself; it resumes it on the next study tab. */
export type AutoPaused = { focusId: string; startedAt: number; at: number; host: string | null };

/** What the active tab is, for the live view. `known` is false when no browser window has focus. */
export type LabActivity = {
  cat: LabCategory;
  known: boolean;
  kind: "video" | "problem" | "dsakaro" | "page" | null;
  label: string | null;
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
  "cp-algorithms.com",
  "usaco.guide",
  "stackoverflow.com",
];

/**
 * YouTube channels whose videos count as studying, whatever the title says. Matched as a
 * part of the channel name or @handle, spaces ignored ("take U forward", "@takeUforward").
 */
const STUDY_CHANNELS = [
  "takeuforward",
  "striver",
  "neetcode",
  "adityaverma",
  "abdulbari",
  "codehelp",
  "lovebabbar",
  "apnacollege",
  "kunalkushwaha",
  "errichto",
  "williamfiset",
  "tusharroy",
  "backtobackswe",
  "pepcoding",
  "codencode",
  "colingalen",
  "techdose",
  "nickwhite",
  "kevinnaughton",
  "anujbhaiya",
  "codestorywithmik",
  "codingdecoded",
  "mycodeschool",
  "freecodecamp",
  "algorithmslive",
  "abdulbaricodes",
  "jennyslectures",
  "gatesmashers",
  "codewithalisha",
  "hello world",
  "helloworld",
];
/** Short names only match exactly (as a part they'd catch unrelated channels). */
const STUDY_CHANNELS_EXACT = ["luv", "fraz", "cp with sahil", "priyansh agarwal"];

/** Video titles that count as studying when the tab is YouTube. */
const DSA_WORDS =
  /\b(dsa|leetcode|gfg|potd|algorithms?|data structures?|arrays?|strings?|substrings?|subarrays?|subsequences?|subsets?|linked ?lists?|trees?|binary trees?|bst|graphs?|bfs|dfs|dp|dynamic programming|memoi[sz]ation|tabulation|recursion|backtracking|binary search|sliding window|two pointers?|heaps?|priority queue|stacks?|queues?|tries?|greedy|bit manipulation|bitmask(ing)?|hashing|hash ?maps?|prefix sums?|matrix|sorting|kadane|dijkstra|bellman|floyd|topo(logical)? sort|union find|disjoint set|dsu|segment trees?|fenwick|kruskal|prims?|mst|knapsack|lis|lcs|time complexity|big o|striver|neetcode|codeforces|codechef|coding interview|interview questions?|placements?|competitive programming|sde sheet|a2z|blind 75|g-\d+|dp-?\s?\d+|l-?\d+\.)(?=\W|$)/i;

/** A single gap longer than this (the worker slept, the laptop closed) is not counted. */
const MAX_STEP_MS = 3 * 60_000;

function hostMatches(host: string, domain: string) {
  return host === domain || host.endsWith(`.${domain}`);
}

export function isStudyChannel(channel: string | null | undefined) {
  const c = channel?.trim().toLowerCase().replace(/^@/, "");
  if (!c) return false;
  const squashed = c.replace(/[\s._-]+/g, "");
  return STUDY_CHANNELS.some((s) => squashed.includes(s)) || STUDY_CHANNELS_EXACT.includes(c);
}

/** What the YouTube page itself says: the open video's channel and title. */
export type YoutubeInfo = { channel: string | null; title: string | null };

/**
 * Classifies a tab. `sure` is false when it can't tell (no browser window has focus, or a
 * YouTube video whose channel couldn't be read yet): time then counts as away.
 */
export function classify(
  url: string | null | undefined,
  title: string | null | undefined,
  webOrigin: string,
  yt?: YoutubeInfo | null,
): { cat: LabCategory; sure: boolean } {
  if (!url) return { cat: "away", sure: false };
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return { cat: "away", sure: true };
  }
  const host = u.hostname.replace(/^www\./, "");
  if (!hostMatches(host, "youtube.com"))
    return { cat: categorize(url, title, webOrigin), sure: true };
  const path = u.pathname;
  if (path === "/watch" || path.startsWith("/shorts/") || path.startsWith("/live/")) {
    const words = `${title ?? ""} ${yt?.title ?? ""}`;
    if (DSA_WORDS.test(words) || isStudyChannel(yt?.channel)) return { cat: "focus", sure: true };
    // Channel not known (page still loading, or the script isn't in this tab): don't pause.
    return { cat: "away", sure: Boolean(yt?.channel) };
  }
  if (path === "/results")
    return {
      cat: DSA_WORDS.test(u.searchParams.get("search_query") ?? "") ? "focus" : "away",
      sure: true,
    };
  // A study channel's own page (/@takeUforward, /c/..., /channel/...).
  const handle = path.split("/")[1] ?? "";
  if (handle.startsWith("@") && isStudyChannel(handle)) return { cat: "focus", sure: true };
  return { cat: "away", sure: true };
}

/** Classifies a tab. `null` url means no browser window has focus. */
export function categorize(
  url: string | null | undefined,
  title: string | null | undefined,
  webOrigin: string,
  channel?: string | null,
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
  if (hostMatches(host, "youtube.com")) {
    if (u.pathname === "/watch" || u.pathname.startsWith("/shorts/"))
      return DSA_WORDS.test(title ?? "") || isStudyChannel(channel) ? "focus" : "away";
    // Searching for a DSA video is part of studying.
    if (u.pathname === "/results")
      return DSA_WORDS.test(u.searchParams.get("search_query") ?? "") ? "focus" : "away";
    const handle = u.pathname.split("/")[1] ?? "";
    if (handle.startsWith("@") && isStudyChannel(handle)) return "focus";
  }
  return "away";
}

/** A short live label for the active tab: the video or problem title, else just the site. */
export function describe(
  url: string | null | undefined,
  title: string | null | undefined,
  cat: LabCategory,
  webOrigin: string,
): Pick<LabActivity, "kind" | "label"> {
  if (!url) return { kind: null, label: null };
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return { kind: null, label: null };
  }
  if (!/^https?:$/.test(u.protocol)) return { kind: "page", label: null };
  if (u.origin === webOrigin) return { kind: "dsakaro", label: "DsaKaro" };
  const host = u.hostname.replace(/^www\./, "");
  const clean = (title ?? "")
    .replace(/^\(\d+\)\s*/, "")
    .replace(/\s+[-|·]\s+(YouTube|LeetCode|GeeksforGeeks|Codeforces|takeUforward)$/i, "")
    .trim();
  // Off-task tabs show only the site, never the page title.
  if (cat === "away") return { kind: "page", label: host };
  if (hostMatches(host, "youtube.com")) return { kind: "video", label: clean || "YouTube" };
  return { kind: "problem", label: clean || host };
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
