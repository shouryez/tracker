// Lab mode: while a focus session runs, time on coding sites counts as focus and
// everything else as away. Only the two totals and a switch count are kept; no URL,
// title or tab content is ever stored or uploaded. What you're on right now is shown
// live on your own DsaKaro page (never saved), and a while on a non-study tab can
// pause the session (auto-pause).

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

/** YouTube channels whose videos count as studying, whatever the title says. */
const STUDY_CHANNELS = [
  "take u forward",
  "striver",
  "neetcode",
  "neetcodeio",
  "aditya verma",
  "abdul bari",
  "codehelp - by babbar",
  "codehelp",
  "apna college",
  "kunal kushwaha",
  "errichto",
  "errichto algorithms",
  "william fiset",
  "tushar roy - coding made simple",
  "back to back swe",
  "pepcoding",
  "codencode",
  "luv",
  "colin galen",
  "algorithms live!",
  "techdose",
  "nick white",
  "kevin naughton jr.",
  "fraz",
  "love babbar",
  "anuj bhaiya",
  "code with alisha",
  "codestorywithmik",
  "coding decoded",
  "mycodeschool",
  "freecodecamp.org",
];

/** Pausing waits this long on a non-study tab, so a quick look elsewhere doesn't pause. */
export const AUTO_PAUSE_MS = 30_000;

/** Video titles that count as studying when the tab is YouTube. */
const DSA_WORDS =
  /\b(dsa|leetcode|algorithm|data structure|array|string|linked list|tree|graph|dp|dynamic programming|recursion|backtracking|binary search|sliding window|two pointer|heap|stack|queue|trie|greedy|bit manipulation|striver|neetcode|codeforces|coding interview|placement|competitive programming)\b/i;

/** A single gap longer than this (the worker slept, the laptop closed) is not counted. */
const MAX_STEP_MS = 3 * 60_000;

function hostMatches(host: string, domain: string) {
  return host === domain || host.endsWith(`.${domain}`);
}

export function isStudyChannel(channel: string | null | undefined) {
  const c = channel?.trim().toLowerCase();
  return Boolean(c && STUDY_CHANNELS.includes(c));
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

/** Whether a known non-study tab has been active long enough to pause. */
export function shouldAutoPause(awaySince: number | null | undefined, now: number) {
  return awaySince != null && now - awaySince >= AUTO_PAUSE_MS;
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
