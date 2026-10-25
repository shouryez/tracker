import "server-only";
import { sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db, userTag } from "@/lib/db";

// Sheet progress = items whose canonical problem the user has an Accepted
// submission for on any platform, plus items they ticked by hand.
// Callers pass a user id resolved from the session, never one from the client.

/** Pace is measured over this window to estimate a finish date. */
const PACE_DAYS = 14;

export type SheetSummary = {
  id: string;
  slug: string;
  name: string;
  author: string | null;
  sourceUrl: string | null;
  total: number;
  done: number;
  autoTracked: number;
  doneRecently: number;
  following: boolean;
  /** Estimated finish date at the recent pace, or null when there's no recent progress. */
  eta: string | null;
};

const solvedCte = (userId: string) => sql`
  solved as (
    select pp.problem_id, min(s.submitted_at) as first_at
    from submissions s
    join platform_problems pp on pp.id = s.platform_problem_id
    where s.user_id = ${userId} and s.verdict = 'AC' and pp.problem_id is not null
    group by pp.problem_id
  )`;

function eta(total: number, done: number, recent: number, now = Date.now()): string | null {
  if (done >= total || recent === 0) return null;
  const days = Math.ceil((total - done) / (recent / PACE_DAYS));
  return new Date(now + days * 86_400_000).toISOString().slice(0, 10);
}

export async function getSheetSummaries(userId: string): Promise<SheetSummary[]> {
  "use cache";
  cacheTag(userTag(userId), "sheets");
  cacheLife("minutes");

  const rows = (await db().execute(sql`
    with ${solvedCte(userId)},
    item_state as (
      select si.sheet_id, si.problem_id,
             coalesce(sv.first_at, sm.created_at) as done_at,
             (sv.problem_id is not null or sm.item_key is not null) as done
      from sheet_items si
      left join solved sv on sv.problem_id = si.problem_id
      left join sheet_marks sm
        on sm.user_id = ${userId} and sm.sheet_id = si.sheet_id and sm.item_key = si.item_key
    )
    select sh.id, sh.slug, sh.name, sh.author, sh.source_url as "sourceUrl",
           count(*)::int as total,
           count(*) filter (where st.done)::int as done,
           count(st.problem_id)::int as "autoTracked",
           count(*) filter (where st.done and st.done_at > now() - interval '14 days')::int as "doneRecently",
           exists (select 1 from user_sheets us where us.user_id = ${userId} and us.sheet_id = sh.id) as following
    from sheets sh
    join item_state st on st.sheet_id = sh.id
    group by sh.id
    order by sh.position
  `)) as unknown as Omit<SheetSummary, "eta">[];

  return rows.map((r) => ({
    ...r,
    eta: r.following ? eta(r.total, r.done, r.doneRecently) : null,
  }));
}

export type SheetItemView = {
  itemKey: string;
  step: string;
  section: string | null;
  title: string;
  kind: "practice" | "learning";
  tier: string | null;
  url: string | null;
  links: { site: "leetcode" | "geeksforgeeks" | "takeuforward" | "source"; url: string }[];
  tracked: boolean;
  /** "auto" = solved on a tracked platform, "manual" = ticked by hand. */
  status: "auto" | "manual" | null;
};

export type SheetDetail = SheetSummary & { items: SheetItemView[] };

export async function getSheetDetail(userId: string, slug: string): Promise<SheetDetail | null> {
  "use cache";
  cacheTag(userTag(userId), "sheets");
  cacheLife("minutes");

  const summary = (await getSheetSummaries(userId)).find((s) => s.slug === slug);
  if (!summary) return null;

  const items = (await db().execute(sql`
    with ${solvedCte(userId)}
    select si.item_key as "itemKey", si.step, si.section, si.title, si.kind, si.tier, si.url, si.links,
           (si.problem_id is not null) as tracked,
           case when sv.problem_id is not null then 'auto'
                when sm.item_key is not null then 'manual' end as status
    from sheet_items si
    left join solved sv on sv.problem_id = si.problem_id
    left join sheet_marks sm
      on sm.user_id = ${userId} and sm.sheet_id = si.sheet_id and sm.item_key = si.item_key
    where si.sheet_id = ${summary.id}
    order by si.position
  `)) as unknown as SheetItemView[];

  return { ...summary, items };
}
