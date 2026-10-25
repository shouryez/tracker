// Imports GeeksforGeeks' public problem list (~3,000 problems, ~100 requests)
// so sheet items can be matched to GFG problems. Safe to re-run.
//
//   node --env-file=.env scripts/import-gfg-catalog.ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { gfgCatalogPage } from "../../adapters/src/gfg.ts";
import { linkCatalog, upsertProblems } from "../src/store.ts";

const client = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1 });
const db = drizzle(client);

try {
  let stored = 0;
  let total = 0;
  for (let page = 1; ; page++) {
    const result = await gfgCatalogPage(page);
    total = result.total;
    stored += (await upsertProblems(db, "geeksforgeeks", result.problems)).size;
    if (page % 10 === 0) console.log(`  page ${page}: ${stored}/${total}`);
    if (!result.hasNext || result.problems.length === 0) break;
  }
  const linked = await linkCatalog(db);
  console.log(`gfg catalog: ${stored} of ${total} problems stored, ${linked} newly linked`);
} finally {
  await client.end();
}
