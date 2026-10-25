import { defineContentScript } from "wxt/utils/define-content-script";

/**
 * Runs in LeetCode's own JavaScript context so it can see the judge's responses.
 * It only reads the response of /submissions/detail/<id>/check/ (the verdict)
 * and forwards a few fields to the isolated content script. It never reads
 * code, cookies or anything else, and never changes a request.
 */
export default defineContentScript({
  matches: ["https://leetcode.com/*"],
  world: "MAIN",
  runAt: "document_start",
  main() {
    const CHECK = /\/submissions\/detail\/([^/?#]+)\/check\/?/;
    const FIELDS = [
      "state",
      "status_msg",
      "lang",
      "status_runtime",
      "memory",
      "status_memory",
      "task_finish_time",
    ] as const;

    const inspect = (url: string, text: string) => {
      const m = CHECK.exec(url);
      if (!m) return;
      try {
        const data = JSON.parse(text) as Record<string, unknown>;
        if (data.state !== "SUCCESS") return;
        const picked: Record<string, unknown> = {};
        for (const f of FIELDS) picked[f] = data[f];
        window.postMessage(
          { source: "upsolve-hook", type: "check", id: m[1], data: picked },
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
        if (CHECK.test(url)) {
          response
            .clone()
            .text()
            .then((t) => inspect(url, t))
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
      if (CHECK.test(href)) {
        this.addEventListener("load", () => {
          if (this.responseType === "" || this.responseType === "text") {
            inspect(href, this.responseText);
          }
        });
      }
      return (originalOpen as (...a: unknown[]) => void).call(this, method, url, ...rest);
    } as typeof XMLHttpRequest.prototype.open;
  },
});
