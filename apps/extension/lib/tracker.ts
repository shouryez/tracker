// Site-independent session tracking: timer, on-page pill, the after-Accepted
// prompt, persistence and upload. Each site's content script supplies how to
// read the current problem and feeds submissions in via recordSubmission().
import { browser } from "wxt/browser";
import type { ExtProblemContext, ExtSubmission } from "@upsolve/contracts";
import type { ContentScriptContext } from "wxt/utils/content-script-context";
import type { Message } from "./messages.ts";
import {
  addSubmission,
  canResume,
  isReviewUrl,
  newSession,
  toWire,
  worthUploading,
  type LocalSession,
  type SessionPlatform,
} from "./session.ts";
import { store } from "./storage.ts";
import { onInput, resume, setManualPause, solve, tick } from "./timer.ts";
import { TimerUi } from "./ui.ts";

const PERSIST_EVERY_TICKS = 15;
/** While you solve, report every 30 s so the dashboard's "Now solving" clock stays live. */
const UPLOAD_EVERY_TICKS = 30;
/** Active time before the panel offers hints instead of the editorial. */
const STUCK_MS = 25 * 60_000;

const VERDICT_TEXT: Record<string, string> = {
  WA: "Wrong answer",
  TLE: "Time limit exceeded",
  MLE: "Memory limit exceeded",
  RE: "Runtime error",
};

export type Site = {
  platform: SessionPlatform;
  /** Problem slug for a URL path, or null when not on a problem page. */
  slugFromPath(pathname: string): string | null;
  titleFromDocument(title: string): string | null;
  /** Called once a second while on a problem page (e.g. to look for verdicts). */
  onTick?(session: LocalSession): void;
};

export type Tracker = {
  /** Adds a judged submission to the current session; Accepted solves it and asks how. */
  recordSubmission(sub: ExtSubmission): Promise<void>;
  current(): LocalSession | null;
};

/**
 * Bot-check and error pages (Cloudflare's "Just a moment...") briefly sit at the problem's URL
 * with their own title; never take that as the problem's name.
 */
const INTERSTITIAL =
  /^(just a moment|attention required|access denied|please wait|checking your browser)/i;

