// Loads seed/sheets/*.json into the database. Safe to re-run: sheets and items
// are upserted by stable keys, so users' follows and manual ticks survive.
//
// Each item gets links to every place it can be solved. Items are matched to
// GeeksforGeeks problems by title (strict, see adapters/src/match.ts); a
// LeetCode item's GFG twin is linked to the same canonical problem, so solving
// it on either site ticks the item. Run seed:gfg first so the GFG catalog exists.
//
//   node --env-file=.env scripts/seed-sheets.ts
import { readFileSync } from "node:fs";
import { and, eq, inArray, notInArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { matchKey, matchTitles } from "../../adapters/src/match.ts";
import { platformProblems, sheetItems, sheets, type SheetItemLink } from "../src/schema.ts";
import { linkCatalog } from "../src/store.ts";

type SeedItem = {
  step: string;
  section: string | null;
  title: string;
  kind: "practice" | "learning";
  tier: string | null;
  tufSlug?: string;
  leetcode: string | null;
  /** The creator's own explanation and write-up, when they have one. */
  video?: string | null;
  article?: string | null;
  neetcode?: string | null;
  minutes?: number | null;
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

  const gfgRows = await db
    .select({
      id: platformProblems.id,
      slug: platformProblems.externalId,
      title: platformProblems.title,
      url: platformProblems.url,
      problemId: platformProblems.problemId,
    })
    .from(platformProblems)
    .where(eq(platformProblems.platform, "geeksforgeeks"));
  const gfgById = new Map(gfgRows.map((g) => [g.id, g]));
  const gfgCandidates = gfgRows.map((g) => ({ id: g.id, key: matchKey(g.title) }));
  /** GFG platform problem id → LeetCode canonical problem id it duplicates. */
  const twins = new Map<string, string>();
  const samples: string[] = [];
  console.log(`gfg catalog: ${gfgRows.length} problems to match against`);

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
      const links: SheetItemLink[] = [];
      let problemId: string | null = null;
      if (leetcode) {
        links.push({ site: "leetcode", url: `https://leetcode.com/problems/${leetcode}/` });
        problemId = problemBySlug.get(leetcode) ?? null;
      }
      const gfgMatch = item.kind === "practice" ? matchTitles(item.title, gfgCandidates) : null;
      const gfgProblem = gfgMatch ? gfgById.get(gfgMatch.id) : undefined;
      if (gfgProblem) {
        links.push({ site: "geeksforgeeks", url: gfgProblem.url });
        if (problemId) twins.set(gfgProblem.id, problemId);
        else problemId = gfgProblem.problemId;
        if (samples.length < 12 && gfgMatch!.score < 1) {
          samples.push(`  ~${gfgMatch!.score.toFixed(2)} "${item.title}" → "${gfgProblem.title}"`);
        }
      }
      if (item.tufSlug) {
        links.push({
          site: "takeuforward",
          url:
            item.kind === "practice"
              ? `https://takeuforward.org/practice/dsa/${item.tufSlug}`
              : (item.article ?? seed.sourceUrl),
        });
      }
      if (item.neetcode) links.push({ site: "neetcode", url: item.neetcode });
      if (links.length === 0) links.push({ site: "source", url: seed.sourceUrl });
      // Learning links last: `url` (links[0]) must stay a place to solve it.
      if (item.video) links.push({ site: "youtube", url: item.video });
      if (item.article) links.push({ site: "article", url: item.article });
      return {
        sheetId: sheet!.id,
        itemKey,
        position: index,
        step: item.step,
        section: item.section,
        title: item.title,
        kind: item.kind,
        tier: item.tier,
        minutes: item.minutes ?? null,
        url: links[0]!.url,
        links,
        problemId,
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
            minutes: sql`excluded.minutes`,
            url: sql`excluded.url`,
            links: sql`excluded.links`,
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
    const withGfg = rows.filter((r) => r.links.some((l) => l.site === "geeksforgeeks")).length;
    const withVideo = rows.filter((r) => r.links.some((l) => l.site === "youtube")).length;
    const unresolved = rows
      .filter((r) => r.links.some((l) => l.site === "leetcode") && !r.problemId)
      .map((r) => r.itemKey);
    console.log(
      `${slug}: ${rows.length} items, ${tracked} auto-tracked, ${withGfg} matched on GFG, ${withVideo} videos${unresolved.length ? `, UNRESOLVED: ${unresolved.join(", ")}` : ""}`,
    );
  }

  // Point each LeetCode problem's GFG twin at the LeetCode canonical problem.
  for (const [gfgId, problemId] of twins) {
    await db.update(platformProblems).set({ problemId }).where(eq(platformProblems.id, gfgId));
  }
  console.log(`linked ${twins.size} GFG problems to their LeetCode twins`);
  if (samples.length) console.log(["fuzzy matches to spot-check:", ...samples].join("\n"));
} finally {
  await client.end();
}
