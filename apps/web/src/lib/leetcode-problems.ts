import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import {
  PlatformError,
  gfgProblemUrl,
  leetcodeCatalogPage,
  leetcodeQuestion,
  type RawProblem,
} from "@upsolve/adapters";
import { platformProblems, upsertProblems } from "@upsolve/db";
import { db } from "@/lib/db";

/** Below this many stored LeetCode problems we assume the catalog was never imported. */
const CATALOG_MIN = 3_000;
/** Per request, look up at most this many unknown problems one by one. */
const MAX_SINGLE_LOOKUPS = 15;

let catalogImport: Promise<void> | null = null;

/** Imports LeetCode's public problem list (once per server; about 40 requests). */
async function importCatalog() {
  for (let skip = 0, total = Infinity; skip < total; skip += 100) {
    const page = await leetcodeCatalogPage(skip, 100);
    total = page.total;
    await upsertProblems(db(), "leetcode", page.problems);
    if (page.problems.length === 0) break;
  }
}

async function lookup(slugs: string[]) {
  if (slugs.length === 0) return new Map<string, string>();
  const rows = await db()
    .select({ id: platformProblems.id, slug: platformProblems.externalId })
    .from(platformProblems)
    .where(
      and(eq(platformProblems.platform, "leetcode"), inArray(platformProblems.externalId, slugs)),
    );
  return new Map(rows.map((r) => [r.slug, r.id]));
}

/**
 * Returns slug → platform_problems.id for every slug, creating rows as needed.
 * Prefers the full catalog (difficulty + tags), then single lookups, then a
 * minimal row from the title the extension saw, so a submission is never dropped.
 */
export async function ensureLeetcodeProblems(
  items: { slug: string; title: string | null }[],
): Promise<Map<string, string>> {
  const titles = new Map(items.map((i) => [i.slug, i.title]));
  const slugs = [...titles.keys()];
  let ids = await lookup(slugs);
  let missing = slugs.filter((s) => !ids.has(s));
  if (missing.length === 0) return ids;

  const [{ n } = { n: 0 }] = await db()
    .select({ n: sql<number>`count(*)::int` })
    .from(platformProblems)
    .where(eq(platformProblems.platform, "leetcode"));
  if (n < CATALOG_MIN) {
    catalogImport ??= importCatalog().finally(() => (catalogImport = null));
    try {
      await catalogImport;
    } catch (err) {
      console.error("[leetcode] catalog import failed", err);
    }
    ids = await lookup(slugs);
    missing = slugs.filter((s) => !ids.has(s));
  }

  const found: RawProblem[] = [];
  for (const slug of missing.slice(0, MAX_SINGLE_LOOKUPS)) {
    try {
      const problem = await leetcodeQuestion(slug);
      // A null difficulty means LeetCode doesn't know the slug; fall back to the client's title.
      if (problem.difficultyRaw !== null) found.push(problem);
    } catch (err) {
      if (!(err instanceof PlatformError)) throw err;
    }
  }
  const foundSlugs = new Set(found.map((p) => p.externalId));
  const minimal: RawProblem[] = missing
    .filter((s) => !foundSlugs.has(s))
    .map((slug) => ({
      externalId: slug,
      slug,
      url: `https://leetcode.com/problems/${slug}/`,
      title: titles.get(slug) ?? slug,
      difficulty: null,
      difficultyRaw: null,
      rating: null,
      tags: [],
    }));

  const created = await upsertProblems(db(), "leetcode", [...found, ...minimal]);
  for (const [slug, id] of created) ids.set(slug, id);
  return ids;
}

/**
 * slug → platform_problems.id for GeeksforGeeks problems. The catalog is
 * imported by `pnpm --filter @upsolve/db seed:gfg`; problems it lacks get a
 * minimal row from the title the extension saw.
 */
export async function ensureGfgProblems(
  items: { slug: string; title: string | null }[],
): Promise<Map<string, string>> {
  const titles = new Map(items.map((i) => [i.slug, i.title]));
  const slugs = [...titles.keys()];
  if (slugs.length === 0) return new Map();
  const rows = await db()
    .select({ id: platformProblems.id, slug: platformProblems.externalId })
    .from(platformProblems)
    .where(
      and(
        eq(platformProblems.platform, "geeksforgeeks"),
        inArray(platformProblems.externalId, slugs),
      ),
    );
  const ids = new Map(rows.map((r) => [r.slug, r.id]));
  const missing = slugs.filter((s) => !ids.has(s));
  if (missing.length) {
    const created = await upsertProblems(
      db(),
      "geeksforgeeks",
      missing.map((slug) => ({
        externalId: slug,
        slug,
        url: gfgProblemUrl(slug),
        title: titles.get(slug) ?? slug,
        difficulty: null,
        difficultyRaw: null,
        rating: null,
        tags: [],
      })),
    );
    for (const [slug, id] of created) ids.set(slug, id);
  }
  return ids;
}

// DsaKaro
