import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

// Two-way sync with takeUforward. TUF → DsaKaro: the extension reads the user's ticks on a TUF
// sheet page (/api/ext/sheet-sync). DsaKaro → TUF: ticks made here are queued, and the
// extension applies them from a takeuforward.org tab (/api/ext/sheet-state).

/** Sheets that mirror a takeUforward sheet: our source URL is its prep-hub page. */
export const TUF_PREFIX = "https://takeuforward.org/prep-hub/";

/**
 * Queues ticks (done) or unticks made in DsaKaro for sheets that mirror takeUforward. Other
 * sheets are ignored. The latest change per item wins.
 */
export async function queueTufPush(
  userId: string,
  items: { sheetId: string; itemKey: string }[],
  done: boolean,
) {
  if (items.length === 0) return;
  const values = sql.join(
    items.map((i) => sql`(${i.sheetId}::uuid, ${i.itemKey})`),
    sql`, `,
  );
  await db().execute(sql`
    insert into tuf_push_queue (user_id, sheet_id, item_key, done, updated_at)
    select ${userId}, v.sheet_id, v.item_key, ${done}, now()
    from (values ${values}) as v(sheet_id, item_key)
    join sheets sh on sh.id = v.sheet_id and sh.source_url like ${TUF_PREFIX + "%"}
    on conflict (user_id, sheet_id, item_key)
      do update set done = excluded.done, updated_at = excluded.updated_at`);
}
