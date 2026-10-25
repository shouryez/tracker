// Persistence for platform sync. Imports use explicit .ts extensions so this file
// also runs under plain Node (see scripts/check-store.ts).
import { sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import type { Platform, RawContestResult, RawProblem, RawSubmission } from "@upsolve/adapters";
import { contestResults, platformProblems, submissions } from "./schema.ts";

// Accepts the shared client or a transaction.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Database = PgDatabase<PgQueryResultHKT, any, any>;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** Inserts or refreshes platform problems. Returns externalId → row id. */
export async function upsertProblems(
  db: Database,
  platform: Platform,
  problems: RawProblem[],
): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  const unique = [...new Map(problems.map((p) => [p.externalId, p])).values()];
  for (const batch of chunk(unique, 500)) {
    const rows = await db
      .insert(platformProblems)
      .values(
        batch.map((p) => ({
          platform,
          externalId: p.externalId,
          slug: p.slug,
          url: p.url,
          title: p.title,
          difficultyRaw: p.difficultyRaw,
          rating: p.rating,
          tags: p.tags,
        })),
      )
      .onConflictDoUpdate({
        target: [platformProblems.platform, platformProblems.externalId],
        set: {
          title: sql`excluded.title`,
          // Never overwrite known difficulty/tags with blanks from a minimal row.
          difficultyRaw: sql`coalesce(excluded.difficulty_raw, ${platformProblems.difficultyRaw})`,
          rating: sql`coalesce(excluded.rating, ${platformProblems.rating})`,
          tags: sql`case when cardinality(excluded.tags) > 0 then excluded.tags else ${platformProblems.tags} end`,
        },
      })
      .returning({ id: platformProblems.id, externalId: platformProblems.externalId });
    for (const r of rows) ids.set(r.externalId, r.id);
  }
  return ids;
}

export type SubmissionRow = {
  platformProblemId: string;
  externalId: string;
  verdict: RawSubmission["verdict"];
  language: string | null;
  runtimeMs: number | null;
  memoryKb: number | null;
  submittedAt: Date;
};

/** Inserts submissions that aren't stored yet. Returns how many were new. */
export async function insertSubmissions(
  db: Database,
  userId: string,
  platform: Platform,
  source: "api" | "extension",
  rows: SubmissionRow[],
): Promise<number> {
  let inserted = 0;
  for (const batch of chunk(rows, 1000)) {
    const out = await db
      .insert(submissions)
      .values(batch.map((r) => ({ ...r, userId, platform, source })))
      .onConflictDoNothing({
        target: [submissions.userId, submissions.platform, submissions.externalId],
      })
      .returning({ id: submissions.id });
    inserted += out.length;
  }
  return inserted;
}

/** Upserts the problems, then inserts submissions that aren't stored yet. Returns rows inserted. */
export async function saveSubmissions(
  db: Database,
  userId: string,
  platform: Platform,
  subs: RawSubmission[],
): Promise<number> {
  if (subs.length === 0) return 0;
  const problemIds = await upsertProblems(
    db,
    platform,
    subs.map((s) => s.problem),
  );
  return insertSubmissions(
    db,
    userId,
    platform,
    "api",
    subs.map((s) => ({
      platformProblemId: problemIds.get(s.problem.externalId)!,
      externalId: s.externalId,
      verdict: s.verdict,
      language: s.language,
      runtimeMs: s.runtimeMs,
      memoryKb: s.memoryKb,
      submittedAt: s.submittedAt,
    })),
  );
}

/** Inserts or refreshes rated contest results. */
export async function saveContests(
  db: Database,
  userId: string,
  platform: Platform,
  contests: RawContestResult[],
): Promise<void> {
  for (const batch of chunk(contests, 500)) {
    await db
      .insert(contestResults)
      .values(batch.map((c) => ({ userId, platform, ...c })))
      .onConflictDoUpdate({
        target: [contestResults.userId, contestResults.platform, contestResults.contestId],
        set: {
          contestName: sql`excluded.contest_name`,
          rank: sql`excluded.rank`,
          oldRating: sql`excluded.old_rating`,
          newRating: sql`excluded.new_rating`,
          solved: sql`excluded.solved`,
          total: sql`excluded.total`,
        },
      });
  }
}
