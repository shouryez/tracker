import { browser } from "wxt/browser";
import { defineContentScript } from "wxt/utils/define-content-script";
import { maybeImportHistory } from "../lib/history-import.ts";
import {
  problemSlug,
  submissionFromCheck,
  submissionIdFromPath,
  titleFromDocument,
  type CheckResponse,
} from "../lib/leetcode.ts";
import { HOOK_SOURCE } from "../lib/messages.ts";
import { startTracker } from "../lib/tracker.ts";

export default defineContentScript({
  matches: ["https://leetcode.com/*"],
  runAt: "document_idle",
  async main(ctx) {
    /** Submission pages we've already looked up, so each is fetched once. */
    const lookedUp = new Set<string>();

    const tracker = await startTracker(ctx, {
      platform: "leetcode",
      slugFromPath: problemSlug,
      titleFromDocument,
      onTick(session) {
        const id = submissionIdFromPath(window.location.pathname);
        if (id && !lookedUp.has(id) && !session.submissions.some((x) => x.id === id)) {
          lookedUp.add(id);
          void lookUpSubmission(id);
        }
      },
    });

    const onCheck = (id: string, data: CheckResponse) => {
      const sub = submissionFromCheck(id, data, Date.now());
      if (sub) void tracker.recordSubmission(sub);
    };

    /**
     * Backup for the hook: after Submit, LeetCode navigates to
     * /problems/<slug>/submissions/<id>/. Read that submission's result directly,
     * but only count it if it finished during this session (not an old one being viewed).
     */
    async function lookUpSubmission(id: string) {
      for (let attempt = 0; attempt < 6; attempt++) {
        try {
          const res = await fetch(`/submissions/detail/${id}/v2/check/`, {
            credentials: "same-origin",
            headers: { Accept: "application/json" },
          });
          if (!res.ok) return;
          const data = (await res.json()) as CheckResponse;
          if (data.state === "SUCCESS") {
            const finished = typeof data.task_finish_time === "number" ? data.task_finish_time : 0;
            const session = tracker.current();
            if (session && finished >= session.createdAt - 60_000) onCheck(id, data);
            return;
          }
        } catch {
          return;
        }
        await new Promise((r) => setTimeout(r, 2000)); // still judging
      }
    }

    // Verdicts from the MAIN-world hook.
    ctx.addEventListener(window, "message", (e: MessageEvent) => {
      if (e.source !== window || e.origin !== window.location.origin) return;
      const d = e.data as { source?: string; type?: string; id?: unknown; data?: unknown } | null;
      if (d?.source !== HOOK_SOURCE || d.type !== "check" || typeof d.id !== "string") return;
      onCheck(d.id, (d.data ?? {}) as CheckResponse);
    });

    browser.storage.onChanged.addListener((changes, area) => {
      if (area === "local" && changes.token?.newValue) void maybeImportHistory();
    });
    ctx.setTimeout(() => void maybeImportHistory(), 5000);
  },
});

// DsaKaro
