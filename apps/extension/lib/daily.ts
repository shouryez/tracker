// Background-side daily loop: Lab tab tracking, reminders and contest alerts,
// group nudges, and save-for-later. Imported by entrypoints/background.ts.
import { browser } from "wxt/browser";
import type { ExtProblemContext, ExtTodayResponse } from "@upsolve/contracts";
import {
  AUTO_PAUSE_MS,
  advance,
  categorize,
  describe,
  newLab,
  shouldAutoPause,
  totals,
  type AutoPaused,
  type LabActivity,
  type LabState,
  type LabTotals,
} from "./lab.ts";
import type {
  LabLive,
  Message,
  Status,
  YoutubeChannelRequest,
  YoutubeTimeRequest,
} from "./messages.ts";
import { WEB_URL, store, type Notified } from "./storage.ts";

type Api = (path: string, init?: RequestInit) => Promise<Response | null>;

const WEB_ORIGIN = new URL(WEB_URL).origin;
const CONTEST_LEAD_MS = 35 * 60_000;
const NOTIFIED_KEEP_MS = 3 * 86_400_000;

// ---------------------------------------------------------------- Lab mode

const AWAY_ALARM = "lab-away";

async function youtubeChannel(tabId: number | undefined, url: string | undefined) {
  if (
    tabId === undefined ||
    !url ||
    !/^https:\/\/(www\.|m\.)?youtube\.com\/(watch|shorts)/.test(url)
  )
    return null;
  try {
    const req: YoutubeChannelRequest = { type: "yt:channel" };
    return ((await browser.tabs.sendMessage(tabId, req)) as string | null) ?? null;
  } catch {
    return null; // Content script not there (tab opened before install).
  }
}

/** What the active tab is. Nothing about it is stored; it's only shown live and classified. */
async function activeTab(): Promise<LabActivity> {
  try {
    const win = await browser.windows.getLastFocused();
    if (!win.focused || win.id === undefined)
      return { cat: "away", known: false, kind: null, label: null };
    const [tab] = await browser.tabs.query({ active: true, windowId: win.id });
    const channel = await youtubeChannel(tab?.id, tab?.url);
    const cat = categorize(tab?.url, tab?.title, WEB_ORIGIN, channel);
    return { cat, known: true, ...describe(tab?.url, tab?.title, cat, WEB_ORIGIN) };
  } catch {
    return { cat: "away", known: false, kind: null, label: null };
  }
}

/** One Lab step at a time: tab events can fire in bursts, and a step may call the API. */
let chain: Promise<unknown> = Promise.resolve();
let api: Api | null = null;

/**
 * Advances the running Lab session to now. Cheap; called on every tab or window change.
 * With auto-pause on: a known non-study tab for AUTO_PAUSE_MS pauses the session; the next
 * study tab resumes a session paused that way.
 */
export function labStep(): Promise<LabLive> {
  const run = chain.then(step);
  chain = run.catch(() => {});
  return run;
}

async function step(): Promise<LabLive> {
  const now = Date.now();
  const seen = await activeTab();
  const on = await store.autoPauseOn();
  const s = await store.lab();

  if (!s) {
    const auto = await store.autoPaused();
    if (auto && on && seen.known && seen.cat === "focus") await autoResume(auto);
    return live(seen);
  }

  const next = advance(s, now, seen.cat);
  // Only a tab we can see counts toward auto-pause: another app (an IDE, a PDF) never does.
  next.awaySince = seen.known && seen.cat === "away" ? (s.awaySince ?? now) : null;
  await store.setLab(next);

  if (on && shouldAutoPause(next.awaySince, now)) {
    await autoPause(next, seen);
  } else if (on && next.awaySince != null) {
    // Check again when the grace period ends, even if no tab event comes.
    await browser.alarms.create(AWAY_ALARM, { when: next.awaySince + AUTO_PAUSE_MS + 500 });
  }
  return live(seen);
}

async function live(seen: LabActivity): Promise<LabLive> {
  const s = await store.lab();
  return {
    ...totals(s),
    now: seen,
    autoPaused: Boolean(await store.autoPaused()),
    autoPauseOn: await store.autoPauseOn(),
  };
}

async function post(path: string, body: object): Promise<number | null> {
  try {
    const res = await api?.(path, { method: "POST", body: JSON.stringify(body) });
    if (!res?.ok) return null;
    return ((await res.json()) as { stored?: number }).stored ?? 0;
  } catch {
    return null; // Offline: try again on the next step.
  }
}

async function autoPause(s: LabState, seen: LabActivity) {
  const stored = await post("/api/ext/focus/pause", {
    focusId: s.focusId,
    focusMs: s.focusMs,
    awayMs: s.awayMs,
    switches: s.switches,
  });
  if (stored === null) return;
  await store.setLab(null);
  await browser.alarms.clear(AWAY_ALARM);
  // 0: already paused or ended elsewhere; nothing to resume then.
  if (stored === 0) return;
  const host = seen.kind === "page" ? seen.label : null;
  await store.setAutoPaused({ focusId: s.focusId, startedAt: s.startedAt, at: Date.now(), host });
  await browser.notifications.create(`autopause:${s.focusId}:${Date.now()}`, {
    type: "basic",
    iconUrl: browser.runtime.getURL("/icon/128.png"),
    title: "Study timer paused",
    message: `${host ? `You're on ${host}. ` : ""}Open a study tab and it picks up again.`,
    priority: 0,
  });
}

