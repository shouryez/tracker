import { defineContentScript } from "wxt/utils/define-content-script";
import { gfgProblemSlug, gfgTitleFromDocument, gfgVerdictFromText } from "../lib/gfg.ts";
import { HOOK_SOURCE } from "../lib/messages.ts";
import { startTracker } from "../lib/tracker.ts";

/** How long to wait for a verdict after Submit before giving up. */
const VERDICT_TIMEOUT_MS = 90_000;

export default defineContentScript({
  matches: ["https://www.geeksforgeeks.org/problems/*"],
  runAt: "document_idle",
  async main(ctx) {
    const tracker = await startTracker(ctx, {
      platform: "geeksforgeeks",
      slugFromPath: gfgProblemSlug,
      titleFromDocument: gfgTitleFromDocument,
    });

    const panelText = () =>
      (document.querySelector<HTMLElement>('[class*="output_window"]')?.innerText ?? "").trim();

    let watching: number | null = null;

    // After Submit, wait for GFG's result panel to show a new verdict.
    ctx.addEventListener(window, "message", (e: MessageEvent) => {
      if (e.source !== window || e.origin !== window.location.origin) return;
      const d = e.data as { source?: string; type?: string } | null;
      if (d?.source !== HOOK_SOURCE || d.type !== "gfg-submit") return;

      if (watching !== null) clearInterval(watching);
      const before = panelText();
      const submittedAt = Date.now();
      watching = ctx.setInterval(() => {
        const text = panelText();
        const verdict = text !== before ? gfgVerdictFromText(text) : null;
        if (verdict) {
          clearInterval(watching!);
          watching = null;
          void tracker.recordSubmission({
            // GFG doesn't expose a submission id to the page; the submit time is unique per user.
            id: String(submittedAt),
            verdict,
            language: null,
            runtimeMs: null,
            memoryKb: null,
            at: Date.now(),
          });
        } else if (Date.now() - submittedAt > VERDICT_TIMEOUT_MS) {
          clearInterval(watching!);
          watching = null;
        }
      }, 500);
    });
  },
});

// DsaKaro
