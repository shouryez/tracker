import { politeFetch, utcDay } from "./http.ts";
import { addTopic, codeforcesTagToTopic } from "./topics.ts";
import {
  HandleNotFoundError,
  PlatformError,
  type Difficulty,
  type PlatformAdapter,
  type PlatformSnapshot,
  type RawContestResult,
  type RawProblem,
  type RawSubmission,
  type SyncCursor,
  type TopicCount,
  type Verdict,
} from "./types.ts";

const API = "https://codeforces.com/api";
const MIN_GAP_MS = 2_100;
const PAGE = 1_000;
/** The problem users submit a compilation error to, to prove they own the handle. */
export const VERIFY_PROBLEM = { contestId: 4, index: "A", name: "Watermelon" } as const;

type CfProblem = {
  contestId?: number;
  problemsetName?: string;
  index: string;
  name: string;
  rating?: number;
  tags: string[];
};
type CfSubmission = {
  id: number;
  creationTimeSeconds: number;
  problem: CfProblem;
  programmingLanguage: string;
  verdict?: string;
  timeConsumedMillis: number;
  memoryConsumedBytes: number;
};
type CfUser = {
  handle: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  titlePhoto?: string;
  rating?: number;
  maxRating?: number;
  rank?: string;
};
type CfRatingChange = {
  contestId: number;
  contestName: string;
  rank: number;
  ratingUpdateTimeSeconds: number;
  oldRating: number;
  newRating: number;
};

async function call<T>(method: string, params: Record<string, string | number>, handle: string) {
  const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]));
  const res = await politeFetch(`${API}/${method}?${qs}`, { minGapMs: MIN_GAP_MS });
  const body = (await res.json().catch(() => null)) as
    { status: "OK"; result: T } | { status: "FAILED"; comment: string } | null;
  if (!body) throw new PlatformError("Codeforces sent an unreadable response.", true);
  if (body.status === "FAILED") {
    if (/not found/i.test(body.comment)) throw new HandleNotFoundError("Codeforces", handle);
    throw new PlatformError(`Codeforces: ${body.comment}`, /limit/i.test(body.comment));
  }
  return body.result;
}

/** Codeforces problem rating → our three buckets (DESIGN.md §4.1). */
export function ratingToDifficulty(rating: number | undefined): Difficulty | null {
  if (rating === undefined) return null;
  if (rating < 1400) return "easy";
  if (rating < 1900) return "medium";
  return "hard";
}

function mapVerdict(v: string | undefined): Verdict {
  switch (v) {
    case "OK":
      return "AC";
    case "WRONG_ANSWER":
      return "WA";
    case "TIME_LIMIT_EXCEEDED":
    case "IDLENESS_LIMIT_EXCEEDED":
      return "TLE";
    case "MEMORY_LIMIT_EXCEEDED":
      return "MLE";
    case "RUNTIME_ERROR":
      return "RE";
    case "COMPILATION_ERROR":
      return "CE";
    default:
      return "OTHER";
  }
}

function problemKey(p: CfProblem): string | null {
  // Gym/acm.sgu problems have no contestId; skip them.
  return p.contestId ? `${p.contestId}${p.index}` : null;
}

function toRawProblem(p: CfProblem): RawProblem | null {
  const key = problemKey(p);
  if (!key || !p.contestId) return null;
  return {
    externalId: key,
    slug: key,
    url: `https://codeforces.com/problemset/problem/${p.contestId}/${p.index}`,
    title: p.name,
    difficulty: ratingToDifficulty(p.rating),
    difficultyRaw: p.rating !== undefined ? String(p.rating) : null,
    rating: p.rating ?? null,
    tags: p.tags,
  };
}

/**
 * Every Codeforces problem, grouped by contest id, for upsolve lists. One call
 * (≈10,000 problems); callers should cache the result for a day.
 */
export async function codeforcesProblemsByContest(): Promise<Map<string, RawProblem[]>> {
  const { problems } = await call<{ problems: CfProblem[] }>("problemset.problems", {}, "");
  const byContest = new Map<string, RawProblem[]>();
  for (const p of problems) {
    const raw = toRawProblem(p);
    if (!raw || !p.contestId) continue;
    const list = byContest.get(String(p.contestId)) ?? [];
    list.push(raw);
    byContest.set(String(p.contestId), list);
  }
  // The API lists problems newest index first; contests read A, B, C…
  for (const list of byContest.values())
    list.sort((a, b) => a.externalId.localeCompare(b.externalId, "en", { numeric: true }));
  return byContest;
}

