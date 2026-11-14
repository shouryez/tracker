// Revise the pattern, not just the problem (FINAL-FEATURES A5). Re-solving the same problem
// tests memory of that problem; interviews test transfer. Solving an unseen problem with the
// same pattern, on your own, while a revision is due, clears that revision and counts more.

import { topicsOf, type TopicId } from "./topics.ts";

/** Topics too broad to call a pattern: nearly every problem touches them. */
const BROAD = new Set<TopicId>(["arrays", "strings", "hashing", "sorting", "math"]);

/** The one idea a problem is about: its first specific topic, else its first topic. */
export function mainPattern(tags: readonly string[]): TopicId | null {
  const topics = topicsOf(tags);
  return topics.find((t) => !BROAD.has(t)) ?? topics[0] ?? null;
}

/** True when `candidate` exercises the main pattern of `original`. */
export function isSibling(original: readonly string[], candidate: readonly string[]): boolean {
  const main = mainPattern(original);
  return main !== null && topicsOf(candidate).includes(main);
}
