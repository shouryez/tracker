// Extracts a takeUforward sheet (e.g. Striver's A2Z / SDE) into seed JSON.
// Reads only the public sheet page; keeps problem names, sections, LeetCode
// slugs and tiers. No videos, articles or editorial content.
//
//   node scripts/extract-tuf-sheet.mjs strivers-a2z-dsa-sheet striver-a2z
//
// Writes seed/sheets/<out>.json. Re-run when the sheet changes upstream.
import { mkdirSync, writeFileSync } from "node:fs";

const [slug, out] = process.argv.slice(2);
if (!slug || !out) {
  console.error("usage: node scripts/extract-tuf-sheet.mjs <tuf-sheet-slug> <output-name>");
  process.exit(1);
}

const url = `https://takeuforward.org/prep-hub/${slug}?page=sheet`;
const res = await fetch(url, {
  headers: { "User-Agent": "Mozilla/5.0 (compatible; UpsolveSheetImport/1.0)" },
});
if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
const html = await res.text();

// Next.js streams server data as self.__next_f.push([1,"..."]) chunks.
const payload = [...html.matchAll(/self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g)]
  .map((m) => JSON.parse(m[1]))
  .join("");
/** Depth-first search for the object that has sheet.sheet_syllabus.rows. */
function findSheetData(node, depth = 0) {
  if (!node || typeof node !== "object" || depth > 8) return null;
  if (node.sheet?.sheet_syllabus?.rows) return node;
  for (const value of Object.values(node)) {
    const found = findSheetData(value, depth + 1);
    if (found) return found;
  }
  return null;
}

// Other lines only reference the syllabus ("$6e:sheet:sheet_syllabus…"); find the one that holds it.
// It may be top-level data or the props of a React element (["$", type, key, { data }]).
const data = payload
  .split("\n")
  .filter((l) => l.includes('"sheet_syllabus":{'))
  .map((l) => {
    try {
      return findSheetData(JSON.parse(l.slice(l.indexOf(":") + 1)));
    } catch {
      return null;
    }
  })
  .find(Boolean);
if (!data) throw new Error("sheet_syllabus not found: the page format may have changed");
const { info, sheet_syllabus: sy } = data.sheet;

const row = (r) => Object.fromEntries(sy.fields[r[0]].map((k, i) => [k, r[i + 1]]));
const leetcodeSlug = (u) =>
  (typeof u === "string" && /leetcode\.com\/problems\/([a-z0-9-]+)/.exec(u)?.[1]) || null;

const items = [];
const walk = (index, path) => {
  const r = row(sy.rows[index]);
  if (r.type === "item") {
    items.push({
      step: path[0].trim(),
      section: path.slice(1).join(" › ").trim() || null,
      title: String(r.label).trim(),
      kind: r.layoutType === "learning" ? "learning" : "practice",
      tier: r.difficulty ?? null,
      tufSlug: r.slug,
      leetcode: leetcodeSlug(r.leetcode_link),
    });
    return;
  }
  for (const child of r.children ?? []) walk(child, [...path, String(r.label)]);
};
for (const root of sy.roots) walk(root, []);

const expected = data.progress?.total;
if (expected && items.length !== expected) {
  throw new Error(`Extracted ${items.length} items but the page says ${expected}`);
}

mkdirSync(new URL("../seed/sheets/", import.meta.url), { recursive: true });
const file = new URL(`../seed/sheets/${out}.json`, import.meta.url);
writeFileSync(
  file,
  JSON.stringify(
    {
      name: String(info.name).replace(/’/g, "'"),
      author: "Striver (takeUforward)",
      sourceUrl: url.replace("?page=sheet", ""),
      extractedAt: new Date().toISOString().slice(0, 10),
      items,
    },
    null,
    1,
  ) + "\n",
);
const withLc = items.filter((i) => i.leetcode).length;
console.log(`${out}: ${items.length} items (${withLc} with LeetCode links) → ${file.pathname}`);
