import { defineContentScript } from "wxt/utils/define-content-script";
import { isGfgSubmitRequest } from "../lib/gfg.ts";

/**
 * Runs in GeeksforGeeks' own JavaScript context and only notices when the
 * Submit request is sent (not Compile & Run). It reads nothing from the
 * request or response; the verdict is read from the result panel instead.
 */
export default defineContentScript({
  matches: ["https://www.geeksforgeeks.org/*"],
  world: "MAIN",
  runAt: "document_start",
  main() {
    const announce = () =>
      window.postMessage({ source: "upsolve-hook", type: "gfg-submit" }, window.location.origin);

    const originalFetch = window.fetch;
    window.fetch = function (...args: Parameters<typeof fetch>) {
      try {
        const input = args[0];
        const url =
          typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
        if (isGfgSubmitRequest(url)) announce();
      } catch {
        // Never break the page.
      }
      return originalFetch.apply(this, args);
    };

    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (
      this: XMLHttpRequest,
      method: string,
      url: string | URL,
      ...rest: unknown[]
    ) {
      if (isGfgSubmitRequest(String(url))) announce();
      return (originalOpen as (...a: unknown[]) => void).call(this, method, url, ...rest);
    } as typeof XMLHttpRequest.prototype.open;
  },
});

// DsaKaro
