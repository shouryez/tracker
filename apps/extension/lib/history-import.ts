// Imports the user's past LeetCode submissions using their own logged-in session.
// Runs inside the leetcode.com content script so requests are same-origin; cookies
// never leave the browser and only verdict metadata (never code) is uploaded.
import { browser } from "wxt/browser";
import type { ExtHistoryItem } from "@upsolve/contracts";
import { historyItem, newerId, type HistoryRow } from "./leetcode.ts";
import type { HistoryState, PutResult } from "./messages.ts";
import { store } from "./storage.ts";

const PAGE = 20;
const GAP_MS = 1500;
const LOCK_MS = 60_000;
/** After an error, wait this long before trying again. */
const RETRY_AFTER_MS = 30 * 60_000;
/** After a finished import, check for new submissions at most this often. */
const RECHECK_MS = 6 * 60 * 60 * 1000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const initial = (): HistoryState => ({
  status: "idle",
  offset: 0,
  lastKey: "",
  newestId: null,
  runNewestId: null,
  imported: 0,
  finishedAt: null,
  lockUntil: 0,
  error: null,
});

async function upload(items: ExtHistoryItem[]): Promise<PutResult> {
  return browser.runtime.sendMessage({ type: "history:put", items });
}

/** Starts or resumes the import if it's due. Safe to call from several tabs. */
export async function maybeImportHistory(): Promise<void> {
  if (!(await store.token())) return;
  let state = (await store.history()) ?? initial();
  const now = Date.now();
  if (state.lockUntil > now) return; // another tab is importing
  if (state.status === "done" && state.finishedAt && now - state.finishedAt < RECHECK_MS) return;

  const save = async (patch: Partial<HistoryState>) => {
    state = { ...state, ...patch, lockUntil: patch.lockUntil ?? Date.now() + LOCK_MS };
    await store.setHistory(state);
  };
  // A finished import restarts from the newest page and stops at what it already has.
  if (state.status === "done") await save({ offset: 0, lastKey: "", runNewestId: null });
  await save({ status: "running", error: null });

  let buffer: ExtHistoryItem[] = [];
  const flushBuffer = async () => {
    if (buffer.length === 0) return true;
    const res = await upload(buffer);
    if (!res.ok) {
      await save({ status: "error", error: res.error, lockUntil: Date.now() + RETRY_AFTER_MS });
      return false;
    }
    await save({ imported: state.imported + res.stored });
    buffer = [];
    return true;
  };

  try {
    for (;;) {
      const url = `/api/submissions/?offset=${state.offset}&limit=${PAGE}&lastkey=${encodeURIComponent(state.lastKey)}`;
      const res = await fetch(url, {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });
      if (res.status === 401 || res.status === 403) {
        await save({
          status: "error",
          error: "Sign in to LeetCode to import your history.",
          lockUntil: Date.now() + RETRY_AFTER_MS,
        });
        return;
      }
      if (res.status === 429) {
        await save({
          status: "error",
          error: "LeetCode asked us to slow down. Will retry later.",
          lockUntil: Date.now() + RETRY_AFTER_MS,
        });
        return;
      }
      if (!res.ok) throw new Error(`LeetCode returned HTTP ${res.status}`);
      const body = (await res.json()) as {
        submissions_dump?: HistoryRow[];
        has_next?: boolean;
        last_key?: string;
      };
      const rows = body.submissions_dump ?? [];

      let reachedKnown = false;
      for (const row of rows) {
        const item = historyItem(row);
        if (!item) continue;
        if (state.newestId && !newerId(item.id, state.newestId)) {
          reachedKnown = true;
          break;
        }
        if (!state.runNewestId || newerId(item.id, state.runNewestId)) state.runNewestId = item.id;
        buffer.push(item);
      }

      // Upload before recording progress, so an interruption never skips items.
      if (!(await flushBuffer())) return;
      await save({
        offset: state.offset + PAGE,
        lastKey: body.last_key ?? "",
        runNewestId: state.runNewestId,
      });

      if (reachedKnown || !body.has_next || rows.length === 0) break;
      await sleep(GAP_MS);
    }
    if (!(await flushBuffer())) return;
    await save({
      status: "done",
      finishedAt: Date.now(),
      newestId: state.runNewestId ?? state.newestId,
      runNewestId: null,
      offset: 0,
      lastKey: "",
      lockUntil: 0,
    });
  } catch (err) {
    await save({
      status: "error",
      error: (err as Error).message,
      lockUntil: Date.now() + RETRY_AFTER_MS,
    });
  }
}

// DsaKaro
