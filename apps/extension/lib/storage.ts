import { browser } from "wxt/browser";
import type { ExtSession } from "@upsolve/contracts";
import type { AutoPaused, LabState } from "./lab.ts";
import type { CurrentSession, HistoryState } from "./messages.ts";
import type { LocalSession, SessionPlatform } from "./session.ts";

/** LeetCode sessions keep their original key so in-progress ones survive the update. */
const sessionKey = (platform: SessionPlatform | undefined, slug: string) =>
  !platform || platform === "leetcode" ? `session:${slug}` : `session:${platform}:${slug}`;

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

  session: (platform: SessionPlatform, slug: string) =>
    get<LocalSession>(sessionKey(platform, slug)),
  setSession: (s: LocalSession) => set(sessionKey(s.platform, s.titleSlug), s),
  async allSessions(): Promise<LocalSession[]> {
    const all = await local().get(null);
    return Object.entries(all)
      .filter(([k]) => k.startsWith("session:"))
      .map(([, v]) => v as LocalSession);
  },
  removeSession: (s: LocalSession) => local().remove(sessionKey(s.platform, s.titleSlug)),

  outbox: async () => (await get<Record<string, ExtSession>>("outbox")) ?? {},
  setOutbox: (o: Record<string, ExtSession>) => set("outbox", o),

  history: () => get<HistoryState>("history"),
  setHistory: (h: HistoryState) => set("history", h),

  current: () => get<CurrentSession>("current"),
  setCurrent: (c: CurrentSession | null) => (c ? set("current", c) : local().remove("current")),

  lab: () => get<LabState>("lab"),
  setLab: (l: LabState | null) => (l ? set("lab", l) : local().remove("lab")),
  autoPaused: () => get<AutoPaused>("autoPaused"),
  setAutoPaused: (a: AutoPaused | null) =>
    a ? set("autoPaused", a) : local().remove("autoPaused"),
  /** Auto-pause on non-study tabs (on unless turned off in the popup). */
  autoPauseOn: async () => (await get<boolean>("autoPauseOn")) !== false,
  setAutoPauseOn: (on: boolean) => set("autoPauseOn", on),

  /** Notifications already shown (id → shown at, plus the URL a click opens). */
  notified: async () => (await get<Record<string, Notified>>("notified")) ?? {},
  setNotified: (n: Record<string, Notified>) => set("notified", n),
};

export type Notified = { at: number; url: string };

export const WEB_URL = __WEB_URL__;
