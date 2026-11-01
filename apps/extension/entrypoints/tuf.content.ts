import { browser } from "wxt/browser";
import { toWorker } from "../lib/runtime.ts";
import { defineContentScript } from "wxt/utils/define-content-script";
import type { ExtSheetStateResponse } from "@upsolve/contracts";
import { HOOK_SOURCE, type Message } from "../lib/messages.ts";
import { parseTufSheet, planTufChanges, tufTickRequest, type TufSheet } from "../lib/tuf.ts";

/** Ticks come in bursts (tick, tick, untick): sync once they settle. */
const SETTLE_MS = 1500;
/** A full match (every followed sheet, both ways) runs at most this often. */
const FULL_EVERY_MS = 10 * 60_000;
/** Gentle on takeUforward: at most this many changes per pass, a short gap between them. */
const MAX_OPS = 80;
const GAP_MS = 250;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Keeps a Striver sheet identical on takeUforward and DsaKaro, both ways.
 * - TUF → DsaKaro: ticking or unticking there syncs at once (seen by the MAIN-world hook).
 * - DsaKaro → TUF: ticks made in DsaKaro are queued; from any takeuforward.org tab they're
 *   applied here with your own TUF login, as TUF's page would. A full match (on open, at most
 *   every 10 min) also ticks on TUF whatever is done in DsaKaro but not there.
 * Only item slugs and ticked/unticked cross over; nothing else is read or sent.
 */
export default defineContentScript({
  matches: ["https://takeuforward.org/*"],
  runAt: "document_idle",
  main(ctx) {
    const ask = <T>(msg: Message) => toWorker<T>(msg);

    const send = (
      sheet: TufSheet,
      opts: { removed?: string[]; added?: string[]; changed?: string[]; skip?: string[] } = {},
    ) => {
      const { removed = [], added = [], changed = [], skip = [] } = opts;
      const solved = [
        ...new Set([...sheet.items.filter((i) => i.solved).map((i) => i.slug), ...added]),
      ].filter((s) => !removed.includes(s) && !skip.includes(s));
      if (solved.length === 0 && removed.length === 0) return;
      void ask({ type: "tuf:sync", sheet: sheet.sheet, solved, removed, changed });
    };

    /** The signed-in sheet page, fetched fresh (same site, so it carries your ticks). */
    const fetchSheet = async (sheet: string) => {
      try {
        const res = await fetch(`/prep-hub/${encodeURIComponent(sheet)}?page=sheet`, {
          credentials: "include",
          headers: { Accept: "text/html" },
        });
        return res.ok ? parseTufSheet(await res.text()) : null;
      } catch {
        return null;
      }
    };

    /** Ticks or unticks one item on takeUforward. */
    const tick = async (sheet: string, id: number, action: "add" | "remove") => {
      const { url, init } = tufTickRequest(sheet, id, action);
      try {
        return (await fetch(url, init)).ok;
      } catch {
        return false;
      }
    };

    let running = false;
    /** Applies DsaKaro's pending changes on TUF; with `full`, matches both sheets completely. */
    const reconcile = async (full: boolean) => {
      if (running) return;
      running = true;
      try {
        const state = await ask<ExtSheetStateResponse | null>({ type: "tuf:state" });
        if (!state?.sheets) return;
        let budget = MAX_OPS;
        for (const s of state.sheets) {
          if (!full && s.pending.length === 0) continue;
          const tuf = await fetchSheet(s.sheet);
          if (!tuf) continue;
          const plan = planTufChanges(tuf, s.done, s.pending, full);
          const settled = [...plan.settled];
          const applied = new Map<string, boolean>();
          for (const op of plan.ops) {
            if (budget-- <= 0) break;
            if (await tick(s.sheet, op.id, op.action)) {
              applied.set(op.slug, op.action === "add");
              settled.push(op.slug);
            }
            await sleep(GAP_MS);
          }
          if (settled.length > 0)
            void ask({ type: "tuf:ack", sheet: s.sheet, slugs: settled, before: state.at });
          if (full) {
            // TUF → DsaKaro, now that DsaKaro's own changes are applied: never re-add an item
            // that DsaKaro just unticked (if that untick couldn't reach TUF yet).
            const after: TufSheet = {
              sheet: tuf.sheet,
              items: tuf.items.map((i) =>
                applied.has(i.slug) ? { ...i, solved: applied.get(i.slug)! } : i,
              ),
            };
            send(after, { skip: plan.pendingUnticks.filter((x) => !applied.has(x)) });
          }
        }
      } finally {
        running = false;
      }
    };

    // On open: a full match, unless one ran recently; otherwise just the pending changes.
    void (async () => {
      const key = "tufFullAt";
      const last = Number((await browser.storage.local.get(key))[key] ?? 0);
      const full = Date.now() - last > FULL_EVERY_MS;
      if (full) await browser.storage.local.set({ [key]: Date.now() });
      await reconcile(full);
    })();

    // The background asks every minute while a TUF tab is open, so ticks made in DsaKaro
    // reach TUF within a minute.
    browser.runtime.onMessage.addListener((msg: { type?: string }) => {
      if (msg?.type === "tuf:reconcile") void reconcile(false);
    });

    // Live ticks on TUF, from the MAIN-world hook.
    const live = new Map<string, { add: Set<number>; remove: Set<number> }>();
    let timer: number | undefined;
    const flush = async () => {
      timer = undefined;
      const batch = [...live.entries()];
      live.clear();
      for (const [sheetSlug, { add, remove }] of batch) {
        const sheet = await fetchSheet(sheetSlug);
        if (!sheet) continue;
        const slugOf = new Map(sheet.items.map((i) => [i.id, i.slug]));
        const slugs = (ids: Set<number>) =>
          [...ids].map((id) => slugOf.get(id)).filter((s): s is string => Boolean(s));
        const removed = slugs(remove);
        const added = slugs(add);
        send(sheet, { removed, added, changed: [...removed, ...added] });
      }
    };
    ctx.addEventListener(window, "message", (e: MessageEvent) => {
      if (e.source !== window || e.origin !== window.location.origin) return;
      const d = e.data as {
        source?: string;
        type?: string;
        sheet?: unknown;
        problemId?: unknown;
        action?: unknown;
      } | null;
      if (d?.source !== HOOK_SOURCE || d.type !== "tuf-tick") return;
      if (typeof d.sheet !== "string" || typeof d.problemId !== "number") return;
      const entry = live.get(d.sheet) ?? { add: new Set<number>(), remove: new Set<number>() };
      if (d.action === "remove") {
        entry.remove.add(d.problemId);
        entry.add.delete(d.problemId);
      } else {
        entry.add.add(d.problemId);
        entry.remove.delete(d.problemId);
      }
      live.set(d.sheet, entry);
      if (timer !== undefined) clearTimeout(timer);
      timer = ctx.setTimeout(() => void flush(), SETTLE_MS);
    });
  },
});
