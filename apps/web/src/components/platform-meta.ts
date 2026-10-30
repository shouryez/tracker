import type { Platform } from "@upsolve/adapters";

export const PLATFORM_LABEL: Record<Platform, string> = {
  leetcode: "LeetCode",
  codeforces: "Codeforces",
  geeksforgeeks: "GeeksforGeeks",
  codechef: "CodeChef",
  atcoder: "AtCoder",
  code360: "Code360",
  hackerrank: "HackerRank",
  interviewbit: "InterviewBit",
};

export const PLATFORM_PROFILE_URL: Partial<Record<Platform, (handle: string) => string>> = {
  leetcode: (h) => `https://leetcode.com/u/${encodeURIComponent(h)}/`,
  codeforces: (h) => `https://codeforces.com/profile/${encodeURIComponent(h)}`,
  geeksforgeeks: (h) => `https://www.geeksforgeeks.org/user/${encodeURIComponent(h)}/`,
};

/** Line colour per platform for sparklines (direct-labelled, so colour is decoration only). */
export const PLATFORM_STROKE: Partial<Record<Platform, string>> = {
  leetcode: "var(--medium)",
  codeforces: "var(--primary)",
  geeksforgeeks: "var(--easy)",
};

// DsaKaro
