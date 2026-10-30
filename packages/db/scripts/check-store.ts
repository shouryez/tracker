// Integration check for sync persistence against the real database.
// Fetches public data for well-known handles, saves it inside a transaction,
// verifies the rows, then ROLLS BACK so nothing is kept (including the temporary user).
// Run: node --env-file=.env scripts/check-store.ts
import { drizzle } from "drizzle-orm/postgres-js";
import { and, eq, sql } from "drizzle-orm";
import postgres from "postgres";
import { codeforces } from "../../adapters/src/codeforces.ts";
import { leetcode } from "../../adapters/src/leetcode.ts";
import { contestResults, submissions } from "../src/schema.ts";
import { saveContests, saveSubmissions } from "../src/store.ts";

const ROLLBACK = new Error("rollback");
const client = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1 });
const db = drizzle(client);

const cf = await codeforces.fetchSubmissions("Errichto", null);
const cfContests = await codeforces.fetchContests("Errichto");
const lc = await leetcode.fetchSubmissions("votrubac", null);
console.log(
  `fetched: cf ${cf.submissions.length} subs, ${cfContests.length} contests; lc ${lc.submissions.length} subs`,
);

try {
  await db.transaction(async (tx) => {
    // Throwaway user: lives only inside this transaction (also exercises the signup trigger).
    const [user] = await tx.execute<{ id: string }>(
      sql`insert into auth.users (id, aud, role, email) values (gen_random_uuid(), 'authenticated', 'authenticated', 'store-check@example.invalid') returning id`,
    );
    if (!user) throw new Error("Could not create a temporary user");
    const [profile] = await tx.execute<{ n: number }>(
      sql`select count(*)::int as n from public.profiles where user_id = ${user.id}`,
    );
    console.log("signup trigger created profile:", profile?.n === 1);

    const first = await saveSubmissions(tx, user.id, "codeforces", cf.submissions);
    const again = await saveSubmissions(tx, user.id, "codeforces", cf.submissions);
    await saveContests(tx, user.id, "codeforces", cfContests);
    await saveContests(tx, user.id, "codeforces", cfContests); // upsert path
    const lcInserted = await saveSubmissions(tx, user.id, "leetcode", lc.submissions);

    const [counts] = await tx
      .select({
        subs: sql<number>`count(*)::int`,
        ac: sql<number>`count(*) filter (where ${submissions.verdict} = 'AC')::int`,
      })
      .from(submissions)
      .where(and(eq(submissions.userId, user.id), eq(submissions.platform, "codeforces")));
    const [contests] = await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(contestResults)
      .where(eq(contestResults.userId, user.id));

    console.log({
      firstInsert: first,
      secondInsert: again,
      lcInserted,
      stored: counts,
      contests: contests?.n,
    });
    if (again !== 0) throw new Error("Re-sync inserted duplicates");
    if (contests?.n !== cfContests.length) throw new Error("Contest upsert duplicated rows");
    console.log("OK: inserts, de-duplication and upserts behave. Rolling back.");
    throw ROLLBACK;
  });
} catch (err) {
  if (err !== ROLLBACK) throw err;
} finally {
  await client.end();
}

// DsaKaro
