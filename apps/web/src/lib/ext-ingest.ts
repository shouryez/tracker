import "server-only";
import { sql } from "drizzle-orm";
import type { ExtHistoryItem, ExtSession } from "@upsolve/contracts";
import { insertSubmissions, linkCatalog, practiceSessions } from "@upsolve/db";
import { db } from "@/lib/db";
import { ensureGfgProblems, ensureLeetcodeProblems } from "@/lib/leetcode-problems";

/** Stores sessions from the extension. Re-sending a session updates the same row. */
export async function saveExtSessions(userId: string, sessions: ExtSession[]): Promise<number> {
  const forPlatform = (p: ExtSession["platform"]) =>
    sessions.filter((s) => s.platform === p).map((s) => ({ slug: s.titleSlug, title: s.title }));
  const problemIds = {
    leetcode: await ensureLeetcodeProblems(forPlatform("leetcode")),
    geeksforgeeks: await ensureGfgProblems(forPlatform("geeksforgeeks")),
  };
  await linkCatalog(db());

  for (const s of sessions) {
    const platformProblemId = problemIds[s.platform].get(s.titleSlug)!;
    const values = {
      userId,
      clientId: s.clientId,
      platformProblemId,
      mode: s.mode,
      startedAt: new Date(s.startedAt),
      endedAt: s.endedAt ? new Date(s.endedAt) : null,
      activeMs: s.activeMs,
      idleMs: s.idleMs,
      submits: s.submissions.length,
      outcome: s.outcome,
      independence: s.independence,
      note: s.note,
      mistakeTags: s.mistakeTags,
      pattern: s.pattern ?? null,
      takeaway: s.takeaway ?? null,
      liveStatus: s.status ?? null,
    };
    await db()
      .insert(practiceSessions)
      .values(values)
      .onConflictDoUpdate({
        target: [practiceSessions.userId, practiceSessions.clientId],
        set: {
          endedAt: values.endedAt,
          // A session opened from the revision queue stays a review.
          mode: sql`case when ${values.mode} = 'review' then 'review'::session_mode else ${practiceSessions.mode} end`,
          activeMs: sql`greatest(${practiceSessions.activeMs}, ${values.activeMs})`,
          idleMs: sql`greatest(${practiceSessions.idleMs}, ${values.idleMs})`,
          submits: sql`greatest(${practiceSessions.submits}, ${values.submits})`,
          // A solved session never goes back to open/abandoned.
          outcome: sql`case when ${practiceSessions.outcome} = 'solved' then 'solved'::session_outcome else ${values.outcome}::session_outcome end`,
          independence: sql`coalesce(${values.independence}::independence, ${practiceSessions.independence})`,
          note: sql`coalesce(${values.note}, ${practiceSessions.note})`,
          mistakeTags: values.mistakeTags,
          pattern: sql`coalesce(${values.pattern}, ${practiceSessions.pattern})`,
          takeaway: sql`coalesce(${values.takeaway}, ${practiceSessions.takeaway})`,
          liveStatus: values.liveStatus,
          updatedAt: new Date(),
        },
      });

    await insertSubmissions(
      db(),
      userId,
      s.platform,
      "extension",
      s.submissions.map((sub) => ({
        platformProblemId,
        externalId: sub.id,
        verdict: sub.verdict,
        language: sub.language,
        runtimeMs: sub.runtimeMs,
        memoryKb: sub.memoryKb,
        submittedAt: new Date(sub.at),
      })),
    );
  }
  return sessions.length;
}

/** Stores past LeetCode submissions imported from the user's own account. */
export async function saveExtHistory(userId: string, items: ExtHistoryItem[]): Promise<number> {
  const problemIds = await ensureLeetcodeProblems(
    items.map((i) => ({ slug: i.titleSlug, title: i.title })),
  );
  await linkCatalog(db());
  return insertSubmissions(
    db(),
    userId,
    "leetcode",
    "extension",
    items.map((i) => ({
      platformProblemId: problemIds.get(i.titleSlug)!,
      externalId: i.id,
      verdict: i.verdict,
      language: i.language,
      runtimeMs: i.runtimeMs,
      memoryKb: i.memoryKb,
      submittedAt: new Date(i.at),
    })),
  );
}
