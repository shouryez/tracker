import "server-only";
import { sql } from "drizzle-orm";
import type { ExtHistoryItem, ExtSession } from "@upsolve/contracts";
import { insertSubmissions, practiceSessions } from "@upsolve/db";
import { db } from "@/lib/db";
import { ensureLeetcodeProblems } from "@/lib/leetcode-problems";

/** Stores sessions from the extension. Re-sending a session updates the same row. */
export async function saveExtSessions(userId: string, sessions: ExtSession[]): Promise<number> {
  const problemIds = await ensureLeetcodeProblems(
    sessions.map((s) => ({ slug: s.titleSlug, title: s.title })),
  );

  for (const s of sessions) {
    const platformProblemId = problemIds.get(s.titleSlug)!;
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
    };
    await db()
      .insert(practiceSessions)
      .values(values)
      .onConflictDoUpdate({
        target: [practiceSessions.userId, practiceSessions.clientId],
        set: {
          endedAt: values.endedAt,
          activeMs: sql`greatest(${practiceSessions.activeMs}, ${values.activeMs})`,
          idleMs: sql`greatest(${practiceSessions.idleMs}, ${values.idleMs})`,
          submits: sql`greatest(${practiceSessions.submits}, ${values.submits})`,
          // A solved session never goes back to open/abandoned.
          outcome: sql`case when ${practiceSessions.outcome} = 'solved' then 'solved'::session_outcome else ${values.outcome}::session_outcome end`,
          independence: sql`coalesce(${values.independence}::independence, ${practiceSessions.independence})`,
          note: sql`coalesce(${values.note}, ${practiceSessions.note})`,
          mistakeTags: values.mistakeTags,
          updatedAt: new Date(),
        },
      });

    await insertSubmissions(
      db(),
      userId,
      "leetcode",
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
