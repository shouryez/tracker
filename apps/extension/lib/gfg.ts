// GeeksforGeeks page parsing. Pure functions, unit-tested.
import type { VerdictCode } from "@upsolve/contracts/leetcode";

/** "/problems/reverse-a-linked-list/1" → "reverse-a-linked-list". */
export function gfgProblemSlug(pathname: string): string | null {
  const m = /^\/problems\/([a-z0-9-]+)\/\d+(?:\/|$)/i.exec(pathname);
  return m ? m[1]!.toLowerCase() : null;
}

/** "Reverse Linked List | Practice | GeeksforGeeks" → "Reverse Linked List". */
export function gfgTitleFromDocument(title: string): string | null {
  const t = title.split("|")[0]!.trim();
  return t && !/^geeksforgeeks$/i.test(t) ? t.slice(0, 200) : null;
}

/** True for the request GFG makes when the user presses Submit (not Compile & Run). */
export function isGfgSubmitRequest(url: string): boolean {
  return /\/problems\/[a-z0-9-]+\/submit\/compile\/?(?:[?#]|$)/i.test(url);
}

const VERDICTS: [RegExp, VerdictCode][] = [
  [/problem solved successfully/i, "AC"],
  [/compilation error/i, "CE"],
  [/time limit exceeded/i, "TLE"],
  [/memory limit exceeded/i, "MLE"],
  [/runtime error|segmentation fault/i, "RE"],
  [/wrong answer/i, "WA"],
];

/** Verdict from the text of GFG's result panel, or null while it's still judging. */
export function gfgVerdictFromText(text: string): VerdictCode | null {
  for (const [re, verdict] of VERDICTS) if (re.test(text)) return verdict;
  return null;
}

// DsaKaro
