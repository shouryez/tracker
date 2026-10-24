import { politeFetch, utcDay } from "./http.ts";
import { addTopic } from "./topics.ts";
import {
  HandleNotFoundError,
  PlatformError,
  type Difficulty,
  type PlatformAdapter,
  type PlatformSnapshot,
  type RawContestResult,
  type RawProblem,
  type RawSubmission,
  type TopicCount,
} from "./types.ts";

// Unofficial public endpoint (PLAN.md §4). All queries live in this file so
// a schema change on LeetCode's side only breaks one place.
const ENDPOINT = "https://leetcode.com/graphql";
const MIN_GAP_MS = 400;

async function gql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const res = await politeFetch(ENDPOINT, {
    method: "POST",
    minGapMs: MIN_GAP_MS,
    headers: { "Content-Type": "application/json", Referer: "https://leetcode.com" },
    body: JSON.stringify({ query, variables }),
  });
  const body = (await res.json().catch(() => null)) as {
    data?: T;
    errors?: { message: string }[];
  } | null;
  if (!body?.data) {
    const msg = body?.errors?.[0]?.message ?? `HTTP ${res.status}`;
    throw new PlatformError(`LeetCode: ${msg}`, true);
  }
  return body.data;
}

const PROFILE_QUERY = `
query profile($u: String!) {
  matchedUser(username: $u) {
    username
    profile { realName aboutMe userAvatar ranking }
    submitStatsGlobal { acSubmissionNum { difficulty count } }
    tagProblemCounts {
      advanced { tagName tagSlug problemsSolved }
      intermediate { tagName tagSlug problemsSolved }
      fundamental { tagName tagSlug problemsSolved }
    }
    userCalendar { submissionCalendar }
  }
  userContestRanking(username: $u) { rating attendedContestsCount topPercentage }
}`;

type ProfileData = {
  matchedUser: {
    username: string;
    profile: { realName: string; aboutMe: string; userAvatar: string; ranking: number };
    submitStatsGlobal: { acSubmissionNum: { difficulty: string; count: number }[] };
    tagProblemCounts: Record<
      "advanced" | "intermediate" | "fundamental",
      { tagName: string; tagSlug: string; problemsSolved: number }[]
    >;
    userCalendar: { submissionCalendar: string } | null;
  } | null;
  userContestRanking: {
    rating: number;
    attendedContestsCount: number;
    topPercentage: number | null;
  } | null;
};

async function profile(handle: string) {
  const data = await gql<ProfileData>(PROFILE_QUERY, { u: handle });
  if (!data.matchedUser) throw new HandleNotFoundError("LeetCode", handle);
  return { user: data.matchedUser, contest: data.userContestRanking };
}

const QUESTION_QUERY = `
query question($s: String!) {
  question(titleSlug: $s) { questionFrontendId title difficulty topicTags { slug } }
}`;

type QuestionData = {
  question: {
    questionFrontendId: string;
    title: string;
    difficulty: "Easy" | "Medium" | "Hard";
    topicTags: { slug: string }[];
  } | null;
};

async function question(slug: string): Promise<RawProblem> {
  const { question: q } = await gql<QuestionData>(QUESTION_QUERY, { s: slug });
  return {
    externalId: slug,
    slug,
    url: `https://leetcode.com/problems/${slug}/`,
    title: q ? `${q.questionFrontendId}. ${q.title}` : slug,
    difficulty: q ? (q.difficulty.toLowerCase() as Difficulty) : null,
    difficultyRaw: q?.difficulty ?? null,
    rating: null,
    tags: q?.topicTags.map((t) => t.slug) ?? [],
  };
}

export function parseCalendar(raw: string | undefined | null): Record<string, number> {
  const out: Record<string, number> = {};
  if (!raw) return out;
  try {
    for (const [ts, n] of Object.entries(JSON.parse(raw) as Record<string, number>)) {
      const day = utcDay(Number(ts));
      out[day] = (out[day] ?? 0) + n;
    }
  } catch {
    // Malformed calendar: treat as no activity rather than failing the sync.
  }
  return out;
}

