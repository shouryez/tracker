// Parsing LeetCode URLs and responses. Pure functions, unit-tested.
import { leetcodeVerdict } from "@upsolve/contracts/leetcode";
import type { ExtHistoryItem, ExtSubmission } from "@upsolve/contracts";

/** "/problems/two-sum/description/" → "two-sum". Null when not on a problem page. */
export function problemSlug(pathname: string): string | null {
  const m = /^\/problems\/([a-z0-9-]+)(?:\/|$)/.exec(pathname);
  return m ? m[1]! : null;
}

/** "875. Koko Eating Bananas - LeetCode" → "875. Koko Eating Bananas". */
export function titleFromDocument(title: string): string | null {
  const t = title.replace(/\s*-\s*LeetCode\s*$/i, "").trim();
  return t && t.toLowerCase() !== "leetcode" ? t.slice(0, 200) : null;
}

/** "12 ms" → 12. "N/A" → null. */
export function parseRuntimeMs(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? Math.round(v) : null;
  const m = typeof v === "string" ? /([\d.]+)\s*ms/i.exec(v) : null;
  return m ? Math.round(Number(m[1])) : null;
}

/** "20.5 MB" → 20992. Numbers are taken as bytes (the check endpoint reports bytes). */
export function parseMemoryKb(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? Math.round(v / 1024) : null;
  if (typeof v !== "string") return null;
  const m = /([\d.]+)\s*(KB|MB|GB)/i.exec(v);
  if (!m) return null;
  const mult = { KB: 1, MB: 1024, GB: 1024 * 1024 }[m[2]!.toUpperCase() as "KB" | "MB" | "GB"];
  return Math.round(Number(m[1]) * mult);
}

/** Result of /submissions/detail/<id>/check/ once judging is done. */
export type CheckResponse = {
  state?: string;
  status_msg?: string;
  lang?: string;
  pretty_lang?: string;
  status_runtime?: string;
  memory?: number;
  status_memory?: string;
  task_finish_time?: number;
};

export function submissionFromCheck(
  id: string,
  data: CheckResponse,
  now: number,
): ExtSubmission | null {
  if (data.state !== "SUCCESS" || !/^\d{1,20}$/.test(id)) return null;
  const at = typeof data.task_finish_time === "number" ? data.task_finish_time : now;
  return {
    id,
    verdict: leetcodeVerdict(data.status_msg),
    language: (data.lang ?? null)?.slice(0, 40) ?? null,
    runtimeMs: parseRuntimeMs(data.status_runtime),
    memoryKb:
      typeof data.memory === "number"
        ? parseMemoryKb(data.memory)
        : parseMemoryKb(data.status_memory),
    at: at > 1e12 ? at : now,
  };
}

/** One row of GET /api/submissions/ (the logged-in user's history). Code is ignored. */
export type HistoryRow = {
  id: number | string;
  title?: string;
  title_slug?: string;
  status_display?: string;
  lang?: string;
  timestamp?: number | string;
  runtime?: string;
  memory?: string;
  is_pending?: string | boolean;
};

export function historyItem(row: HistoryRow): ExtHistoryItem | null {
  const id = String(row.id);
  const ts = Number(row.timestamp);
  const pending = row.is_pending === true || row.is_pending === "Pending";
  if (pending || !/^\d{1,20}$/.test(id) || !row.title_slug || !Number.isFinite(ts)) return null;
  if (!/^[a-z0-9-]+$/.test(row.title_slug)) return null;
  return {
    id,
    titleSlug: row.title_slug,
    title: (row.title ?? row.title_slug).slice(0, 200),
    verdict: leetcodeVerdict(row.status_display),
    language: row.lang?.slice(0, 40) ?? null,
    runtimeMs: parseRuntimeMs(row.runtime),
    memoryKb: parseMemoryKb(row.memory),
    at: ts * 1000,
  };
}

/** Numeric comparison for LeetCode ids, which can exceed 2^53 in the far future. */
export function newerId(a: string, b: string): boolean {
  return a.length !== b.length ? a.length > b.length : a > b;
}