async function autoResume(auto: AutoPaused) {
  const stored = await post("/api/ext/focus/resume", { focusId: auto.focusId });
  if (stored === null) return;
  await store.setAutoPaused(null);
  // 0: stopped (or resumed) on the web meanwhile.
  if (stored === 1) await labStart(auto.focusId, auto.startedAt);
}

async function labStart(focusId: string, startedAt: number): Promise<LabLive> {
  // Started or resumed from the web: any auto-pause is over.
  await store.setAutoPaused(null);
  const existing = await store.lab();
  if (existing?.focusId === focusId) return labStep();
  // Count from now: time before the extension heard about the session is unknown.
  const seen = await activeTab();
  const lab = { ...newLab(focusId, startedAt, seen.cat), lastAt: Date.now() };
  await store.setLab(lab);
  return live(seen);
}

async function labStop(report: boolean): Promise<LabTotals> {
  const final = await labStep();
  const s = await store.lab();
  await store.setLab(null);
  await browser.alarms.clear(AWAY_ALARM);
  if (report && s) {
    await post("/api/ext/focus", {
      focusId: s.focusId,
      focusMs: final.focusMs,
      awayMs: final.awayMs,
      switches: final.switches,
    });
  }
  return {
    focusMs: final.focusMs,
    awayMs: final.awayMs,
    switches: final.switches,
    tracking: false,
  };
}

export async function labStatusForPopup(): Promise<
  Pick<Status, "lab" | "autoPaused" | "autoPauseOn">
> {
  const s = await store.lab();
  const auto = await store.autoPaused();
  const autoPauseOn = await store.autoPauseOn();
  const lab = s ? { ...(await labStep()), focusId: s.focusId, startedAt: s.startedAt } : null;
  return {
    lab: lab && {
      focusMs: lab.focusMs,
      awayMs: lab.awayMs,
      switches: lab.switches,
      tracking: lab.tracking,
      focusId: lab.focusId,
      startedAt: lab.startedAt,
    },
    autoPaused: auto ? { host: auto.host, at: auto.at } : null,
    autoPauseOn,
  };
}

// ---------------------------------------------------------------- reminders

function localParts(tz: string, now: number) {
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(now);
  const hour = Number(
    new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone: tz }).format(
      now,
    ),
  );
  return { date, hour };
}

async function notify(
  id: string,
  title: string,
  message: string,
  url: string,
  seen: Record<string, Notified>,
) {
  if (seen[id]) return;
  seen[id] = { at: Date.now(), url };
  await browser.notifications.create(id, {
    type: "basic",
    iconUrl: browser.runtime.getURL("/icon/128.png"),
    title,
    message,
    priority: 1,
  });
}

/** Polls today's numbers and shows at most one reminder a day, contest alerts and nudges. */
export async function checkToday(api: Api) {
  let res: Response | null;
  try {
    res = await api("/api/ext/today");
  } catch {
    return;
  }
  if (!res?.ok) return;
  const t = (await res.json()) as ExtTodayResponse;
  const now = Date.now();
  const seen = await store.notified();
  for (const [k, v] of Object.entries(seen)) if (now - v.at > NOTIFIED_KEEP_MS) delete seen[k];

  const { date, hour } = localParts(t.timezone, now);
  if (t.remindersOn && hour === t.reminderHour && (t.due > 0 || t.planLeft > 0)) {
    const parts = [
      t.due > 0 ? `${t.due} revision${t.due === 1 ? "" : "s"} due` : null,
      t.planLeft > 0 ? `${t.planLeft} of ${t.planTotal} left on today's plan` : null,
    ].filter(Boolean);
    await notify(
      `reminder:${date}`,
      "Your usual solving hour",
      `${parts.join(" · ")}. Twenty minutes keeps the streak going.`,
      new URL("/dashboard/today", t.dashboardUrl).toString(),
      seen,
    );
  }

  if (t.contestReminders) {
    for (const c of t.contests) {
      const left = c.startsAt - now;
      if (left <= 0 || left > CONTEST_LEAD_MS) continue;
      await notify(
        `contest:${c.id}`,
        `${c.name} starts in ${Math.max(1, Math.round(left / 60_000))} min`,
        "Register and warm up with one easy problem.",
        c.url,
        seen,
      );
    }
  }

  for (const n of t.nudges) {
    await notify(
      `nudge:${n.id}`,
      `${n.from} nudged you`,
      `From ${n.group}: one problem today keeps the group going.`,
      t.dashboardUrl,
      seen,
    );
  }
  await store.setNotified(seen);

  // Keep Lab tracking in step with the web: started elsewhere, or stopped elsewhere.
  // (t.focus is null while the session is paused, auto-paused included.)
  const lab = await store.lab();
  if (t.focus && lab?.focusId !== t.focus.id) await labStart(t.focus.id, t.focus.startedAt);
  if (!t.focus && lab) await store.setLab(null);
}

