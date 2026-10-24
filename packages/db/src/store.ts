// Persistence for platform sync. Imports use explicit .ts extensions so this file
// also runs under plain Node (see store.check.ts).
import { sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import type { Platform, RawContestResult, RawSubmission } from "@upsolve/adapters";
import { contestResults, platformProblems, submissions } from "./schema.ts";

// Accepts the shared client or a transaction.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Database = PgDatabase<PgQueryResultHKT, any, any>;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** Upserts the problems, then inserts submissions that aren't stored yet. Returns rows inserted. */
export async function saveSubmissions(
  db: Database,
  userId: string,
  platform: Platform,
  subs: RawSubmission[],
): Promise<number> {
  if (subs.length === 0) return 0;

  const problems = new Map(subs.map((s) => [s.problem.externalId, s.problem]));
  const problemIds = new Map<string, string>();

  for (const batch of chunk([...problems.values()], 500)) {
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
          difficultyRaw: sql`excluded.difficulty_raw`,
          rating: sql`excluded.rating`,
          tags: sql`excluded.tags`,
        },
      })
      .returning({ id: platformProblems.id, externalId: platformProblems.externalId });
    for (const r of rows) problemIds.set(r.externalId, r.id);
  }

  let inserted = 0;
  for (const batch of chunk(subs, 1000)) {
    const rows = await db
      .insert(submissions)
      .values(
        batch.map((s) => ({
          userId,
          platformProblemId: problemIds.get(s.problem.externalId)!,
          platform,
          externalId: s.externalId,
          verdict: s.verdict,
          language: s.language,
          runtimeMs: s.runtimeMs,
          memoryKb: s.memoryKb,
          submittedAt: s.submittedAt,
          source: "api" as const,
        })),
      )
      .onConflictDoNothing({ target: [submissions.platform, submissions.externalId] })
      .returning({ id: submissions.id });
    inserted += rows.length;
  }
  return inserted;
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
