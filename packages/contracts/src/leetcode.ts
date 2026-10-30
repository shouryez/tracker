// No zod here: the extension imports this file directly to keep its bundle small.

export type VerdictCode = "AC" | "WA" | "TLE" | "MLE" | "RE" | "CE" | "OTHER";

/** LeetCode status_msg / status_display values, normalised. */
export const LEETCODE_VERDICTS: Record<string, VerdictCode> = {
  Accepted: "AC",
  "Wrong Answer": "WA",
  "Time Limit Exceeded": "TLE",
  "Memory Limit Exceeded": "MLE",
  "Runtime Error": "RE",
  "Compile Error": "CE",
};

export function leetcodeVerdict(status: string | null | undefined): VerdictCode {
  return (status && LEETCODE_VERDICTS[status]) || "OTHER";
}

export const MISTAKE_TAGS = [
  "edge-case",
  "overflow",
  "off-by-one",
  "wrong-approach",
  "too-slow",
  "misread",
  "syntax",
] as const;

export type MistakeTag = (typeof MISTAKE_TAGS)[number];

// DsaKaro