async function onNotificationClick(id: string) {
  const seen = await store.notified();
  const url = seen[id]?.url ?? `${WEB_URL}/dashboard`;
  await browser.tabs.create({ url });
  await browser.notifications.clear(id);
}

// ---------------------------------------------------------------- save for later

async function youtubeSeconds(tabId: number | undefined, url: string): Promise<number | null> {
  if (tabId === undefined || !/^https:\/\/(www\.|m\.)?youtube\.com\/watch/.test(url)) return null;
  try {
    const req: YoutubeTimeRequest = { type: "yt:time" };
    const t = (await browser.tabs.sendMessage(tabId, req)) as number | null;
    return typeof t === "number" && t >= 0 ? Math.floor(t) : null;
  } catch {
    return null; // Content script not there (tab opened before install).
  }
}

async function save(api: Api, url: string, title: string, atSeconds: number | null) {
  try {
    const res = await api("/api/ext/save", {
      method: "POST",
      body: JSON.stringify({ url, title, atSeconds }),
    });
    return Boolean(res?.ok);
  } catch {
    return false;
  }
}

async function flashBadge(ok: boolean) {
  await browser.action.setBadgeBackgroundColor({ color: ok ? "#d7ff3a" : "#ff6b6b" });
  await browser.action.setBadgeText({ text: ok ? "✓" : "!" });
  setTimeout(() => void browser.action.setBadgeText({ text: "" }), 2500);
}

async function saveActiveTab(api: Api): Promise<{ ok: boolean; error?: string }> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url || !/^https?:/.test(tab.url)) return { ok: false, error: "Can't save this page" };
  const ok = await save(api, tab.url, tab.title ?? "", await youtubeSeconds(tab.id, tab.url));
  return ok ? { ok } : { ok, error: "Couldn't reach DsaKaro" };
}

// ---------------------------------------------------------------- problem context

const contextCache = new Map<string, { at: number; value: ExtProblemContext | null }>();

async function problemContext(api: Api, platform: string, slug: string) {
  const key = `${platform}:${slug}`;
  const hit = contextCache.get(key);
  if (hit && Date.now() - hit.at < 10 * 60_000) return hit.value;
  try {
    const res = await api(
      `/api/ext/problem?platform=${encodeURIComponent(platform)}&slug=${encodeURIComponent(slug)}`,
    );
    const value = res?.ok ? ((await res.json()) as ExtProblemContext) : null;
    contextCache.set(key, { at: Date.now(), value });
    return value;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- wiring

/** Handles the daily-loop messages; returns undefined for messages it doesn't own. */
export function handleDaily(api: Api, msg: Message): Promise<unknown> | undefined {
  switch (msg.type) {
    case "problem:context":
      return problemContext(api, msg.platform, msg.slug);
    case "lab:start":
      return labStart(msg.focusId, msg.startedAt);
    case "lab:status":
      return labStep();
    case "lab:stop":
      return labStop(msg.report);
    case "lab:auto":
      return store.setAutoPauseOn(msg.on).then(() => {
        if (!msg.on) void browser.alarms.clear(AWAY_ALARM);
        return labStep();
      });
    case "save:tab":
      return saveActiveTab(api);
    default:
      return undefined;
  }
}

export function setupDaily(apiFn: Api) {
  api = apiFn;
  const step = () => void labStep();
  browser.tabs.onActivated.addListener(step);
  browser.tabs.onUpdated.addListener((_id, change, tab) => {
    if (tab.active && (change.url || change.title)) step();
  });
  browser.windows.onFocusChanged.addListener(step);

  browser.alarms.create("lab", { periodInMinutes: 1 });
  browser.alarms.create("today", { delayInMinutes: 1, periodInMinutes: 15 });
  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "lab" || alarm.name === AWAY_ALARM) step();
    if (alarm.name === "today") void checkToday(apiFn);
  });

  browser.notifications.onClicked.addListener((id) => void onNotificationClick(id));

  browser.runtime.onInstalled.addListener(() => {
    browser.contextMenus.removeAll(() => {
      browser.contextMenus.create({
        id: "upsolve-save",
        title: "Save to DsaKaro for later",
        contexts: ["page", "link", "video"],
      });
    });
  });
  browser.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId !== "upsolve-save") return;
    void (async () => {
      const url = info.linkUrl ?? tab?.url ?? "";
      if (!/^https?:/.test(url)) return flashBadge(false);
      const title = info.linkUrl ? (info.selectionText ?? info.linkUrl) : (tab?.title ?? "");
      const at = info.linkUrl ? null : await youtubeSeconds(tab?.id, url);
      await flashBadge(await save(apiFn, url, title, at));
    })();
  });
}
