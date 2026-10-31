// takeUforward sheet pages: which items the signed-in user has ticked. Pure functions, unit-tested.
//
// A sheet page (/prep-hub/<sheet>) is a Next.js page whose server data, streamed as
// self.__next_f.push([1,"…"]) chunks, holds the syllabus (every item's numeric id, slug and
// the user's status) and the user's solved ids. Ticks are POSTs to
// backend-go.takeuforward.org/api/v2/progress with { type, key, problem_id, action }.

export type TufItem = { id: number; slug: string; solved: boolean };
export type TufSheet = { sheet: string; items: TufItem[] };

type Node = Record<string, unknown>;

function findSheetData(node: unknown, depth = 0): Node | null {
  if (!node || typeof node !== "object" || depth > 8) return null;
  const n = node as Node;
  const sheet = n.sheet as { sheet_syllabus?: { rows?: unknown } } | undefined;
  if (sheet?.sheet_syllabus?.rows) return n;
  for (const value of Object.values(n)) {
    const found = findSheetData(value, depth + 1);
    if (found) return found;
  }
  return null;
}

/** Reads a sheet page's HTML; null when it isn't a sheet page (or the format changed). */
export function parseTufSheet(html: string): TufSheet | null {
  const payload = [...html.matchAll(/self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g)]
    .map((m) => {
      try {
        return JSON.parse(m[1]!) as string;
      } catch {
        return "";
      }
    })
    .join("");
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
  if (!data) return null;

  const sheet = data.sheet as {
    info?: { slug?: unknown };
    sheet_syllabus: { fields: string[][]; rows: unknown[][] };
  };
  const slug = typeof data.sheetSlug === "string" ? data.sheetSlug : sheet.info?.slug;
  if (typeof slug !== "string" || !/^[a-z0-9-]{1,120}$/.test(slug)) return null;
  const solvedIds = new Set(
    Array.isArray(data.solvedProblemIds)
      ? (data.solvedProblemIds as unknown[]).filter((x): x is number => typeof x === "number")
      : [],
  );
  const { fields, rows } = sheet.sheet_syllabus;
  const items: TufItem[] = [];
  for (const r of rows) {
    const keys = fields[r[0] as number];
    if (!keys) continue;
    const row = Object.fromEntries(keys.map((k, i) => [k, r[i + 1]]));
    if (row.type !== "item" || typeof row.id !== "number" || typeof row.slug !== "string") continue;
    items.push({
      id: row.id,
      slug: row.slug,
      solved: row.status === "solved" || solvedIds.has(row.id),
    });
  }
  return items.length > 0 ? { sheet: slug, items } : null;
}

/** A progress request the hook saw: { key, problem_id, action } from the request body. */
export type TufTick = { sheet: string; problemId: number; action: "add" | "remove" };

export function isTufProgressUrl(url: string): boolean {
  return /^https:\/\/backend-go\.takeuforward\.org\/api\/v2\/progress\/?(?:[?#]|$)/.test(url);
}

export function tufTickFromBody(body: unknown): TufTick | null {
  let b: unknown = body;
  if (typeof b === "string") {
    try {
      b = JSON.parse(b);
    } catch {
      return null;
    }
  }
  if (!b || typeof b !== "object") return null;
  const o = b as Record<string, unknown>;
  if (o.type !== "source" || typeof o.key !== "string" || !/^[a-z0-9-]{1,120}$/.test(o.key))
    return null;
  if (typeof o.problem_id !== "number" || (o.action !== "add" && o.action !== "remove"))
    return null;
  return { sheet: o.key, problemId: o.problem_id, action: o.action };
}

export const TUF_PROGRESS_URL = "https://backend-go.takeuforward.org/api/v2/progress";

/**
 * The request takeUforward's own page sends to tick or untick a sheet item. Sent from a
 * takeuforward.org tab, it carries the user's TUF login cookie like the page's own request.
 */
export function tufTickRequest(sheet: string, problemId: number, action: "add" | "remove") {
  let tz = "Asia/Kolkata";
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone || tz;
  } catch {
    // Keep the default.
  }
  return {
    url: TUF_PROGRESS_URL,
    init: {
      method: "POST",
      credentials: "include" as const,
      headers: { "Content-Type": "application/json", "x-extra-info-6": tz },
      body: JSON.stringify({ type: "source", key: sheet, problem_id: problemId, action }),
    },
  };
}

/**
 * What to change on takeUforward so it matches DsaKaro. Pending changes made in DsaKaro win
 * (latest per item); with `full`, anything done in DsaKaro but not on TUF is ticked too.
 * Returns the changes and the pending slugs that end up in step (to clear).
 */
export function planTufChanges(
  tuf: TufSheet,
  done: string[],
  pending: { slug: string; done: boolean }[],
  full: boolean,
) {
  const solved = new Set(tuf.items.filter((i) => i.solved).map((i) => i.slug));
  const idOf = new Map<string, number>();
  for (const i of tuf.items) if (!idOf.has(i.slug)) idOf.set(i.slug, i.id);
  const latest = new Map<string, boolean>();
  for (const p of pending) latest.set(p.slug, p.done);

  const ops: { slug: string; id: number; action: "add" | "remove" }[] = [];
  const settled: string[] = [];
  for (const [slug, want] of latest) {
    const id = idOf.get(slug);
    if (id === undefined || solved.has(slug) === want) settled.push(slug);
    else ops.push({ slug, id, action: want ? "add" : "remove" });
  }
  if (full) {
    for (const slug of new Set(done)) {
      const id = idOf.get(slug);
      if (id !== undefined && !solved.has(slug) && !latest.has(slug))
        ops.push({ slug, id, action: "add" });
    }
  }
  return { ops, settled, pendingUnticks: [...latest].filter(([, d]) => !d).map(([s]) => s) };
}
