import type { TopicCount } from "./types.ts";

/**
 * Codeforces tag → LeetCode-style topic slug, so both platforms count towards
 * the same topic. Tags not listed are slugified as-is.
 */
const CODEFORCES_TAGS: Record<string, string> = {
  dp: "dynamic-programming",
  greedy: "greedy",
  math: "math",
  graphs: "graph",
  trees: "tree",
  "binary search": "binary-search",
  strings: "string",
  sortings: "sorting",
  "dfs and similar": "depth-first-search",
  "number theory": "number-theory",
  "data structures": "data-structures",
  implementation: "implementation",
  "brute force": "brute-force",
  "constructive algorithms": "constructive",
  "two pointers": "two-pointers",
  bitmasks: "bit-manipulation",
  combinatorics: "combinatorics",
  dsu: "union-find",
  "shortest paths": "shortest-path",
  hashing: "hash-function",
  geometry: "geometry",
  games: "game-theory",
  "divide and conquer": "divide-and-conquer",
  probabilities: "probability-and-statistics",
  interactive: "interactive",
  matrices: "matrix",
  "string suffix structures": "suffix-array",
  "graph matchings": "graph-matching",
  flows: "network-flow",
  fft: "fft",
};

const NAMES: Record<string, string> = {
  "dynamic-programming": "Dynamic Programming",
  "depth-first-search": "Depth-First Search",
  "breadth-first-search": "Breadth-First Search",
  "bit-manipulation": "Bit Manipulation",
  "union-find": "Union Find",
  "hash-table": "Hash Table",
  "hash-function": "Hashing",
  "two-pointers": "Two Pointers",
  "binary-search": "Binary Search",
  "sliding-window": "Sliding Window",
  "number-theory": "Number Theory",
  "data-structures": "Data Structures",
  "brute-force": "Brute Force",
  "shortest-path": "Shortest Path",
  "game-theory": "Game Theory",
  "divide-and-conquer": "Divide and Conquer",
  "probability-and-statistics": "Probability",
  "suffix-array": "Suffix Structures",
  "graph-matching": "Graph Matching",
  "network-flow": "Network Flow",
  fft: "FFT",
};

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function codeforcesTagToTopic(tag: string): string {
  return CODEFORCES_TAGS[tag] ?? slugify(tag);
}

export function topicName(slug: string, fallback?: string): string {
  if (NAMES[slug]) return NAMES[slug];
  if (fallback) return fallback;
  return slug
    .split("-")
    .map((w) => (w ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(" ");
}

/** Adds `solved` problems to `topic` in a topic map, keeping the first name seen. */
export function addTopic(
  map: Record<string, TopicCount>,
  slug: string,
  solved: number,
  name?: string,
): void {
  const existing = map[slug];
  if (existing) existing.solved += solved;
  else map[slug] = { name: topicName(slug, name), solved };
}
