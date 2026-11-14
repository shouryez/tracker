import { defineContentScript } from "wxt/utils/define-content-script";
import { checkUrlSubmissionId, submitUrlSlug } from "../lib/leetcode.ts";

/**
 * Runs in LeetCode's own JavaScript context so it can see the judge's responses.
 * It reads two things and forwards them to the isolated content script:
 * - the response of /submissions/detail/<id>/[v2/]check/ (the verdict and, for a failed
 *   submission, the failing test), and
 * - the user's own code from their Submit request to /problems/<slug>/submit/, paired with
 *   the submission id in its response (WA autopsy, FINAL-FEATURES A2).
 * It never reads cookies or anything else, and never changes a request.
 */
export default defineContentScript({
  matches: ["https://leetcode.com/*"],
  world: "MAIN",
  runAt: "document_start",
  main() {
    const FIELDS = [
      "state",
      "status_msg",
      "lang",
      "status_runtime",
      "memory",
      "status_memory",
      "task_finish_time",
      "last_testcase",
      "expected_output",
      "code_output",
      "runtime_error",
    ] as const;

    /** The user's own Submit: the code and language sent, and the submission id returned. */
    const onSubmit = (url: string, body: unknown, responseText: string) => {
      const slug = submitUrlSlug(url);
      if (!slug || typeof body !== "string") return;
      try {
        const sent = JSON.parse(body) as { typed_code?: unknown; lang?: unknown };
        const got = JSON.parse(responseText) as { submission_id?: unknown };
        if (typeof sent.typed_code !== "string" || got.submission_id == null) return;
        window.postMessage(
          {
            source: "upsolve-hook",
            type: "code",
            id: String(got.submission_id),
            slug,
            code: sent.typed_code,
            lang: typeof sent.lang === "string" ? sent.lang : null,
          },
          window.location.origin,
        );
      } catch {
        // Not JSON: ignore.
      }
    };

    const inspect = (url: string, text: string) => {
      const id = checkUrlSubmissionId(url);
      if (!id) return;
      try {
        const data = JSON.parse(text) as Record<string, unknown>;
        if (data.state !== "SUCCESS") return;
        const picked: Record<string, unknown> = {};
        for (const f of FIELDS) picked[f] = data[f];
        window.postMessage(
          { source: "upsolve-hook", type: "check", id, data: picked },
          window.location.origin,
        );
      } catch {
        // Not JSON: ignore.
      }
    };

    const originalFetch = window.fetch;
    window.fetch = async function (...args: Parameters<typeof fetch>) {
      const response = await originalFetch.apply(this, args);
      try {
        const input = args[0];
        const url =
          typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
        if (checkUrlSubmissionId(url)) {
          response
            .clone()
            .text()
            .then((t) => inspect(url, t))
            .catch(() => {});
        } else if (submitUrlSlug(url)) {
          const body = args[1]?.body;
          response
            .clone()
            .text()
            .then((t) => onSubmit(url, body, t))
            .catch(() => {});
        }
      } catch {
        // Never break the page.
      }
      return response;
    };

    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (
      this: XMLHttpRequest,
      method: string,
      url: string | URL,
      ...rest: unknown[]
    ) {
      const href = String(url);
      if (checkUrlSubmissionId(href)) {
        this.addEventListener("load", () => {
          if (this.responseType === "" || this.responseType === "text") {
            inspect(href, this.responseText);
          }
        });
      }
      if (submitUrlSlug(href)) submitXhr.set(this, href);
      return (originalOpen as (...a: unknown[]) => void).call(this, method, url, ...rest);
    } as typeof XMLHttpRequest.prototype.open;

    const submitXhr = new WeakMap<XMLHttpRequest, string>();
    const originalSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function (
      this: XMLHttpRequest,
      body?: Document | XMLHttpRequestBodyInit | null,
    ) {
      const href = submitXhr.get(this);
      if (href) {
        this.addEventListener("load", () => {
          if (this.responseType === "" || this.responseType === "text") {
            onSubmit(href, body, this.responseText);
          }
        });
      }
      return originalSend.call(this, body);
    };
  },
});
