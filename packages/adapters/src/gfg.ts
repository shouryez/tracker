import { politeFetch } from "./http.ts";
import {
  HandleNotFoundError,
  PlatformError,
  type Difficulty,
  type PlatformAdapter,
  type PlatformSnapshot,
  type RawProblem,
  type RawSubmission,
} from "./types.ts";

// GeeksforGeeks has no official API. These are the public endpoints its own
// profile and practice pages call; all GFG-specific parsing lives here.
const PROFILE = "https://authapi.geeksforgeeks.org/api-get/user-profile-info/";
const SOLVED = "https://practiceapi.geeksforgeeks.org/api/v1/user/problems/submissions/";
const CATALOG = "https://practiceapi.geeksforgeeks.org/api/vr/problems/";
const MIN_GAP_MS = 500;

type Profile = {
  name: string | null;
  designation: string | null;
  profile_image_url: string | null;
  score: number;
  total_problems_solved: number;
  pod_solved_longest_streak: number;
};

/** GFG difficulty bucket → ours. School and Basic are below Easy on GFG. */
export function gfgDifficulty(bucket: string | null | undefined): Difficulty | null {
  switch ((bucket ?? "").toLowerCase()) {
    case "school":
    case "basic":
    case "easy":
      return "easy";
    case "medium":
      return "medium";
    case "hard":
      return "hard";
    default:
      return null;
  }
}

export const gfgProblemUrl = (slug: string) => `https://www.geeksforgeeks.org/problems/${slug}/1`;

/** "2026-10-17 14:39:28" in IST → Date. */
export function parseGfgTime(s: string): Date | null {
  const m = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})$/.exec(s);
  return m ? new Date(`${m[1]}T${m[2]}+05:30`) : null;
}

type SolvedEntry = { slug: string; pname: string; lang: string; user_subtime: string };
type SolvedResponse = {
  status: string;
  count: number;
  result: Record<string, Record<string, SolvedEntry>>;
};

async function profile(handle: string): Promise<Profile> {
  const qs = new URLSearchParams({ handle, article_count: "false", redirect: "true" });
  const res = await politeFetch(`${PROFILE}?${qs}`, { minGapMs: MIN_GAP_MS });
  const body = (await res.json().catch(() => null)) as { data?: Profile | null } | null;
  if (res.status === 404 || !body?.data) throw new HandleNotFoundError("GeeksforGeeks", handle);
  return body.data;
}

/** Every solved problem with its difficulty bucket, as RawSubmissions (one per problem). */
export function solvedToSubmissions(res: SolvedResponse): RawSubmission[] {
  const out: RawSubmission[] = [];
  for (const [bucket, problems] of Object.entries(res.result ?? {})) {
    for (const [problemId, p] of Object.entries(problems)) {
      const at = parseGfgTime(p.user_subtime);
      if (!at || !/^[a-z0-9-]+$/i.test(p.slug)) continue;
      out.push({
        // GFG only exposes the latest accepted solve per problem, not each submission.
        externalId: `ac-${problemId}`,
        problem: {
          externalId: p.slug,
          slug: p.slug,
          url: gfgProblemUrl(p.slug),
          title: p.pname,
          difficulty: gfgDifficulty(bucket),
          difficultyRaw: bucket,
          rating: null,
          tags: [],
        },
        verdict: "AC",
        language: p.lang?.slice(0, 40) ?? null,
        runtimeMs: null,
        memoryKb: null,
        submittedAt: at,
      });
    }
  }
  return out;
}

async function solved(handle: string): Promise<SolvedResponse> {
  const res = await politeFetch(SOLVED, {
    method: "POST",
    minGapMs: MIN_GAP_MS,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ handle, requestType: "", year: "", month: "" }),
  });
  const body = (await res.json().catch(() => null)) as SolvedResponse | null;
  if (!body || body.status !== "success") {
    throw new PlatformError("GeeksforGeeks: couldn't read solved problems.", true);
  }
  return body;
}

type CatalogResponse = {
  total: number;
  next: number | null;
  results: {
    id: number;
    problem_name: string;
    slug: string;
    difficulty: string;
    tags?: { topic_tags?: string[] };
  }[];
};

/** One page (30 problems) of GFG's public problem list. */
export async function gfgCatalogPage(
  page: number,
): Promise<{ total: number; hasNext: boolean; problems: RawProblem[] }> {
  const qs = new URLSearchParams({
    pageMode: "explore",
    page: String(page),
    sortBy: "submissions",
  });
  const res = await politeFetch(`${CATALOG}?${qs}`, { minGapMs: MIN_GAP_MS });
  const body = (await res.json().catch(() => null)) as CatalogResponse | null;
  if (!body?.results) throw new PlatformError("GeeksforGeeks: problem list unavailable", true);
  return {
    total: body.total,
    hasNext: body.next !== null,
    problems: body.results
      .filter((p) => /^[a-z0-9-]+$/i.test(p.slug))
      .map((p) => ({
        externalId: p.slug,
        slug: p.slug,
        url: gfgProblemUrl(p.slug),
        title: p.problem_name.trim(),
        difficulty: gfgDifficulty(p.difficulty),
        difficultyRaw: p.difficulty,
        rating: null,
        tags: (p.tags?.topic_tags ?? []).map((t) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-")),
      })),
  };
}

export const gfg: PlatformAdapter = {
  platform: "geeksforgeeks",
  label: "GeeksforGeeks",

  verifyInstructions({ code }) {
    return `On geeksforgeeks.org open your profile → Edit Profile, put ${code} in the Designation field and save. Then press Verify. You can change it back afterwards.`;
  },

  async fetchSnapshot(handle) {
    const p = await profile(handle);
    const s = await solved(handle);
    const subs = solvedToSubmissions(s);
    const counts = { total: 0, easy: 0, medium: 0, hard: 0, unknown: 0 };
    const calendar: Record<string, number> = {};
    const yearAgo = Date.now() - 366 * 86_400_000;
    for (const sub of subs) {
      counts.total++;
      counts[sub.problem.difficulty ?? "unknown"]++;
      if (sub.submittedAt.getTime() >= yearAgo) {
        const day = sub.submittedAt.toISOString().slice(0, 10);
        calendar[day] = (calendar[day] ?? 0) + 1;
      }
    }
    return {
      handle,
      displayName: p.name?.trim() || null,
      avatarUrl: p.profile_image_url,
      solved: counts,
      rating: null,
      maxRating: null,
      rankLabel: p.score ? `Score ${p.score}` : null,
      contests: 0,
      calendar,
      topics: {},
      fetchedAt: new Date().toISOString(),
    } satisfies PlatformSnapshot;
  },

  async fetchSubmissions(handle) {
    return { submissions: solvedToSubmissions(await solved(handle)), cursor: {} };
  },

  async fetchContests() {
    return [];
  },

  async verify(handle, { code }) {
    const p = await profile(handle);
    if (p.designation?.includes(code) || p.name?.includes(code)) return { ok: true };
    return {
      ok: false,
      reason: `Couldn't find ${code} in your GeeksforGeeks Designation yet. Save it there and try again.`,
    };
  },
};
