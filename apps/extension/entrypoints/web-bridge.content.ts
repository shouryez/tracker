import { browser } from "wxt/browser";
import { defineContentScript } from "wxt/utils/define-content-script";
import { EXT_SOURCE, WEB_SOURCE, type Message } from "../lib/messages.ts";

/**
 * Lets the Upsolve website hand this extension its API token
 * (apps/web/src/app/extension/connect). The match pattern is a placeholder
 * that wxt.config.ts replaces with the configured web origin.
 */
export default defineContentScript({
  matches: ["https://upsolve.invalid/*"],
  runAt: "document_start",
  main() {
    const reply = (type: string) =>
      window.postMessage({ source: EXT_SOURCE, type }, window.location.origin);

    window.addEventListener("message", async (e: MessageEvent) => {
      if (e.source !== window || e.origin !== window.location.origin) return;
      if (!window.location.pathname.startsWith("/extension/connect")) return;
      const d = e.data as { source?: string; type?: string; token?: unknown } | null;
      if (d?.source !== WEB_SOURCE) return;

      if (d.type === "ping") reply("pong");

      if (
        d.type === "connect" &&
        typeof d.token === "string" &&
        /^ups_[A-Za-z0-9_-]{43}$/.test(d.token)
      ) {
        const msg: Message = { type: "auth:set", token: d.token };
        const res = (await browser.runtime.sendMessage(msg)) as { ok?: boolean } | undefined;
        if (res?.ok) reply("connected");
      }
    });
  },
});
