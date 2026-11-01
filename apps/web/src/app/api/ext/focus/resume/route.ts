import { and, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { ExtFocusResume } from "@upsolve/contracts";
import { focusSessions } from "@upsolve/db";
import { db } from "@/lib/db";
import { handleExtPost } from "@/lib/ext-route";

/** Auto-resume: back on a study tab. The pause is added to the paused time. 0 when not paused. */
export async function POST(request: Request) {
  return handleExtPost(request, ExtFocusResume, async (userId, body) => {
    const rows = await db()
      .update(focusSessions)
      .set({
        pausedMs: sql`${focusSessions.pausedMs} + (extract(epoch from (now() - ${focusSessions.pausedAt})) * 1000)::int`,
        pausedAt: null,
      })
      .where(
        and(
          eq(focusSessions.id, body.focusId),
          eq(focusSessions.userId, userId),
          isNull(focusSessions.endedAt),
          isNotNull(focusSessions.pausedAt),
        ),
      )
      .returning({ id: focusSessions.id });
    return rows.length;
  });
}
