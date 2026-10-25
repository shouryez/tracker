import { browser } from "wxt/browser";
import { defineContentScript } from "wxt/utils/define-content-script";
import { maybeImportHistory } from "../lib/history-import.ts";
import {
  problemSlug,
  submissionFromCheck,
  titleFromDocument,
  type CheckResponse,
} from "../lib/leetcode.ts";
import { HOOK_SOURCE, type Message } from "../lib/messages.ts";
import {
  addSubmission,
  canResume,
  newSession,
  toWire,
  worthUploading,
  type LocalSession,
} from "../lib/session.ts";
import { store } from "../lib/storage.ts";
import { onInput, resume, setManualPause, solve, tick } from "../lib/timer.ts";
import { TimerUi } from "../lib/ui.ts";

const PERSIST_EVERY_TICKS = 15;
const UPLOAD_EVERY_TICKS = 60;

export default defineContentScript({
  matches: ["https://leetcode.com/*"],
  runAt: "document_idle",
  async main(ctx) {
    let slug: string | null = null;
    let session: LocalSession | null = null;
    let lastInputAt = Date.now();
    let ticks = 0;
    let connected = Boolean(await store.token());
    const ui = new TimerUi(togglePause);

    const send = (s: LocalSession, flush: boolean) => {
      if (!worthUploading(s)) return;
      const msg: Message = { type: "session:put", session: toWire(s), flush };
      browser.runtime.sendMessage(msg).catch(() => {
        // Worker asleep or extension reloading: the session is in storage and the sweep will send it.
      });
    };

    async function persist() {
      if (!session) return;
      session.updatedAt = Date.now();
      await store.setSession(session);
      await store.setCurrent({
        slug: session.titleSlug,
        title: session.title,
        status: session.timer.status,
        activeMs: session.timer.activeMs,
        submits: session.submissions.length,
        updatedAt: session.updatedAt,
      });
    }

    function render() {
      if (!session) return;
      ui.render({
        status: session.timer.status,
        activeMs: session.timer.activeMs,
        idleMs: session.timer.idleMs,
        submits: session.submissions.length,
        title: session.title,
        connected,
      });
    }

    async function enter(next: string) {
      await leave();
      slug = next;
      const now = Date.now();
      const existing = await store.session(next);
      session =
        existing && canResume(existing, now)
          ? { ...existing, timer: resume(existing.timer, now) }
          : newSession(next, titleFromDocument(document.title), now, crypto.randomUUID());
      ui.mount();
      ui.setHidden(false);
      render();
      await persist();
    }

    async function leave() {
      if (!session) return;
      const s = session;
      session = null;
      slug = null;
      ui.unmount();
      await store.setSession({ ...s, updatedAt: Date.now() });
      await store.setCurrent(null);
      send(s, false);
    }

    function togglePause() {
      if (!session) return;
      const wantPause = session.timer.status !== "paused";
      session.timer = setManualPause(session.timer, wantPause, Date.now());
      render();
      void persist();
    }

    function onActivity() {
      lastInputAt = Date.now();
      if (session?.timer.status === "armed") {
        session.timer = onInput(session.timer, lastInputAt);
        render();
      }
    }

    async function onCheck(id: string, data: CheckResponse) {
      if (!session) return;
      const now = Date.now();
      const sub = submissionFromCheck(id, data, now);
      if (!sub || session.submissions.some((x) => x.id === sub.id)) return;
      if (session.timer.status === "armed") session.timer = onInput(session.timer, now);
      session = addSubmission(session, sub);

      if (sub.verdict !== "AC" || session.outcome === "solved") {
        render();
        await persist();
        send(session, true);
        return;
      }

      session.timer = solve(session.timer, now);
      session.outcome = "solved";
      session.endedAt = now;
      render();
      await persist();
      send(session, true);

      const solved = session;
      const answer = await ui.askHowSolved({
        elapsedMs: solved.timer.activeMs,
        hadFailures: solved.submissions.some((s) => s.verdict !== "AC"),
      });
      if (!answer.independence && answer.mistakeTags.length === 0 && !answer.note) return;
      // The user may have moved on; update whichever copy is current.
      const target = session?.clientId === solved.clientId ? session : solved;
      target.independence = answer.independence;
      target.mistakeTags = answer.mistakeTags;
      target.note = answer.note;
      if (target === session) await persist();
      else await store.setSession({ ...target, updatedAt: Date.now() });
      send(target, true);
    }

    // Activity signals for idle detection.
    for (const type of ["keydown", "mousedown", "wheel", "touchstart"] as const) {
      ctx.addEventListener(window, type, onActivity, { capture: true, passive: true });
    }
    let lastMove = 0;
    ctx.addEventListener(
      window,
      "mousemove",
      () => {
        const now = Date.now();
        if (now - lastMove > 1000) {
          lastMove = now;
          onActivity();
        }
      },
      { passive: true },
    );

    // Verdicts from the MAIN-world hook.
    ctx.addEventListener(window, "message", (e: MessageEvent) => {
      if (e.source !== window || e.origin !== window.location.origin) return;
      const d = e.data as { source?: string; type?: string; id?: unknown; data?: unknown } | null;
      if (d?.source !== HOOK_SOURCE || d.type !== "check" || typeof d.id !== "string") return;
      void onCheck(d.id, (d.data ?? {}) as CheckResponse);
    });

    ctx.addEventListener(window, "pagehide", () => {
      if (session) {
        void store.setSession({ ...session, updatedAt: Date.now() });
        send(session, false);
      }
    });

    browser.storage.onChanged.addListener((changes, area) => {
      if (area !== "local" || !("token" in changes)) return;
      connected = Boolean(changes.token?.newValue);
      render();
      if (connected) void maybeImportHistory();
    });

    // LeetCode is a single-page app: watch the URL, and tick the timer once a second.
    ctx.setInterval(() => {
      const current = problemSlug(window.location.pathname);
      if (current !== slug) {
        void (current ? enter(current) : leave());
        return;
      }
      if (!session) return;
      session.timer = tick(session.timer, Date.now(), {
        visible: document.visibilityState === "visible",
        focused: document.hasFocus(),
        lastInputAt,
      });
      session.title ??= titleFromDocument(document.title);
      render();
      ticks++;
      if (ticks % PERSIST_EVERY_TICKS === 0) void persist();
      if (ticks % UPLOAD_EVERY_TICKS === 0 && session.timer.status === "active")
        send(session, false);
    }, 1000);

    ctx.onInvalidated(() => ui.unmount());
    ctx.setTimeout(() => void maybeImportHistory(), 5000);
  },
});
