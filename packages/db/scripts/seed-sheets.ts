// Loads seed/sheets/*.json into the database. Safe to re-run: sheets and items
// are upserted by stable keys, so users' follows and manual ticks survive.
//
//   node --env-file=.env scripts/seed-sheets.ts
import { readFileSync } from "node:fs";
import { and, eq, inArray, notInArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { platformProblems, sheetItems, sheets } from "../src/schema.ts";
import { linkCatalog } from "../src/store.ts";

type SeedItem = {
  step: string;
  section: string | null;
  title: string;
  kind: "practice" | "learning";
  tier: string | null;
  tufSlug?: string;
  leetcode: string | null;
};
type SeedSheet = {
  name: string;
  author: string;
  sourceUrl: string;
  extractedAt: string;
  items: SeedItem[];
};

/** Display order on the Sheets page. */
const SHEETS = [
  { slug: "striver-a2z", file: "striver-a2z" },
  { slug: "striver-sde", file: "striver-sde" },
  { slug: "neetcode-150", file: "neetcode-150" },
  { slug: "blind-75", file: "blind-75" },
  { slug: "grind-75", file: "grind-75" },
];

/** LeetCode problems renamed since the sheet was written. */
const LEETCODE_RENAMES: Record<string, string> = {
  "implement-strstr": "find-the-index-of-the-first-occurrence-in-a-string",
};

const client = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1 });
const db = drizzle(client);

try {
  const linked = await linkCatalog(db);
  console.log(`catalog: linked ${linked} platform problems`);

  for (const [position, { slug, file }] of SHEETS.entries()) {
    const seed = JSON.parse(
      readFileSync(new URL(`../seed/sheets/${file}.json`, import.meta.url), "utf8"),
    ) as SeedSheet;

    const [sheet] = await db
      .insert(sheets)
      .values({
        slug,
        name: seed.name,
        author: seed.author,
        sourceUrl: seed.sourceUrl,
        version: seed.extractedAt,
        position,
      })
      .onConflictDoUpdate({
        target: sheets.slug,
        set: {
          name: seed.name,
          author: seed.author,
          sourceUrl: seed.sourceUrl,
          version: seed.extractedAt,
          position,
        },
      })
      .returning({ id: sheets.id });

    const lcSlugs = [
      ...new Set(
        seed.items.flatMap((i) => (i.leetcode ? [LEETCODE_RENAMES[i.leetcode] ?? i.leetcode] : [])),
      ),
    ];
    const problems = lcSlugs.length
      ? await db
          .select({ slug: platformProblems.externalId, problemId: platformProblems.problemId })
          .from(platformProblems)
          .where(
            and(
              eq(platformProblems.platform, "leetcode"),
              inArray(platformProblems.externalId, lcSlugs),
            ),
          )
      : [];
    const problemBySlug = new Map(problems.map((p) => [p.slug, p.problemId]));

    const seen = new Set<string>();
    const rows = seed.items.map((item, index) => {
      const leetcode = item.leetcode ? (LEETCODE_RENAMES[item.leetcode] ?? item.leetcode) : null;
      // Sheets sometimes list the same item in two steps; keep both, as the source does.
      const base = item.tufSlug ?? leetcode ?? `item-${index}`;
      let itemKey = base;
      for (let n = 2; seen.has(itemKey); n++) itemKey = `${base}~${n}`;
      seen.add(itemKey);
      return {
        sheetId: sheet!.id,
        itemKey,
        position: index,
        step: item.step,
        section: item.section,
        title: item.title,
        kind: item.kind,
        tier: item.tier,
        url: leetcode ? `https://leetcode.com/problems/${leetcode}/` : seed.sourceUrl,
        problemId: leetcode ? (problemBySlug.get(leetcode) ?? null) : null,
      };
    });

    for (let i = 0; i < rows.length; i += 500) {
      await db
        .insert(sheetItems)
        .values(rows.slice(i, i + 500))
        .onConflictDoUpdate({
          target: [sheetItems.sheetId, sheetItems.itemKey],
          set: {
            position: sql`excluded.position`,
            step: sql`excluded.step`,
            section: sql`excluded.section`,
            title: sql`excluded.title`,
            kind: sql`excluded.kind`,
            tier: sql`excluded.tier`,
            url: sql`excluded.url`,
            problemId: sql`excluded.problem_id`,
          },
        });
    }
    // Items removed upstream disappear here too.
    await db.delete(sheetItems).where(
      and(
        eq(sheetItems.sheetId, sheet!.id),
        notInArray(
          sheetItems.itemKey,
          rows.map((r) => r.itemKey),
        ),
      ),
    );

    const tracked = rows.filter((r) => r.problemId).length;
    const unresolved = rows
      .filter((r) => r.url?.includes("leetcode.com") && !r.problemId)
      .map((r) => r.itemKey);
    console.log(
      `${slug}: ${rows.length} items, ${tracked} auto-tracked${unresolved.length ? `, UNRESOLVED: ${unresolved.join(", ")}` : ""}`,
    );
  }
} finally {
  await client.end();
}
