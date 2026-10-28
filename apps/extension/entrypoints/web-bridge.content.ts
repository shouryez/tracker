import { browser } from "wxt/browser";
import { defineContentScript } from "wxt/utils/define-content-script";
import { EXT_SOURCE, WEB_SOURCE, type Message } from "../lib/messages.ts";

/**
 * Lets the Upsolve website hand this extension its API token
 * (apps/web/src/app/extension/connect) and drive Lab-mode tab tracking
 * (apps/web/src/lib/ext-bridge.ts). The match pattern is a placeholder
 * that wxt.config.ts replaces with the configured web origin.
 */
export default defineContentScript({
  matches: ["https://upsolve.invalid/*"],
  runAt: "document_start",
  main() {
    const reply = (type: string, data: object = {}) =>
      window.postMessage({ source: EXT_SOURCE, type, ...data }, window.location.origin);
    const ask = (msg: Message) => browser.runtime.sendMessage(msg) as Promise<object | undefined>;

    window.addEventListener("message", async (e: MessageEvent) => {
      if (e.source !== window || e.origin !== window.location.origin) return;
      const d = e.data as {
        source?: string;
        type?: string;
        token?: unknown;
        focusId?: unknown;
        startedAt?: unknown;
      } | null;
      if (d?.source !== WEB_SOURCE) return;

      // Lab mode works from any dashboard page: only totals ever come back.
      if (d.type === "lab-start" && typeof d.focusId === "string") {
        const startedAt = typeof d.startedAt === "number" ? d.startedAt : Date.now();
        reply(
          "lab-totals",
          (await ask({ type: "lab:start", focusId: d.focusId, startedAt })) ?? {},
        );
        return;
      }
      if (d.type === "lab-status") {
        reply("lab-totals", (await ask({ type: "lab:status" })) ?? {});
        return;
      }
      if (d.type === "lab-stop") {
        reply("lab-totals", (await ask({ type: "lab:stop", report: false })) ?? {});
        return;
      }

      if (!window.location.pathname.startsWith("/extension/connect")) return;

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