/** Builds solved counts, topics and calendar from a full submission list. */
export function summariseSubmissions(subs: CfSubmission[]) {
  const solved = { total: 0, easy: 0, medium: 0, hard: 0, unknown: 0 };
  const topics: Record<string, TopicCount> = {};
  const calendar: Record<string, number> = {};
  const seen = new Set<string>();
  const yearAgo = Date.now() / 1000 - 366 * 86_400;

  for (const s of subs) {
    if (s.creationTimeSeconds >= yearAgo) {
      const day = utcDay(s.creationTimeSeconds);
      calendar[day] = (calendar[day] ?? 0) + 1;
    }
    if (s.verdict !== "OK") continue;
    const key = problemKey(s.problem);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    solved.total++;
    solved[ratingToDifficulty(s.problem.rating) ?? "unknown"]++;
    for (const tag of new Set(s.problem.tags.map(codeforcesTagToTopic))) addTopic(topics, tag, 1);
  }
  return { solved, topics, calendar };
}

const RANK_LABEL = (rank: string | undefined) =>
  rank ? rank.replace(/\b\w/g, (c) => c.toUpperCase()) : null;

export const codeforces: PlatformAdapter = {
  platform: "codeforces",
  label: "Codeforces",

  verifyInstructions() {
    return `Submit any code that fails to compile to problem ${VERIFY_PROBLEM.contestId}${VERIFY_PROBLEM.index} (${VERIFY_PROBLEM.name}), then press Verify within 15 minutes. A compilation error doesn't affect your rating or stats.`;
  },

  async fetchSnapshot(handle) {
    const [user] = await call<CfUser[]>("user.info", { handles: handle }, handle);
    if (!user) throw new HandleNotFoundError("Codeforces", handle);
    const subs = await call<CfSubmission[]>("user.status", { handle: user.handle }, handle);
    const ratings = await call<CfRatingChange[]>("user.rating", { handle: user.handle }, handle);
    const { solved, topics, calendar } = summariseSubmissions(subs);
    const name = [user.firstName, user.lastName].filter(Boolean).join(" ");

    return {
      handle: user.handle,
      displayName: name || null,
      avatarUrl: user.titlePhoto ?? user.avatar ?? null,
      solved,
      rating: user.rating ?? null,
      maxRating: user.maxRating ?? null,
      rankLabel: RANK_LABEL(user.rank),
      contests: ratings.length,
      calendar,
      topics,
      fetchedAt: new Date().toISOString(),
    } satisfies PlatformSnapshot;
  },

  async fetchSubmissions(handle, cursor: SyncCursor | null) {
    const out: RawSubmission[] = [];
    const since = cursor?.lastSubmissionId ?? 0;
    let maxId = since;

    // Newest first; page until we reach what we already have.
    for (let from = 1; ; from += PAGE) {
      const page = await call<CfSubmission[]>("user.status", { handle, from, count: PAGE }, handle);
      let reachedKnown = false;
      for (const s of page) {
        if (s.id <= since) {
          reachedKnown = true;
          break;
        }
        maxId = Math.max(maxId, s.id);
        const problem = toRawProblem(s.problem);
        if (!problem) continue;
        out.push({
          externalId: String(s.id),
          problem,
          verdict: mapVerdict(s.verdict),
          language: s.programmingLanguage,
          runtimeMs: s.timeConsumedMillis,
          memoryKb: Math.round(s.memoryConsumedBytes / 1024),
          submittedAt: new Date(s.creationTimeSeconds * 1000),
        });
      }
      if (reachedKnown || page.length < PAGE) break;
    }
    return { submissions: out, cursor: { lastSubmissionId: maxId } };
  },

  async fetchContests(handle) {
    const changes = await call<CfRatingChange[]>("user.rating", { handle }, handle);
    return changes.map((c): RawContestResult => ({
      contestId: String(c.contestId),
      contestName: c.contestName,
      at: new Date(c.ratingUpdateTimeSeconds * 1000),
      rank: c.rank,
      oldRating: c.oldRating,
      newRating: c.newRating,
      solved: null,
      total: null,
    }));
  },

  async verify(handle, challenge) {
    const recent = await call<CfSubmission[]>(
      "user.status",
      { handle, from: 1, count: 20 },
      handle,
    );
    const after = challenge.requestedAt.getTime() / 1000 - 60;
    const found = recent.some(
      (s) =>
        s.problem.contestId === VERIFY_PROBLEM.contestId &&
        s.problem.index === VERIFY_PROBLEM.index &&
        s.verdict === "COMPILATION_ERROR" &&
        s.creationTimeSeconds >= after,
    );
    if (found) return { ok: true };
    const expired = Date.now() - challenge.requestedAt.getTime() > 15 * 60_000;
    return {
      ok: false,
      reason: expired
        ? "That challenge expired. Start verification again for a fresh 15 minutes."
        : `No compilation error on ${VERIFY_PROBLEM.contestId}${VERIFY_PROBLEM.index} yet. Submissions can take a minute to appear.`,
    };
  },
};
