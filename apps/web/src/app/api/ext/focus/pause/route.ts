import { and, eq, isNull, sql } from "drizzle-orm";
import { ExtFocusPause } from "@upsolve/contracts";
import { focusSessions } from "@upsolve/db";
import { db } from "@/lib/db";
import { handleExtPost } from "@/lib/ext-route";

/**
 * Auto-pause: the extension saw a non-study tab for a while. Same as Pause on the web page:
 * the totals measured so far are banked on the session. 0 when it isn't running.
 */
export async function POST(request: Request) {
  return handleExtPost(request, ExtFocusPause, async (userId, body) => {
    const rows = await db()
      .update(focusSessions)
      .set({
        pausedAt: new Date(),
        focusMs: sql`${focusSessions.focusMs} + ${body.focusMs}`,
        awayMs: sql`${focusSessions.awayMs} + ${body.awayMs}`,
        switches: sql`${focusSessions.switches} + ${body.switches}`,
        tracked: true,
      })
      .where(
        and(
          eq(focusSessions.id, body.focusId),
          eq(focusSessions.userId, userId),
          isNull(focusSessions.endedAt),
          isNull(focusSessions.pausedAt),
        ),
      )
      .returning({ id: focusSessions.id });
    return rows.length;
  });
}
