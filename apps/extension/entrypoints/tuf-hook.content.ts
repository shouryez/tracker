import { defineContentScript } from "wxt/utils/define-content-script";
import { isTufProgressUrl, tufTickFromBody } from "../lib/tuf.ts";

/**
 * Runs in takeUforward's own JavaScript context and only notices when you tick or untick a
 * sheet item (a POST to its progress API). It forwards the sheet, the item's id and whether
 * it was a tick, once the request succeeds. It reads nothing else and never changes a request.
 */
export default defineContentScript({
  matches: ["https://takeuforward.org/*"],
  world: "MAIN",
  runAt: "document_start",
  main() {
    const announce = (body: unknown) => {
      const tick = tufTickFromBody(body);
      if (tick)
        window.postMessage(
          { source: "upsolve-hook", type: "tuf-tick", ...tick },
          window.location.origin,
        );
    };

    const originalFetch = window.fetch;
    window.fetch = async function (...args: Parameters<typeof fetch>) {
      const response = await originalFetch.apply(this, args);
      try {
        const [input, init] = args;
        const url =
          typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
        const method = (
          init?.method ?? (input instanceof Request ? input.method : "GET")
        ).toUpperCase();
        if (method === "POST" && isTufProgressUrl(url) && response.ok) announce(init?.body);
      } catch {
        // Never break the page.
      }
      return response;
    };

    const meta = new WeakMap<XMLHttpRequest, { method: string; url: string }>();
    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (
      this: XMLHttpRequest,
      method: string,
      url: string | URL,
      ...rest: unknown[]
    ) {
      meta.set(this, { method: String(method).toUpperCase(), url: String(url) });
      return (originalOpen as (...a: unknown[]) => void).call(this, method, url, ...rest);
    } as typeof XMLHttpRequest.prototype.open;

    const originalSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function (
      this: XMLHttpRequest,
      body?: Document | XMLHttpRequestBodyInit | null,
    ) {
      try {
        const m = meta.get(this);
        if (m?.method === "POST" && isTufProgressUrl(m.url)) {
          this.addEventListener("load", () => {
            if (this.status >= 200 && this.status < 300) announce(body);
          });
        }
      } catch {
        // Never break the page.
      }
      return originalSend.call(this, body);
    };
  },
});
