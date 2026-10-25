// Extracts NeetCode's lists (Blind 75, NeetCode 150) into seed JSON.
// The problem list ships inside neetcode.io's JS bundle as entries like
//   {problem:"Two Sum",pattern:"Arrays & Hashing",link:"two-sum/",difficulty:"Easy",neetcode150:!0,blind75:!0,…}
// We keep only names, patterns, LeetCode slugs and difficulty.
//
//   node scripts/extract-neetcode-sheets.mjs
import { mkdirSync, writeFileSync } from "node:fs";

const UA = { "User-Agent": "Mozilla/5.0 (compatible; UpsolveSheetImport/1.0)" };
const page = await (await fetch("https://neetcode.io/practice", { headers: UA })).text();
const main = /src="(main\.[a-f0-9]+\.js)"/.exec(page)?.[1];
if (!main) throw new Error("NeetCode main bundle not found");
const js = await (await fetch(`https://neetcode.io/${main}`, { headers: UA })).text();

const entries = [];
for (const m of js.matchAll(
  /\{problem:"((?:[^"\\]|\\.)*)",pattern:"([^"]*)",link:"([a-z0-9-]+)\/"[^{}]*\}/g,
)) {
  const body = m[0];
  entries.push({
    title: JSON.parse(`"${m[1]}"`),
    pattern: m[2],
    leetcode: m[3],
    difficulty: /difficulty:"(Easy|Medium|Hard)"/.exec(body)?.[1]?.toLowerCase() ?? null,
    blind75: /\bblind75:!0/.test(body),
    neetcode150: /\bneetcode150:!0/.test(body),
  });
}

const SHEETS = [
  {
    flag: "blind75",
    out: "blind-75",
    name: "Blind 75",
    expected: 75,
    sourceUrl: "https://neetcode.io/practice/practice/blind75",
  },
  {
    flag: "neetcode150",
    out: "neetcode-150",
    name: "NeetCode 150",
    expected: 150,
    sourceUrl: "https://neetcode.io/practice/practice/neetcode150",
  },
];

mkdirSync(new URL("../seed/sheets/", import.meta.url), { recursive: true });
for (const sheet of SHEETS) {
  const seen = new Set();
  const items = entries
    .filter((e) => e[sheet.flag] && !seen.has(e.leetcode) && seen.add(e.leetcode))
    .map((e) => ({
      step: e.pattern,
      section: null,
      title: e.title,
      kind: "practice",
      tier: e.difficulty,
      leetcode: e.leetcode,
    }));
  if (items.length !== sheet.expected) {
    throw new Error(`${sheet.name}: found ${items.length} problems, expected ${sheet.expected}`);
  }
  const file = new URL(`../seed/sheets/${sheet.out}.json`, import.meta.url);
  writeFileSync(
    file,
    JSON.stringify(
      {
        name: sheet.name,
        author: "NeetCode",
        sourceUrl: sheet.sourceUrl,
        extractedAt: new Date().toISOString().slice(0, 10),
        items,
      },
      null,
      1,
    ) + "\n",
  );
  console.log(
    `${sheet.out}: ${items.length} problems in ${new Set(items.map((i) => i.step)).size} patterns`,
  );
}