export const leetcode: PlatformAdapter = {
  platform: "leetcode",
  label: "LeetCode",

  verifyInstructions({ code }) {
    return `Open leetcode.com → your avatar → Profile → Edit Profile, paste ${code} into the Summary field and save. Then press Verify. You can remove it afterwards.`;
  },

  async fetchSnapshot(handle) {
    const { user, contest } = await profile(handle);
    const ac = Object.fromEntries(
      user.submitStatsGlobal.acSubmissionNum.map((r) => [r.difficulty, r.count]),
    );
    const topics: Record<string, TopicCount> = {};
    for (const level of ["fundamental", "intermediate", "advanced"] as const) {
      for (const t of user.tagProblemCounts[level]) {
        if (t.problemsSolved > 0) addTopic(topics, t.tagSlug, t.problemsSolved, t.tagName);
      }
    }
    return {
      handle: user.username,
      displayName: user.profile.realName || null,
      avatarUrl: user.profile.userAvatar || null,
      solved: {
        total: ac.All ?? 0,
        easy: ac.Easy ?? 0,
        medium: ac.Medium ?? 0,
        hard: ac.Hard ?? 0,
        unknown: 0,
      },
      rating: contest?.attendedContestsCount ? Math.round(contest.rating) : null,
      maxRating: null,
      rankLabel:
        contest?.attendedContestsCount && contest.topPercentage != null
          ? `Top ${contest.topPercentage}%`
          : null,
      contests: contest?.attendedContestsCount ?? 0,
      calendar: parseCalendar(user.userCalendar?.submissionCalendar),
      topics,
      fetchedAt: new Date().toISOString(),
    } satisfies PlatformSnapshot;
  },

  async fetchSubmissions(handle) {
    // Public API only exposes the last ~20 accepted submissions.
    // Full history comes from the extension in Phase 2.
    const data = await gql<{
      recentAcSubmissionList:
        { id: string; titleSlug: string; timestamp: string; lang: string }[] | null;
    }>(
      `query recent($u: String!) { recentAcSubmissionList(username: $u, limit: 20) { id titleSlug timestamp lang } }`,
      { u: handle },
    );
    const recent = data.recentAcSubmissionList ?? [];
    const problems = new Map<string, RawProblem>();
    const submissions: RawSubmission[] = [];
    for (const s of recent) {
      let problem = problems.get(s.titleSlug);
      if (!problem) {
        problem = await question(s.titleSlug);
        problems.set(s.titleSlug, problem);
      }
      submissions.push({
        externalId: s.id,
        problem,
        verdict: "AC",
        language: s.lang,
        runtimeMs: null,
        memoryKb: null,
        submittedAt: new Date(Number(s.timestamp) * 1000),
      });
    }
    return { submissions, cursor: {} };
  },

  async fetchContests(handle) {
    const data = await gql<{
      userContestRankingHistory:
        | {
            attended: boolean;
            rating: number;
            ranking: number;
            problemsSolved: number;
            totalProblems: number;
            contest: { title: string; startTime: number };
          }[]
        | null;
    }>(
      `query history($u: String!) { userContestRankingHistory(username: $u) { attended rating ranking problemsSolved totalProblems contest { title startTime } } }`,
      { u: handle },
    );
    const attended = (data.userContestRankingHistory ?? []).filter((h) => h.attended);
    return attended.map((h, i): RawContestResult => {
      const prev = attended[i - 1];
      return {
        contestId: h.contest.title.toLowerCase().replace(/\s+/g, "-"),
        contestName: h.contest.title,
        at: new Date(h.contest.startTime * 1000),
        rank: h.ranking || null,
        oldRating: prev ? Math.round(prev.rating) : null,
        newRating: Math.round(h.rating),
        solved: h.problemsSolved,
        total: h.totalProblems,
      };
    });
  },

  async verify(handle, { code }) {
    const { user } = await profile(handle);
    if (user.profile.aboutMe?.includes(code)) return { ok: true };
    return {
      ok: false,
      reason: `Couldn't find ${code} in your LeetCode profile Summary yet. Save it there and try again.`,
    };
  },
};
