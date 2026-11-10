"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Expand, Maximize2, Minimize2, Pause, Play, Square, Timer } from "lucide-react";
import { toast } from "sonner";
import { Card, CardHeader, CardSub, CardTitle, cn } from "@upsolve/ui";
import { startFocus } from "@/app/actions/daily";
import { maybeAutoPopout } from "@/components/daily/focus-live";
import { enterFullscreen } from "@/components/daily/focus-screen";
import {
  StudySummaryModal,
  endStudy,
  pauseStudy,
  resumeStudy,
  saveStudy,
  type StudyEnd,
} from "@/components/daily/study-bar";
import { StudyBuddy } from "@/components/study-buddy";
import { buddyLevel, LEVEL_LABEL } from "@/lib/buddies";
import type { ActiveFocus, HallMember } from "@/lib/daily-data";
import { labStart } from "@/lib/ext-bridge";
import { focusClock, focusElapsed } from "@/lib/focus";

export const hm = (ms: number) => {
  const m = Math.floor(ms / 60_000);
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;
};

/** Running session time and today's total for one member at `now`. Pure. */
export function hallTimes(m: HallMember, now: number) {
  if (!m.live) return { session: 0, today: m.doneMs, state: "idle" as const };
  const { startedAt, pausedAt, pausedMs } = m.live;
  const session = Math.max(0, (pausedAt ?? now) - startedAt - pausedMs);
  // A session that began before this member's day reset only counts from the reset.
  const today = m.doneMs + Math.max(0, session - Math.max(0, m.dayStart - startedAt));
  return { session, today, state: pausedAt ? ("paused" as const) : ("studying" as const) };
}

/**
 * Everyone's study buddy, live: timers tick every second here between server refreshes
 * (AutoRefresh), so a running session counts up in real time for the whole group. Today's
 * total uses each member's own day reset.
 */
