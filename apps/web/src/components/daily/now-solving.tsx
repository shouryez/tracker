"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, Timer } from "lucide-react";
import { DifficultyTag, LiveDot, cn } from "@upsolve/ui";
import type { LiveSession } from "@/lib/sessions-data";

const POLL_MS = 15_000;
/**
 * The extension reports every pause and resume at once, and every 30 s while you solve.
 * Its clock runs on here only while the last report says active and is this recent;
 * otherwise it shows exactly the time the extension measured.
 */
const FRESH_MS = 75_000;

const PLATFORM: Record<string, string> = {
  leetcode: "LeetCode",
  geeksforgeeks: "GeeksforGeeks",
  codeforces: "Codeforces",
};

function clock(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/**
 * "Now solving": the problem the extension is timing right now, with a live clock.
 * Between the extension's reports the clock runs on locally; it stops when they do.
 */
export function NowSolving({ className }: { className?: string }) {
  const [live, setLive] = useState<{ session: LiveSession | null; offset: number } | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let stopped = false;
    async function load() {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/api/live", { cache: "no-store" });
        if (!res.ok) return;
        const body = (await res.json()) as { session: LiveSession | null; serverNow: number };
        if (!stopped) setLive({ session: body.session, offset: body.serverNow - Date.now() });
      } catch {
        // Offline for a moment: keep showing the last state.
      }
    }
    void load();
    const poll = setInterval(load, POLL_MS);
    const onVisible = () => void load();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const session = live?.session ?? null;
  useEffect(() => {
    if (!session) return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [session]);

  if (!session) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-lg border border-line bg-surface-inset px-4 py-3.5",
          className,
        )}
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-full border border-line-2 text-ink-3">
          <Timer size={16} aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="block text-13 font-[600]">
            {live ? "Not solving right now" : "Checking your timer…"}
          </span>
          <span className="block text-12 text-ink-3">
            Open a problem on LeetCode or GFG and the timer starts itself.
          </span>
        </span>
      </div>
    );
  }

  const serverNow = now + (live?.offset ?? 0);
  const sinceReport = Math.max(0, serverNow - session.reportedAt);
  // Older extension builds don't send a status: fall back to how recent the report is.
  const running =
    (session.status === "active" || session.status === null) && sinceReport < FRESH_MS;
  const elapsed = session.activeMs + (running ? sinceReport : 0);

  return (
    <div
      className={cn(
        "surface-card relative isolate flex flex-col gap-2 overflow-hidden rounded-lg px-4 py-3.5",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(70%_120%_at_100%_0%,color-mix(in_srgb,var(--signal)_12%,transparent),transparent_70%)]"
      />
      <span className="flex items-center gap-2 font-mono text-[10.5px] tracking-[.08em] text-ink-3 uppercase">
        {running ? <LiveDot /> : <span className="size-2 rounded-full bg-ink-4" />}
        {running ? "Now solving" : "Paused"} · {PLATFORM[session.platform] ?? session.platform}
      </span>
      <span className="flex items-center gap-2">
        <a
          href={session.url}
          target="_blank"
          rel="noreferrer"
          className="min-w-0 truncate text-14 font-[600] hover:underline"
        >
          {session.title}
        </a>
        <ArrowUpRight size={13} aria-hidden="true" className="shrink-0 text-ink-3" />
        {session.difficulty && <DifficultyTag difficulty={session.difficulty} />}
      </span>
      <span
        className={cn(
          "num font-mono text-[40px] leading-none tracking-[-0.05em]",
          !running && "text-ink-3",
        )}
        role="timer"
        aria-label={`${Math.round(elapsed / 60_000)} minutes focused on ${session.title}`}
        suppressHydrationWarning
      >
        {clock(elapsed)}
      </span>
      <span className="font-mono text-[11px] text-ink-3">
        {running
          ? `${session.submits} ${session.submits === 1 ? "submit" : "submits"} · pauses when you switch tabs`
          : "Resumes when you're back on the problem"}
      </span>
    </div>
  );
}

// DsaKaro
