// Title matching between platforms (PLAN.md §6.1). Conservative on purpose:
// a missed match falls back to a manual tick, a wrong match ticks the wrong problem.

const STOPWORDS = new Set([
  "a",
  "an",
  "the",
  "of",
  "in",
  "on",
  "to",
  "for",
  "and",
  "or",
  "is",
  "are",
  "with",
  "by",
  "from",
  "into",
  "given",
  "find",
  "problem",
  "number",
  "using",
]);

/** Normalised token set for a title, as a stable string. "Reverse a Linked List" → "linked list reverse". */
export function matchKey(title: string): string {
  const words = title
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter(Boolean);
  const tokens = words.filter((t) => !STOPWORDS.has(t));
  const key = [...new Set(tokens)].sort().join(" ");
  // "Infix to Postfix" ≠ "Postfix to Infix": when a title has a direction,
  // word order must match too.
  return words.includes("to") ? `${key}|${tokens.join(" ")}` : key;
}

/** Word-set overlap. Titles with a direction ("X to Y") must also agree on word order. */
function jaccard(a: string, b: string): number {
  if ((a.includes("|") || b.includes("|")) && a.split("|")[1] !== b.split("|")[1]) return 0;
  const A = new Set(a.split("|")[0]!.split(" ").filter(Boolean));
  const B = new Set(b.split("|")[0]!.split(" ").filter(Boolean));
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  return inter / (A.size + B.size - inter);
}

export type MatchCandidate = { id: string; key: string };

/**
 * Best candidate for `title`, or null. Exact key matches win; otherwise needs
 * token overlap ≥ 0.85 and a clear lead (≥ 0.1) over the runner-up.
 */
export function matchTitles(
  title: string,
  candidates: MatchCandidate[],
): { id: string; score: number } | null {
  const key = matchKey(title);
  if (!key) return null;
  const exact = candidates.filter((c) => c.key === key);
  if (exact.length === 1) return { id: exact[0]!.id, score: 1 };
  if (exact.length > 1) return null; // ambiguous: several problems share this title

  let best: { id: string; score: number } | null = null;
  let second = 0;
  for (const c of candidates) {
    const score = jaccard(key, c.key);
    if (!best || score > best.score) {
      second = best?.score ?? 0;
      best = { id: c.id, score };
    } else if (score > second) {
      second = score;
    }
  }
  return best && best.score >= 0.85 && best.score - second >= 0.1 ? best : null;
}

// DsaKaro
