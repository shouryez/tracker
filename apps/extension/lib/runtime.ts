import { browser } from "wxt/browser";
import type { Message } from "./messages.ts";

/**
 * Whether this content script still belongs to a live extension. After the extension is
 * reloaded or updated, scripts already in open tabs keep running but are cut off from it.
 */
export const extensionAlive = () => {
  try {
    return Boolean(browser.runtime?.id);
  } catch {
    return false;
  }
};

/**
 * Sends a message to the background worker; null when it can't answer (asleep, or this
 * script was orphaned by an update). sendMessage throws synchronously in the orphaned case
 * ("Extension context invalidated"), which a .catch() on its promise never sees.
 */
export async function toWorker<T>(msg: Message): Promise<T | null> {
  if (!extensionAlive()) return null;
  try {
    return ((await browser.runtime.sendMessage(msg)) as T) ?? null;
  } catch {
    return null;
  }
}
