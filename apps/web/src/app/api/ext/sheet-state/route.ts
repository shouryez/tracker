import { sql } from "drizzle-orm";
import { ExtSheetAckRequest, type ExtSheetStateResponse } from "@upsolve/contracts";
import { authenticateExtension, unauthorized } from "@/lib/ext-auth";
import { db } from "@/lib/db";
import { handleExtPost } from "@/lib/ext-route";
import { TUF_PREFIX } from "@/lib/tuf-sync";

// DsaKaro → takeUforward. GET: for each TUF sheet the user follows, what's done here and the
// changes still to apply there. POST: the extension applied them; clear the queue.
// Item keys are TUF slugs; a repeated item is "<slug>~2", so the base slug is the key's head.

export async function GET(request: Request) {
  const userId = await authenticateExtension(request);
  if (!userId) return unauthorized();

  // Taken before reading: an ack can then never clear a change made while this ran.
  const at = Date.now();
  const rows = (await db().execute(sql`
    select substr(sh.source_url, ${TUF_PREFIX.length + 1}) as sheet,
      coalesce((
        select array_agg(distinct split_part(si.item_key, '~', 1))
        from sheet_items si
        where si.sheet_id = sh.id and (
          exists (select 1 from sheet_marks sm where sm.user_id = ${userId}
                  and sm.sheet_id = si.sheet_id and sm.item_key = si.item_key)
          or (si.problem_id is not null and exists (
                select 1 from submissions s join platform_problems pp on pp.id = s.platform_problem_id
                where s.user_id = ${userId} and s.verdict = 'AC' and pp.problem_id = si.problem_id)))
      ), '{}') as done,
      coalesce((
        select json_agg(json_build_object('slug', split_part(q.item_key, '~', 1), 'done', q.done)
                        order by q.updated_at)
        from tuf_push_queue q where q.user_id = ${userId} and q.sheet_id = sh.id
      ), '[]'::json) as pending
    from user_sheets us join sheets sh on sh.id = us.sheet_id
    where us.user_id = ${userId} and sh.source_url like ${TUF_PREFIX + "%"}`)) as unknown as {
    sheet: string;
    done: string[];
    pending: { slug: string; done: boolean }[];
  }[];

  const body: ExtSheetStateResponse = {
    at,
    sheets: rows
      .filter((r) => /^[a-z0-9-]{1,120}$/.test(r.sheet))
      .map((r) => ({ sheet: r.sheet, done: r.done ?? [], pending: r.pending ?? [] })),
  };
  return Response.json(body, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  return handleExtPost(request, ExtSheetAckRequest, async (userId, body) => {
    let cleared = 0;
    for (const a of body.acks) {
      if (a.slugs.length === 0) continue;
      const res = await db().execute(sql`
        delete from tuf_push_queue q using sheets sh
        where q.user_id = ${userId} and sh.id = q.sheet_id
          and sh.source_url = ${TUF_PREFIX + a.sheet}
          and split_part(q.item_key, '~', 1) in ${a.slugs}
          and q.updated_at <= ${new Date(a.before).toISOString()}::timestamptz`);
      cleared += (res as unknown as { count?: number }).count ?? 0;
    }
    return cleared;
  });
}
