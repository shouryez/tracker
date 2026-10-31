import { sql } from "drizzle-orm";
import { ExtSheetSyncRequest } from "@upsolve/contracts";
import { db } from "@/lib/db";
import { handleExtPost } from "@/lib/ext-route";

/**
 * Ticks from the user's own takeUforward sheet page, read by the extension. Solved items are
 * ticked here too (never unticked by a full sync, so ticks made in DsaKaro stay); items the
 * user just unticked on takeUforward are unticked here. Our item keys are takeUforward's
 * slugs (a repeated item gets "~2"), and the sheet is matched by its source URL.
 */
export async function POST(request: Request) {
  return handleExtPost(request, ExtSheetSyncRequest, async (userId, body) => {
    const sourceUrl = `https://takeuforward.org/prep-hub/${body.sheet}`;
    const [sheet] = (await db().execute(sql`
      select id from sheets where source_url = ${sourceUrl} limit 1`)) as unknown as {
      id: string;
    }[];
    if (!sheet) return 0;
    const matches = (slugs: string[]) => sql`
      si.item_key in ${slugs}
      or split_part(si.item_key, '~', 1) in ${slugs}`;

    let changed = 0;
    if (body.solved.length > 0) {
      const added = await db().execute(sql`
        insert into sheet_marks (user_id, sheet_id, item_key)
        select ${userId}, si.sheet_id, si.item_key from sheet_items si
        where si.sheet_id = ${sheet.id} and (${matches(body.solved)})
        on conflict do nothing`);
      changed += (added as unknown as { count?: number }).count ?? 0;
      // Following the sheet puts it on the dashboard and Today's picks.
      await db().execute(sql`
        insert into user_sheets (user_id, sheet_id) values (${userId}, ${sheet.id})
        on conflict do nothing`);
    }
    if (body.removed.length > 0) {
      const removed = await db().execute(sql`
        delete from sheet_marks sm using sheet_items si
        where sm.user_id = ${userId} and sm.sheet_id = ${sheet.id}
          and si.sheet_id = sm.sheet_id and si.item_key = sm.item_key
          and (${matches(body.removed)})`);
      changed += (removed as unknown as { count?: number }).count ?? 0;
    }
    // A change just made on takeUforward is newer than anything queued here for it.
    if (body.changed.length > 0) {
      await db().execute(sql`
        delete from tuf_push_queue q
        where q.user_id = ${userId} and q.sheet_id = ${sheet.id}
          and split_part(q.item_key, '~', 1) in ${body.changed}`);
    }
    return changed;
  });
}

