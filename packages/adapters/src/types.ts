export const PLATFORMS = [
  "leetcode",
  "codeforces",
  "geeksforgeeks",
  "codechef",
  "atcoder",
  "code360",
  "hackerrank",
  "interviewbit",
] as const;

export type Platform = (typeof PLATFORMS)[number];
export type Difficulty = "easy" | "medium" | "hard";
export type Verdict = "AC" | "WA" | "TLE" | "MLE" | "RE" | "CE" | "OTHER";

export type SolvedCounts = {
  total: number;
  easy: number;
  medium: number;
  hard: number;
  /** Solved problems the platform doesn't grade (e.g. unrated Codeforces problems). */
  unknown: number;
};

export type TopicCount = { name: string; solved: number };

/** Profile-level numbers for one platform account, refreshed on every sync. */
export type PlatformSnapshot = {
  handle: string;
  displayName: string | null;
  avatarUrl: string | null;
  solved: SolvedCounts;
  rating: number | null;
  maxRating: number | null;
  /** Platform's own label, e.g. "specialist" or "Top 12%". */
  rankLabel: string | null;
  contests: number;
  /** Submissions per UTC day, keyed YYYY-MM-DD. Roughly the last year. */
  calendar: Record<string, number>;
  /** Solved problems per normalised topic slug. */
  topics: Record<string, TopicCount>;
  fetchedAt: string;
};

export type SyncCursor = {
  /** Highest submission id already stored (Codeforces ids only grow). */
  lastSubmissionId?: number;
};

export type RawProblem = {
  externalId: string;
  slug: string;
  url: string;
  title: string;
  difficulty: Difficulty | null;
  difficultyRaw: string | null;
  rating: number | null;
  tags: string[];
};

export type RawSubmission = {
  externalId: string;
  problem: RawProblem;
  verdict: Verdict;
  language: string | null;
  runtimeMs: number | null;
  memoryKb: number | null;
  submittedAt: Date;
};

export type RawContestResult = {
  contestId: string;
  contestName: string | null;
  at: Date;
  rank: number | null;
  oldRating: number | null;
  newRating: number | null;
  solved: number | null;
  total: number | null;
};

export type VerifyChallenge = {
  /** Code the user puts in their profile, e.g. "dsakaro-7Q2X". */
  code: string;
  /** When the challenge was issued. */
  requestedAt: Date;
};

export type VerifyResult = { ok: true } | { ok: false; reason: string };

export type SubmissionsResult = {
  submissions: RawSubmission[];
  cursor: SyncCursor;
};

export interface PlatformAdapter {
  platform: Platform;
  label: string;
  /** Plain-language steps shown next to the verify button. */
  verifyInstructions(challenge: VerifyChallenge): string;
  /** Throws HandleNotFoundError when the handle doesn't exist. */
  fetchSnapshot(handle: string): Promise<PlatformSnapshot>;
  fetchSubmissions(handle: string, cursor: SyncCursor | null): Promise<SubmissionsResult>;
  fetchContests(handle: string): Promise<RawContestResult[]>;
  verify(handle: string, challenge: VerifyChallenge): Promise<VerifyResult>;
}

export class HandleNotFoundError extends Error {
  constructor(platform: string, handle: string) {
    super(`No ${platform} user called "${handle}"`);
    this.name = "HandleNotFoundError";
  }
}

export class PlatformError extends Error {
  readonly retryable: boolean;
  constructor(message: string, retryable: boolean) {
    super(message);
    this.name = "PlatformError";
    this.retryable = retryable;
  }
}

// DsaKaro
