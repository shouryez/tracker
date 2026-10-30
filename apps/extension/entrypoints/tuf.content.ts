import { browser } from "wxt/browser";
import { defineContentScript } from "wxt/utils/define-content-script";
import { HOOK_SOURCE, type Message } from "../lib/messages.ts";
import { parseTufSheet, type TufSheet } from "../lib/tuf.ts";

/** Ticks come in bursts (tick, tick, untick): sync once they settle. */
const SETTLE_MS = 1500;

/**
 * Keeps DsaKaro's copy of a Striver sheet in step with your ticks on takeUforward.
 * Opening a sheet page there syncs everything it shows as solved; ticking or unticking an
 * item syncs that change straight away. Only item slugs and ticked/unticked are sent.
 */
export default defineContentScript({
  matches: ["https://takeuforward.org/*"],
  runAt: "document_idle",
  main(ctx) {
    const send = (sheet: TufSheet, removed: string[] = [], added: string[] = []) => {
      const solved = [
        ...new Set([...sheet.items.filter((i) => i.solved).map((i) => i.slug), ...added]),
      ].filter((s) => !removed.includes(s));
      if (solved.length === 0 && removed.length === 0) return;
      const msg: Message = { type: "tuf:sync", sheet: sheet.sheet, solved, removed };
      browser.runtime.sendMessage(msg).catch(() => {
        // Worker asleep or not connected: the next visit to the sheet syncs it.
      });
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

    // A sheet page opened directly: its own HTML already has the ticks.
    if (window.location.pathname.startsWith("/prep-hub/")) {
      const here = parseTufSheet(document.documentElement.outerHTML);
      if (here) send(here);
    }

    // Live ticks, from the MAIN-world hook.
    const pending = new Map<string, { add: Set<number>; remove: Set<number> }>();
    let timer: number | undefined;
    const flush = async () => {
      timer = undefined;
      const batch = [...pending.entries()];
      pending.clear();
      for (const [sheetSlug, { add, remove }] of batch) {
        const sheet = await fetchSheet(sheetSlug);
        if (!sheet) continue;
        const slugOf = new Map(sheet.items.map((i) => [i.id, i.slug]));
        const slugs = (ids: Set<number>) =>
          [...ids].map((id) => slugOf.get(id)).filter((s): s is string => Boolean(s));
        send(sheet, slugs(remove), slugs(add));
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
      const entry = pending.get(d.sheet) ?? { add: new Set<number>(), remove: new Set<number>() };
      if (d.action === "remove") {
        entry.remove.add(d.problemId);
        entry.add.delete(d.problemId);
      } else {
        entry.add.add(d.problemId);
        entry.remove.delete(d.problemId);
      }
      pending.set(d.sheet, entry);
      if (timer !== undefined) clearTimeout(timer);
      timer = ctx.setTimeout(() => void flush(), SETTLE_MS);
    });
  },
});

// DsaKaro
