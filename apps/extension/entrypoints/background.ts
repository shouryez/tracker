import { browser } from "wxt/browser";
import { defineBackground } from "wxt/utils/define-background";
import type {
  ExtCodeRequest,
  ExtHistoryItem,
  ExtMeResponse,
  ExtSession,
  ExtSheetStateResponse,
} from "@upsolve/contracts";
import { handleDaily, labStatusForPopup, setupDaily } from "../lib/daily.ts";
import type { Message, PutResult, Status } from "../lib/messages.ts";
import { SESSION_EXPIRES_MS, toWire, worthUploading } from "../lib/session.ts";
import { WEB_URL, store } from "../lib/storage.ts";

const BATCH = 50;

async function api(path: string, init: RequestInit = {}): Promise<Response | null> {
  const token = await store.token();
  if (!token) return null;
  return fetch(`${WEB_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...init.headers,
    },
  });
}

async function handleAuthFailure(res: Response) {
  if (res.status === 401) {
    await store.setAuthError("Disconnected. Open DsaKaro and connect again.");
    return true;
  }
  return false;
}

const postSessions = (sessions: ExtSession[]) =>
  api("/api/ext/sessions", { method: "POST", body: JSON.stringify({ sessions }) });

/** The server refused the request itself (invalid or too large): retrying won't help. */
const refused = (res: Response) => res.status === 413 || res.status === 422;

/** One upload of queued sessions. Returns false when the server can't be reached. */
async function flushOnce(): Promise<boolean> {
  try {
    const outbox = await store.outbox();
    const sessions = Object.values(outbox).slice(0, BATCH);
    if (sessions.length === 0) return true;
    const res = await postSessions(sessions);
    if (!res || (await handleAuthFailure(res))) return false;
    let done = sessions;
    if (refused(res)) {
      // One bad record must not block the queue forever: send them one by one and drop only
      // the ones the server refuses on their own.
      done = [];
      for (const s of sessions) {
        const one = await postSessions([s]);
        if (!one || (await handleAuthFailure(one))) return false;
        if (one.ok || refused(one)) done.push(s);
        else return false;
      }
    } else if (!res.ok) return false;
    await store.setAuthError(null);
    // Entries that changed while uploading stay queued for the next pass.
    const latest = await store.outbox();
    for (const s of done) {
      if (JSON.stringify(latest[s.clientId]) === JSON.stringify(s)) delete latest[s.clientId];
    }
    await store.setOutbox(latest);
    return true;
  } catch {
    return false; // Offline or server down: everything stays queued.
  }
}

let flushing: Promise<void> | null = null;
let flushAgain = false;
/** Uploads queued sessions. A request during an upload triggers one more pass right after. */
function flush(): Promise<void> {
  if (flushing) {
    flushAgain = true;
    return flushing;
  }
  flushing = (async () => {
    do {
      flushAgain = false;
      if (!(await flushOnce())) break;
    } while (flushAgain);
  })().finally(() => (flushing = null));
  return flushing;
}

async function queue(session: ExtSession) {
  const outbox = await store.outbox();
  outbox[session.clientId] = session;
  await store.setOutbox(outbox);
}

/** Closes sessions nobody touched for 30 minutes, so they upload with a final outcome. */
async function sweep() {
  const now = Date.now();
  for (const s of await store.allSessions()) {
    if (now - s.updatedAt < SESSION_EXPIRES_MS) continue;
    if (s.outcome === "open") {
      const closed = { ...s, outcome: "abandoned" as const, endedAt: s.endedAt ?? s.updatedAt };
      if (worthUploading(closed)) await queue(toWire(closed));
    }
    await store.removeSession(s);
  }
  await flush();
}

async function putHistory(items: ExtHistoryItem[]): Promise<PutResult> {
  try {
    const res = await api("/api/ext/history", { method: "POST", body: JSON.stringify({ items }) });
    if (!res) return { ok: false, error: "Not connected", auth: true };
    if (await handleAuthFailure(res)) return { ok: false, error: "Not connected", auth: true };
    const body = (await res.json()) as PutResult;
    return res.ok
      ? body
      : { ok: false, error: "error" in body ? body.error : `HTTP ${res.status}` };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

/** Mirrors takeUforward sheet ticks onto the same sheet in DsaKaro. */
async function syncTuf(sheet: string, solved: string[], removed: string[], changed: string[]) {
  try {
    const res = await api("/api/ext/sheet-sync", {
      method: "POST",
      body: JSON.stringify({
        source: "takeuforward",
        sheet,
        solved: solved.slice(0, 1000),
        removed: removed.slice(0, 50),
        changed: changed.slice(0, 50),
      }),
    });
    if (!res) return { ok: false, error: "Not connected" };
    if (await handleAuthFailure(res)) return { ok: false, error: "Not connected" };
    return { ok: res.ok };
  } catch {
    return { ok: false, error: "Offline" };
  }
}

/** DsaKaro's side of the user's takeUforward sheets; null when offline or not connected. */
async function tufState(): Promise<ExtSheetStateResponse | null> {
  try {
    const res = await api("/api/ext/sheet-state");
    if (!res || (await handleAuthFailure(res)) || !res.ok) return null;
    return (await res.json()) as ExtSheetStateResponse;
  } catch {
    return null;
  }
}

async function tufAck(sheet: string, slugs: string[], before: number) {
  try {
    const res = await api("/api/ext/sheet-state", {
      method: "POST",
      body: JSON.stringify({ acks: [{ sheet, slugs: slugs.slice(0, 1000), before }] }),
    });
    return { ok: Boolean(res?.ok) };
  } catch {
    return { ok: false };
  }
}

/** Asks an open takeuforward.org tab to apply ticks made in DsaKaro (it has the TUF login). */
async function nudgeTufTab() {
  if (!(await store.token())) return;
  const [tab] = await browser.tabs.query({ url: "https://takeuforward.org/*" });
  if (tab?.id === undefined) return;
  browser.tabs.sendMessage(tab.id, { type: "tuf:reconcile" }).catch(() => {
    // Tab opened before the extension was installed or updated: nothing to nudge.
  });
}

async function status(): Promise<Status> {
  const [token, authError, outbox, history, current, lab] = await Promise.all([
    store.token(),
    store.authError(),
    store.outbox(),
    store.history(),
    store.current(),
    labStatusForPopup(),
  ]);
  let me: ExtMeResponse | null = null;
  if (token) {
    try {
      const res = await api("/api/ext/me");
      if (res?.ok) {
        me = (await res.json()) as ExtMeResponse;
        await store.setAuthError(null);
      } else if (res) await handleAuthFailure(res);
    } catch {
      // Offline: popup shows cached local state only.
    }
  }
  return {
    connected: Boolean(token),
    authError: (await store.authError()) ?? authError ?? null,
    me,
    pending: Object.keys(outbox).length,
    history: history ?? null,
    current: current ?? null,
    ...lab,
  };
}

/** One submission's code (WA autopsy). Best effort: one retry, never queued. */
async function putCode(body: ExtCodeRequest): Promise<PutResult> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await api("/api/ext/code", { method: "POST", body: JSON.stringify(body) });
      if (!res) return { ok: false, error: "Not connected" };
      if (await handleAuthFailure(res)) return { ok: false, error: "Disconnected", auth: true };
      if (res.ok || refused(res)) return { ok: res.ok, stored: 1 } as PutResult;
    } catch {
      // Offline: try once more below.
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  return { ok: false, error: "Couldn't upload code" };
}

async function handle(msg: Message): Promise<unknown> {
  switch (msg.type) {
    case "session:put":
      await queue(msg.session);
      if (msg.flush) await flush();
      return { ok: true };
    case "history:put":
      return putHistory(msg.items);
    case "code:put":
      return putCode(msg.body);
    case "auth:set":
      await store.setToken(msg.token);
      await store.setAuthError(null);
      await flush();
      return { ok: true };
    case "auth:clear":
      await store.setToken(null);
      return { ok: true };
    case "status":
      return status();
    case "flush":
      await flush();
      return { ok: true };
    case "tuf:sync":
      return syncTuf(msg.sheet, msg.solved, msg.removed, msg.changed);
    case "tuf:state":
      return tufState();
    case "tuf:ack":
      return tufAck(msg.sheet, msg.slugs, msg.before);
    default:
      return handleDaily(api, msg);
  }
}

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((msg: Message, _sender, sendResponse) => {
    handle(msg).then(sendResponse, (err: Error) => sendResponse({ ok: false, error: err.message }));
    return true; // async response
  });

  browser.alarms.create("flush", { periodInMinutes: 1 });
  browser.alarms.create("sweep", { periodInMinutes: 5 });
  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "flush") {
      void flush();
      void nudgeTufTab();
    }
    if (alarm.name === "sweep") void sweep();
  });

  setupDaily(api);
});
