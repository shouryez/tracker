// Per-topic guidance for the in-page hints and the pre-submit checklist.
// Deliberately general ("the shape of the idea"), never a problem's solution.
import type { TopicId } from "./topics.ts";

export type TopicGuide = {
  /** Hint 2: the key idea of the pattern, in one or two sentences. */
  idea: string;
  /** Edge cases worth checking before you submit. */
  checks: string[];
};

export const TOPIC_GUIDE: Record<TopicId, TopicGuide> = {
  arrays: {
    idea: "Look for a single pass with running state (prefix sums, best-so-far, counts) instead of nested loops.",
    checks: [
      "Empty or single-element array",
      "All negatives / all equal values",
      "Index bounds at both ends",
    ],
  },
  strings: {
    idea: "Think in terms of character counts, two indices, or building the answer in a buffer rather than slicing repeatedly.",
    checks: ["Empty string", "Case sensitivity and spaces", "Repeated characters"],
  },
  hashing: {
    idea: "Trade memory for time: store what you've seen (value → index/count) so each lookup is O(1).",
    checks: ["Duplicates", "Missing key default", "Collisions of negative or zero values"],
  },
  "two-pointers": {
    idea: "Sort (if order doesn't matter) and move two indices toward each other or in the same direction based on a comparison.",
    checks: ["Pointers crossing", "Duplicate values when skipping", "Length 0 or 1"],
  },
  "sliding-window": {
    idea: "Grow the window on the right, shrink from the left while the window is invalid, and update the answer at each step.",
    checks: ["Window of size 0", "Shrink condition off by one", "Counts dropping to zero"],
  },
  "binary-search": {
    idea: "Binary search the answer space: find a monotonic yes/no condition and search for the boundary.",
    checks: [
      "lo/hi bounds inclusive or exclusive",
      "mid overflow (lo + (hi - lo) / 2)",
      "Infinite loop when lo = mid",
    ],
  },
  sorting: {
    idea: "Sorting first often turns the problem into a greedy or two-pointer scan; think about what order makes the decision local.",
    checks: ["Stable vs unstable ties", "Custom comparator direction", "Already-sorted input"],
  },
  "linked-list": {
    idea: "Use a dummy head and fast/slow pointers; draw the pointer changes before writing them.",
    checks: ["Empty list and single node", "Losing the next pointer while relinking", "Cycle"],
  },
  "stack-queue": {
    idea: "A monotonic stack answers 'next greater/smaller'; a queue or deque keeps order for BFS or window maximums.",
    checks: [
      "Popping an empty stack",
      "Elements left on the stack at the end",
      "Equal values: strict or non-strict",
    ],
  },
  heap: {
    idea: "Keep only the k best candidates in a heap, or merge sorted streams by always taking the current minimum.",
    checks: ["Min-heap vs max-heap direction", "k larger than n", "Stale entries (lazy deletion)"],
  },
  recursion: {
    idea: "Define the choice at each step, recurse, then undo the choice (backtrack). Prune branches that can't lead to an answer.",
    checks: [
      "Base case",
      "Copying the path when saving an answer",
      "Duplicate results from equal elements",
    ],
  },
  trees: {
    idea: "Decide what each recursive call returns for its subtree and combine children's answers at the parent.",
    checks: ["Null root", "Skewed (linked-list-like) tree depth", "Values that can be negative"],
  },
  graphs: {
    idea: "Model states as nodes; BFS for shortest steps, DFS/union-find for connectivity, topological order for dependencies.",
    checks: ["Visited set to avoid cycles", "Disconnected components", "1-based vs 0-based nodes"],
  },
  dp: {
    idea: "Name the state (what changes between subproblems), write the transition, then pick an order that fills smaller states first.",
    checks: [
      "Base cases and initial values",
      "Memoising every state (TLE otherwise)",
      "Overflow in counts",
    ],
  },
  greedy: {
    idea: "Find a local choice you can prove never hurts (often after sorting by end time, ratio or deadline).",
    checks: ["A counterexample to the greedy rule", "Ties in the sort key", "Empty input"],
  },
  bits: {
    idea: "Think bit by bit: XOR cancels pairs, x & (x - 1) drops the lowest set bit, masks represent subsets.",
    checks: [
      "Negative numbers and sign bit",
      "Shifts beyond 31/63 bits",
      "Operator precedence with &",
    ],
  },
  math: {
    idea: "Look for a formula, invariant or modular property before simulating; work with counts, not lists.",
    checks: ["Overflow (use 64-bit)", "Modulo of negatives", "Zero and one"],
  },
  trie: {
    idea: "Store words character by character in a tree so prefix checks walk one node per character.",
    checks: ["End-of-word marker", "Empty string", "Character set size (lowercase only?)"],
  },
};

/** What each mistake tag reminds you to check. */
export const MISTAKE_CHECKS: Record<string, string> = {
  "edge-case": "Run the smallest inputs by hand (empty, one element, all same)",
  overflow: "Use 64-bit integers where sums or products can grow",
  "off-by-one": "Re-check loop bounds and inclusive/exclusive indices",
  "wrong-approach": "Say the approach out loud before coding; check it against the examples",
  "too-slow": "Estimate the complexity against the constraints before submitting",
  misread: "Re-read the statement: what exactly is returned?",
  syntax: "Compile once on the sample before submitting",
};

export const MISTAKE_LABELS: Record<string, string> = {
  "edge-case": "Edge case",
  overflow: "Overflow",
  "off-by-one": "Off by one",
  "wrong-approach": "Wrong approach",
  "too-slow": "Too slow",
  misread: "Misread",
  syntax: "Syntax",
};

// DsaKaro
