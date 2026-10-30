// The DSA topics we score mastery on, and which platform tags feed each one.
// Tags come from LeetCode (slugs), GeeksforGeeks (slugs) and Codeforces
// (already mapped to LeetCode slugs by @upsolve/adapters).

export const TOPICS = [
  { id: "arrays", label: "Arrays", tags: ["array", "arrays", "matrix", "prefix-sum"] },
  { id: "strings", label: "Strings", tags: ["string", "strings", "string-matching", "palindrome"] },
  { id: "hashing", label: "Hashing", tags: ["hash-table", "hash", "map", "counting"] },
  { id: "two-pointers", label: "Two pointers", tags: ["two-pointers", "two-pointer-algorithm"] },
  { id: "sliding-window", label: "Sliding window", tags: ["sliding-window", "monotonic-queue"] },
  { id: "binary-search", label: "Binary search", tags: ["binary-search"] },
  { id: "sorting", label: "Sorting", tags: ["sorting", "merge-sort", "counting-sort"] },
  {
    id: "linked-list",
    label: "Linked list",
    tags: ["linked-list", "doubly-linked-list", "circular-linked-list"],
  },
  {
    id: "stack-queue",
    label: "Stack & queue",
    tags: ["stack", "queue", "monotonic-stack", "deque"],
  },
  { id: "heap", label: "Heap", tags: ["heap-priority-queue", "heap", "priority-queue"] },
  { id: "recursion", label: "Recursion & backtracking", tags: ["recursion", "backtracking"] },
  { id: "trees", label: "Trees", tags: ["tree", "binary-tree", "binary-search-tree"] },
  {
    id: "graphs",
    label: "Graphs",
    tags: [
      "graph",
      "depth-first-search",
      "breadth-first-search",
      "dfs",
      "bfs",
      "topological-sort",
      "shortest-path",
      "union-find",
      "disjoint-set",
    ],
  },
  {
    id: "dp",
    label: "Dynamic programming",
    tags: ["dynamic-programming", "memoization", "knapsack-problem"],
  },
  { id: "greedy", label: "Greedy", tags: ["greedy"] },
  { id: "bits", label: "Bit manipulation", tags: ["bit-manipulation", "bit-magic", "bitmask"] },
  {
    id: "math",
    label: "Math",
    tags: ["math", "mathematics", "number-theory", "combinatorics", "prime-number"],
  },
  { id: "trie", label: "Trie", tags: ["trie"] },
] as const;

export type TopicId = (typeof TOPICS)[number]["id"];

const BY_TAG = new Map<string, TopicId>(
  TOPICS.flatMap((t) => t.tags.map((tag) => [tag, t.id] as const)),
);

export const topicLabel = (id: TopicId) => TOPICS.find((t) => t.id === id)!.label;

/** Our topics for a problem's platform tags (deduplicated, in TOPICS order). */
export function topicsOf(tags: readonly string[]): TopicId[] {
  const found = new Set(tags.map((t) => BY_TAG.get(t)).filter((t) => t !== undefined));
  return TOPICS.map((t) => t.id).filter((id) => found.has(id));
}

export const isTopicId = (v: string): v is TopicId => TOPICS.some((t) => t.id === v);

// DsaKaro