export async function startTracker(ctx: ContentScriptContext, site: Site): Promise<Tracker> {
  const docTitle = () => {
    const t = site.titleFromDocument(document.title);
    return t && !INTERSTITIAL.test(t) ? t : null;
  };
  let slug: string | null = null;
  let session: LocalSession | null = null;
  let lastInputAt = Date.now();
  let ticks = 0;
  /** The first report of a session goes out as soon as it's worth uploading. */
  let reported = false;
  /** Timer status at the last report: a pause or resume is reported straight away. */
  let reportedStatus: string | null = null;
  let connected = Boolean(await store.token());
  let hintsOffered = false;
  let checklistShown = false;
  const ui = new TimerUi(togglePause);
  // Read the review flag before the site's router can rewrite the URL.
  const reviewSlug = isReviewUrl(window.location.href)
    ? site.slugFromPath(window.location.pathname)
    : null;

  const send = (s: LocalSession, flush: boolean) => {
    if (!worthUploading(s)) return;
    const msg: Message = { type: "session:put", session: toWire(s), flush };
    browser.runtime.sendMessage(msg).catch(() => {
      // Worker asleep or extension reloading: the session is in storage and the sweep will send it.
    });
  };

  /**
   * Leaving the problem (another page, tab closed): report it as paused, so the dashboard's
   * live clock stops now instead of running on until the report goes stale.
   */
  const away = (s: LocalSession): LocalSession =>
    s.timer.status === "active" || s.timer.status === "armed"
      ? { ...s, timer: { ...s.timer, status: "paused" } }
      : s;

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
      review: session.mode === "review",
    });
  }

  async function enter(next: string) {
    await leave();
    slug = next;
    reported = false;
    reportedStatus = null;
    const now = Date.now();
    const existing = await store.session(site.platform, next);
    session =
      existing && canResume(existing, now)
        ? { ...existing, timer: resume(existing.timer, now) }
        : newSession(site.platform, next, docTitle(), now, crypto.randomUUID());
    // The revision queue links here with ?upsolve=review; the problem page may drop it later.
    if (isReviewUrl(window.location.href) || next === reviewSlug) session.mode = "review";
    ui.mount();
    ui.setHidden(false);
    hintsOffered = session.outcome === "solved";
    checklistShown = false;
    render();
    await persist();
    void loadContext(next);
  }

  /** Memory, hints and checklist for the panel (needs a connection; silent otherwise). */
  async function loadContext(forSlug: string) {
    if (!connected) return;
    const msg: Message = { type: "problem:context", platform: site.platform, slug: forSlug };
    try {
      const ctx = (await browser.runtime.sendMessage(msg)) as ExtProblemContext | null;
      if (slug === forSlug && ctx && "hints" in ctx) ui.setContext(ctx);
    } catch {
      // Worker asleep: the panel just shows the timer.
    }
  }

  async function leave() {
    if (!session) return;
    const s = session;
    session = null;
    slug = null;
    ui.unmount();
    await store.setSession({ ...s, updatedAt: Date.now() });
    await store.setCurrent(null);
    send(away(s), true);
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

  async function recordSubmission(sub: ExtSubmission) {
    if (!session || session.submissions.some((x) => x.id === sub.id)) return;
    const now = Date.now();
    if (session.timer.status === "armed") session.timer = onInput(session.timer, now);
    session = addSubmission(session, sub);

    if (sub.verdict !== "AC" && session.outcome !== "solved" && !checklistShown) {
      checklistShown = true;
      ui.showChecklist(VERDICT_TEXT[sub.verdict] ?? "Not accepted");
    }
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
    if (
      !answer.independence &&
      answer.mistakeTags.length === 0 &&
      !answer.note &&
      !answer.pattern &&
      !answer.takeaway
    )
      return;
    // The user may have moved on; update whichever copy is current.
    const target = session?.clientId === solved.clientId ? session : solved;
    target.independence = answer.independence;
    target.mistakeTags = answer.mistakeTags;
    target.note = answer.note;
    target.pattern = answer.pattern;
    target.takeaway = answer.takeaway;
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

  ctx.addEventListener(window, "pagehide", () => {
    if (session) {
      void store.setSession({ ...session, updatedAt: Date.now() });
      send(away(session), true);
    }
  });

  browser.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !("token" in changes)) return;
    connected = Boolean(changes.token?.newValue);
    render();
    if (connected && slug) void loadContext(slug);
  });

  // Both sites are single-page apps: watch the URL, and tick the timer once a second.
  ctx.setInterval(() => {
    const current = site.slugFromPath(window.location.pathname);
    if (current !== slug) {
      void (current ? enter(current) : leave());
      return;
    }
    if (!session) return;
    site.onTick?.(session);
    session.timer = tick(session.timer, Date.now(), {
      visible: document.visibilityState === "visible",
      focused: document.hasFocus(),
      lastInputAt,
    });
    if (!session.title || INTERSTITIAL.test(session.title)) session.title = docTitle();
    if (!hintsOffered && session.timer.status === "active" && session.timer.activeMs >= STUCK_MS) {
      hintsOffered = true;
      ui.offerHints();
    }
    render();
    ticks++;
    if (ticks % PERSIST_EVERY_TICKS === 0) void persist();
    const status = session.timer.status;
    const changed = reported && status !== reportedStatus;
    if (changed || (status === "active" && (!reported || ticks % UPLOAD_EVERY_TICKS === 0))) {
      // Sent straight away rather than on the next one-minute flush, so the website's live
      // clock stops the moment you switch away and starts when you're back.
      if (worthUploading(session)) {
        reported = true;
        reportedStatus = status;
      }
      send(session, true);
    }
  }, 1000);

  ctx.onInvalidated(() => ui.unmount());

  return { recordSubmission, current: () => session };
}
