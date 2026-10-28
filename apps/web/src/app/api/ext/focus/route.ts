import { and, eq, isNull } from "drizzle-orm";
import { ExtFocusReport } from "@upsolve/contracts";
import { focusSessions } from "@upsolve/db";
import { db } from "@/lib/db";
import { handleExtPost } from "@/lib/ext-route";

/**
 * Ends a running focus session with the totals the extension measured (used when the
 * session is stopped from the extension popup rather than the web page).
 */
export async function POST(request: Request) {
  return handleExtPost(request, ExtFocusReport, async (userId, body) => {
    const where = and(
      eq(focusSessions.id, body.focusId),
      eq(focusSessions.userId, userId),
      isNull(focusSessions.endedAt),
    );
    const [row] = await db()
      .select({ startedAt: focusSessions.startedAt })
      .from(focusSessions)
      .where(where);
    if (!row) return 0;
    const wall = Math.min(Date.now() - row.startedAt.getTime(), 86_400_000);
    await db()
      .update(focusSessions)
      .set({
        endedAt: new Date(),
        focusMs: Math.min(body.focusMs, wall),
        awayMs: Math.min(body.awayMs, wall),
        switches: body.switches,
        tracked: true,
      })
      .where(where);
    return 1;
  });
}
