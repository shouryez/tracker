import { browser } from "wxt/browser";
import type { ExtSession } from "@upsolve/contracts";
import type { CurrentSession, HistoryState } from "./messages.ts";
import type { LocalSession } from "./session.ts";

const local = () => browser.storage.local;

async function get<T>(key: string): Promise<T | undefined> {
  const out = await local().get(key);
  return out[key] as T | undefined;
}
const set = (key: string, value: unknown) => local().set({ [key]: value });

export const store = {
  token: () => get<string>("token"),
  setToken: (t: string | null) => (t ? set("token", t) : local().remove("token")),
  authError: () => get<string>("authError"),
  setAuthError: (e: string | null) => (e ? set("authError", e) : local().remove("authError")),

  session: (slug: string) => get<LocalSession>(`session:${slug}`),
  setSession: (s: LocalSession) => set(`session:${s.titleSlug}`, s),
  async allSessions(): Promise<LocalSession[]> {
    const all = await local().get(null);
    return Object.entries(all)
      .filter(([k]) => k.startsWith("session:"))
      .map(([, v]) => v as LocalSession);
  },
  removeSession: (slug: string) => local().remove(`session:${slug}`),

  outbox: async () => (await get<Record<string, ExtSession>>("outbox")) ?? {},
  setOutbox: (o: Record<string, ExtSession>) => set("outbox", o),

  history: () => get<HistoryState>("history"),
  setHistory: (h: HistoryState) => set("history", h),

  current: () => get<CurrentSession>("current"),
  setCurrent: (c: CurrentSession | null) => (c ? set("current", c) : local().remove("current")),
};

export const WEB_URL = __WEB_URL__;