export function StudyHall({
  members,
  viewerId,
  serverNow,
  room = false,
}: {
  members: HallMember[];
  viewerId: string;
  serverNow: number;
  /** The full-screen study room: bigger tiles on a dark room. */
  room?: boolean;
}) {
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    // Device clocks drift; tick on the server's clock (re-synced on every refresh).
    const skew = serverNow - Date.now();
    const tick = () => setNow(Date.now() + skew);
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [serverNow]);

  const rows = members
    .map((m) => ({ m, ...hallTimes(m, now) }))
    .sort(
      (a, b) =>
        Number(b.state === "studying") - Number(a.state === "studying") ||
        Number(b.state === "paused") - Number(a.state === "paused") ||
        b.today - a.today,
    );

  if (rows.every((r) => r.state === "idle" && r.today === 0))
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <div className="flex -space-x-3">
          {members.slice(0, room ? 6 : 4).map((m) => (
            <StudyBuddy key={m.userId} buddy={m.avatar} level="idle" size={room ? 96 : 52} />
          ))}
        </div>
        <p className={cn("max-w-[300px] text-13", room ? "text-white/55" : "text-ink-3")}>
          Everyone&apos;s napping. Start a study session and your buddy sits down at the desk for
          the whole group to see.
        </p>
      </div>
    );

  const studying = rows.filter((r) => r.state === "studying").length;
  const groupToday = rows.reduce((n, r) => n + r.today, 0);

  return (
    <div className={cn(room && "flex flex-col gap-6")}>
      {room && (
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-center">
          <p>
            <span className="block font-mono text-[clamp(28px,4vw,44px)] leading-none font-[600] text-white tabular-nums">
              {studying}
            </span>
            <span className="label-mono text-white/45">studying now</span>
          </p>
          <span className="h-10 w-px bg-white/10" aria-hidden="true" />
          <p suppressHydrationWarning>
            <span className="block font-mono text-[clamp(28px,4vw,44px)] leading-none font-[600] text-white tabular-nums">
              {hm(groupToday)}
            </span>
            <span className="label-mono text-white/45">group today</span>
          </p>
        </div>
      )}
      <ul
        className={cn(
          "grid gap-2.5",
          room
            ? "grid-cols-[repeat(auto-fill,minmax(min(190px,42vw),1fr))] gap-4"
            : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-[repeat(auto-fill,minmax(180px,1fr))]",
        )}
      >
        {rows.map(({ m, session, today, state }) => {
          const level = buddyLevel(state, session);
          const live = state !== "idle";
          return (
            <li
              key={m.userId}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-[16px] border px-2 pt-3 pb-2.5 text-center transition-colors",
                room && "gap-2 rounded-[22px] px-3 pt-6 pb-5 backdrop-blur-sm",
                // Each desk: a lamp switches on over whoever is studying.
                room
                  ? state === "studying"
                    ? "border-white/[.12] bg-[radial-gradient(220px_140px_at_50%_0%,rgba(243,180,92,.18),transparent_70%),rgba(255,255,255,.035)]"
                    : state === "paused"
                      ? "border-[#f3b45c]/25 bg-white/[.03]"
                      : "border-white/[.07] bg-white/[.02] opacity-60 grayscale-[.7]"
                  : state === "studying"
                    ? "border-line-2 bg-[radial-gradient(200px_120px_at_50%_0%,color-mix(in_srgb,var(--amber)_16%,transparent),transparent_70%),var(--surface-2)]"
                    : state === "paused"
                      ? "border-[color-mix(in_srgb,var(--amber)_30%,transparent)] bg-surface-2"
                      : "border-line bg-surface-2/40 opacity-70 grayscale-[.6]",
              )}
            >
              <StudyBuddy buddy={m.avatar} level={level} size={room ? 132 : 84} />
              <p
                className={cn(
                  "mt-0.5 w-full truncate font-[600]",
                  room ? "mt-2 text-15 text-white" : "text-13",
                )}
              >
                {m.name}
                {m.userId === viewerId && (
                  <span
                    className={cn(
                      "ml-1 text-11 font-normal",
                      room ? "text-white/45" : "text-ink-3",
                    )}
                  >
                    you
                  </span>
                )}
              </p>
              <p
                className={cn(
                  "font-mono leading-none font-[600] tabular-nums",
                  room ? "text-[clamp(24px,2.6vw,32px)]" : "text-[18px]",
                  state === "studying"
                    ? room
                      ? "text-white"
                      : "text-ink"
                    : state === "paused"
                      ? "text-medium"
                      : room
                        ? "text-white/25"
                        : "text-ink-4",
                )}
                suppressHydrationWarning
              >
                {live ? focusClock(session) : "--:--"}
              </p>
              {typeof level === "number" && (
                <span className="flex gap-0.5" aria-hidden="true">
                  {[1, 2, 3, 4].map((i) => (
                    <svg key={i} width="11" height="13" viewBox="0 0 24 24">
                      <path
                        d="M12 2.5c.6 3.2 4.5 5.2 4.5 10a4.5 4.5 0 1 1-9 0c0-2 .9-3.3 2-4.4.2 1.6 1 2.6 2 2.9-.4-3.2-.1-6 .5-8.5Z"
                        fill={
                          i <= level
                            ? "#f3b45c"
                            : room
                              ? "rgba(255,255,255,.12)"
                              : "var(--surface-4)"
                        }
                      />
                    </svg>
                  ))}
                </span>
              )}
              <p
                className={cn("text-11", room ? "text-white/50" : "text-ink-3")}
                suppressHydrationWarning
              >
                <span
                  className={cn(
                    state === "studying"
                      ? "text-[var(--amber)]"
                      : state === "paused" && "text-ink-3",
                  )}
                >
                  {LEVEL_LABEL[level]}
                </span>
                {" · "}
                today{" "}
                <span className={cn("tnum font-[600]", room ? "text-white/80" : "text-ink-2")}>
                  {hm(today)}
                </span>
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

type Doc = Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => void };
const fsElement = () => document.fullscreenElement ?? (document as Doc).webkitFullscreenElement;

/**
 * The group's Study hall card, with an expand button that opens it as a full-screen study
 * room: a dark, slowly glowing room with everyone's buddy big, their live timers, how many
 * are studying and the group's total today. Esc (or the button) leaves.
 */
export function StudyHallCard({
  groupName,
  members,
  viewerId,
  serverNow,
  active,
  buddy,
}: {
  groupName: string;
  members: HallMember[];
  viewerId: string;
  serverNow: number;
  /** The viewer's own running session, for the controls in the room. */
  active: ActiveFocus | null;
  buddy: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [end, setEnd] = useState<StudyEnd | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const begin = () =>
    start(async () => {
      const res = await startFocus("stopwatch", null);
      if (!res.ok) return void toast.error(res.error);
      if (res.existing) {
        toast("You already have a study session", {
          description: "Picked it up here instead of starting a second one.",
        });
        router.refresh();
        return;
      }
      await labStart(res.id, res.startedAt);
      maybeAutoPopout();
      router.refresh();
    });
  const togglePause = () =>
    start(async () => {
      if (!active) return;
      const resuming = active.pausedAt !== null;
      if ((await (resuming ? resumeStudy(active) : pauseStudy(active))) === false) return;
      if (resuming) maybeAutoPopout();
      router.refresh();
    });
  // Stop leaves the room first: the summary (save or discard) opens on the page.
  const stop = () => {
    if (!active) return;
    leaveFullscreen();
    setOpen(false);
    start(async () => setEnd(await endStudy(active)));
  };
  const studying = members.filter((m) => m.live && !m.live.pausedAt).length;

  return (
    <>
      <Card glow={studying > 0 ? "var(--signal-mark)" : undefined}>
        <CardHeader>
          <CardTitle icon={<Timer size={14} />} tint="var(--signal-mark)">
            Study hall
          </CardTitle>
          <div className="flex items-center gap-2">
            <CardSub>
              <span className="inline-flex items-center gap-1.5">
                <span className="pulse-ring size-1.5 rounded-full bg-success text-success" />
                {studying} studying · live
              </span>
            </CardSub>
            {/* Full view fills the browser window (other tabs stay one click away); full
                screen takes the whole display. */}
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Open the study hall in full view"
              title="Full view (fills this window; other tabs still work)"
              className="grid size-8 place-items-center rounded-full border border-line bg-surface-2 text-ink-2 transition-colors hover:border-line-3 hover:text-ink"
            >
              <Expand size={14} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => {
                enterFullscreen();
                setOpen(true);
              }}
              aria-label="Open the study hall full screen"
              title="Full screen study room"
              className="grid size-8 place-items-center rounded-full border border-line bg-surface-2 text-ink-2 transition-colors hover:border-line-3 hover:text-ink"
            >
              <Maximize2 size={14} aria-hidden="true" />
            </button>
          </div>
        </CardHeader>
        <StudyHall members={members} viewerId={viewerId} serverNow={serverNow} />
      </Card>
      {open && (
        <StudyRoom
          groupName={groupName}
          members={members}
          viewerId={viewerId}
          serverNow={serverNow}
          onClose={() => setOpen(false)}
          controls={
            <RoomControls
              active={active}
              buddy={buddy}
              pending={pending}
              onStart={begin}
              onTogglePause={togglePause}
              onStop={stop}
            />
          }
        />
      )}
      <StudySummaryModal
        summary={end}
        pending={pending}
        onClose={() => setEnd(null)}
        onSave={(discard) =>
          start(async () => {
            if (active && end && (await saveStudy(active, end, discard))) {
              setEnd(null);
              router.refresh();
            }
          })
        }
      />
    </>
  );
}

function leaveFullscreen() {
  if (!fsElement()) return;
  try {
    if (document.exitFullscreen) void document.exitFullscreen().catch(() => {});
    else (document as Doc).webkitExitFullscreen?.();
  } catch {}
}

/** Your own session in the room: buddy, live timer, Start / Pause / Resume / Stop. */
function RoomControls({
  active,
  buddy,
  pending,
  onStart,
  onTogglePause,
  onStop,
}: {
  active: ActiveFocus | null;
  buddy: string | null;
  pending: boolean;
  onStart: () => void;
  onTogglePause: () => void;
  onStop: () => void;
}) {
  const [now, setNow] = useState(() => active?.startedAt ?? 0);
  const paused = active?.pausedAt != null;
  useEffect(() => {
    if (!active || paused) return;
    const first = window.setTimeout(() => setNow(Date.now()), 0);
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [active, paused]);

  const btn =
    "grid place-items-center rounded-full transition-[transform,background-color] duration-200 hover:scale-105 active:scale-95 disabled:opacity-50";

  if (!active)
    return (
      <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/[.06] py-2 pr-2 pl-3 backdrop-blur-md">
        <StudyBuddy buddy={buddy} level="idle" size={40} />
        <span className="text-13 text-white/70">You&apos;re not studying</span>
        <button
          type="button"
          onClick={onStart}
          disabled={pending}
          className="flex h-10 items-center gap-2 rounded-full bg-[#f3b45c] px-4 text-13 font-[600] text-[#0b0b0f] transition-transform hover:scale-[1.03] active:scale-95 disabled:opacity-50"
        >
          <Play size={14} className="fill-current" aria-hidden="true" /> Start studying
        </button>
      </div>
    );

  const elapsed = focusElapsed(active, paused ? active.pausedAt! : now || active.startedAt);
  const level = buddyLevel(paused ? "paused" : "studying", elapsed);
  return (
    <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/[.06] py-2 pr-2 pl-3 backdrop-blur-md">
      <StudyBuddy buddy={buddy} level={level} size={40} />
      <span className="flex flex-col leading-tight">
        <span className="label-mono text-white/45">{paused ? "Paused" : LEVEL_LABEL[level]}</span>
        <span
          className={cn(
            "font-mono text-[22px] font-[600] tabular-nums",
            paused ? "text-white/55" : "text-white",
          )}
          suppressHydrationWarning
        >
          {focusClock(elapsed)}
        </span>
      </span>
      <button
        type="button"
        onClick={onTogglePause}
        disabled={pending}
        aria-label={paused ? "Resume" : "Pause"}
        className={cn(
          btn,
          "ml-1 size-11",
          paused ? "bg-white/40" : "bg-[#f3b45c]",
          "text-[#0b0b0f]",
        )}
      >
        {paused ? (
          <Play size={16} className="translate-x-px fill-current" aria-hidden="true" />
        ) : (
          <Pause size={16} className="fill-current" aria-hidden="true" />
        )}
      </button>
      <button
        type="button"
        onClick={onStop}
        disabled={pending}
        aria-label="Stop and save"
        className={cn(
          btn,
          "size-11 border border-white/10 bg-white/[.06] text-white/70 hover:bg-[#ef4444]/20 hover:text-[#ff8a8a]",
        )}
      >
        <Square size={14} className="fill-current" aria-hidden="true" />
      </button>
    </div>
  );
}

function StudyRoom({
  groupName,
  members,
  viewerId,
  serverNow,
  onClose,
  controls,
}: {
  groupName: string;
  members: HallMember[];
  viewerId: string;
  serverNow: number;
  onClose: () => void;
  /** Your own session controls, docked at the bottom. */
  controls: ReactNode;
}) {
  const [clock, setClock] = useState("");
  const [isFull, setIsFull] = useState(false);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const tick = () =>
      setClock(new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 15_000);
    const overflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    // Leaving full screen (Esc) drops back to full view; Esc again, or Exit, closes.
    const onFs = () => setIsFull(Boolean(fsElement()));
    const firstFs = window.setTimeout(onFs, 0);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !fsElement()) close();
    };
    document.addEventListener("fullscreenchange", onFs);
    document.addEventListener("webkitfullscreenchange", onFs);
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(first);
      clearTimeout(firstFs);
      clearInterval(id);
      document.documentElement.style.overflow = overflow;
      document.removeEventListener("fullscreenchange", onFs);
      document.removeEventListener("webkitfullscreenchange", onFs);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  function close() {
    if (fsElement()) {
      try {
        if (document.exitFullscreen) void document.exitFullscreen().catch(() => {});
        else (document as Doc).webkitExitFullscreen?.();
      } catch {}
    }
    onCloseRef.current();
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${groupName} study room`}
      className="fixed inset-0 z-[90] flex flex-col overflow-hidden bg-[#0b0c0f] text-[#eceef2] animate-[focus-in_500ms_var(--ease-out)]"
    >
      {/* The room: slow colour fields, a floor glow, grain. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div
          className="focus-field absolute -top-[25%] -left-[10%] size-[70vmax] rounded-full"
          style={{ background: "radial-gradient(closest-side, rgba(243,180,92,.14), transparent)" }}
        />
        <div
          className="focus-field focus-field-b absolute -right-[15%] -bottom-[30%] size-[70vmax] rounded-full"
          style={{ background: "radial-gradient(closest-side, rgba(120,150,255,.1), transparent)" }}
        />
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-[linear-gradient(to_top,rgba(255,255,255,.035),transparent)]" />
        <div className="grain absolute inset-0 [--grain-opacity:.1]" />
      </div>

      <header className="relative flex items-center justify-between gap-4 px-5 pt-[max(18px,env(safe-area-inset-top))] sm:px-8">
        <div className="min-w-0">
          <p className="label-mono text-white/45">Study room</p>
          <h2 className="truncate font-display text-[clamp(22px,3vw,34px)] leading-tight text-white italic">
            {groupName}
          </h2>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="hidden font-mono text-13 tracking-[.12em] text-white/50 uppercase sm:inline">
            {clock}
          </span>
          <button
            type="button"
            onClick={() => {
              if (isFull) {
                try {
                  if (document.exitFullscreen) void document.exitFullscreen().catch(() => {});
                  else (document as Doc).webkitExitFullscreen?.();
                } catch {}
              } else enterFullscreen();
            }}
            title={isFull ? "Back to full view (other tabs work)" : "Full screen"}
            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-13 text-white/75 transition-colors hover:bg-white/10 hover:text-white"
          >
            {isFull ? (
              <Expand size={14} aria-hidden="true" />
            ) : (
              <Maximize2 size={14} aria-hidden="true" />
            )}
            <span className="max-sm:hidden">{isFull ? "Full view" : "Full screen"}</span>
          </button>
          <button
            type="button"
            onClick={close}
            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-13 text-white/75 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Minimize2 size={14} aria-hidden="true" />
            <span className="max-sm:hidden">Exit</span>
          </button>
        </div>
      </header>

      <div className="relative flex-1 overflow-y-auto px-5 pt-6 pb-4 sm:px-8">
        <div className="mx-auto w-full max-w-[1280px]">
          <StudyHall members={members} viewerId={viewerId} serverNow={serverNow} room />
        </div>
      </div>
      <div className="relative flex justify-center px-4 pt-2 pb-[max(20px,env(safe-area-inset-bottom))]">
        {controls}
      </div>
    </div>,
    document.body,
  );
}
