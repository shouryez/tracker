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
import { toWorker } from "../lib/runtime.ts";
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

    /** Code from the user's own Submit, by submission id, until its verdict arrives. */
    const codeById = new Map<string, { slug: string; code: string }>();
    /** Verdicts that came before their code (rare), so the pair still gets sent. */
    const checkById = new Map<string, CheckResponse>();
    const sentCode = new Set<string>();

    /** WA autopsy (A2): the code of a submission in this session, with its failing test. */
    const sendCode = (id: string) => {
      const code = codeById.get(id);
      const data = checkById.get(id);
      const session = tracker.current();
      if (!code || !data || sentCode.has(id) || !session || session.titleSlug !== code.slug) return;
      const sub = submissionFromCheck(id, data, Date.now());
      if (!sub) return;
      sentCode.add(id);
      codeById.delete(id);
      checkById.delete(id);
      const clip = (v: unknown) => (typeof v === "string" && v ? v.slice(0, 4000) : null);
      void toWorker({
        type: "code:put",
        body: {
          platform: "leetcode",
          titleSlug: code.slug,
          title: session.title,
          submission: sub,
          code: code.code.slice(0, 64_000),
          failingInput: sub.verdict === "AC" ? null : clip(data.last_testcase),
          expected: sub.verdict === "AC" ? null : clip(data.expected_output),
          actual: sub.verdict === "AC" ? null : clip(data.code_output ?? data.runtime_error),
        },
      });
    };

    const onCheck = (id: string, data: CheckResponse) => {
      const sub = submissionFromCheck(id, data, Date.now());
      if (!sub) return;
      void tracker.recordSubmission(sub);
      checkById.set(id, data);
      sendCode(id);
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
      const d = e.data as {
        source?: string;
        type?: string;
        id?: unknown;
        data?: unknown;
        slug?: unknown;
        code?: unknown;
      } | null;
      if (d?.source !== HOOK_SOURCE || typeof d.id !== "string") return;
      if (d.type === "check") onCheck(d.id, (d.data ?? {}) as CheckResponse);
      else if (d.type === "code" && typeof d.slug === "string" && typeof d.code === "string") {
        codeById.set(d.id, { slug: d.slug, code: d.code });
        sendCode(d.id);
      }
    });

    browser.storage.onChanged.addListener((changes, area) => {
      if (area === "local" && changes.token?.newValue) void maybeImportHistory();
    });
    ctx.setTimeout(() => void maybeImportHistory(), 5000);
  },
});
