"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Maximize2, Minimize2, Timer } from "lucide-react";
import { Card, CardHeader, CardSub, CardTitle, cn } from "@upsolve/ui";
import { enterFullscreen } from "@/components/daily/focus-screen";
import { StudyBuddy } from "@/components/study-buddy";
import { buddyLevel, LEVEL_LABEL } from "@/lib/buddies";
import type { HallMember } from "@/lib/daily-data";
import { focusClock } from "@/lib/focus";

const hm = (ms: number) => {
  const m = Math.floor(ms / 60_000);
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;
};

/** Running session time and today's total for one member at `now`. Pure. */
function times(m: HallMember, now: number) {
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
    .map((m) => ({ m, ...times(m, now) }))
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
            : "grid-cols-2 sm:grid-cols-3",
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
                room
                  ? state === "studying"
                    ? "border-[#a3e635]/30 bg-[#a3e635]/[.06]"
                    : state === "paused"
                      ? "border-[#f5b544]/30 bg-[#f5b544]/[.06]"
                      : "border-white/[.07] bg-white/[.03]"
                  : state === "studying"
                    ? "border-signal-2/35 bg-signal/[.05]"
                    : state === "paused"
                      ? "border-medium/30 bg-medium-soft/40"
                      : "border-line bg-surface-2/40",
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
              <p
                className={cn("text-11", room ? "text-white/50" : "text-ink-3")}
                suppressHydrationWarning
              >
                <span
                  className={cn(
                    state === "studying" ? "text-signal-text" : state === "paused" && "text-medium",
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
}: {
  groupName: string;
  members: HallMember[];
  viewerId: string;
  serverNow: number;
}) {
  const [open, setOpen] = useState(false);
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
        />
      )}
    </>
  );
}

function StudyRoom({
  groupName,
  members,
  viewerId,
  serverNow,
  onClose,
}: {
  groupName: string;
  members: HallMember[];
  viewerId: string;
  serverNow: number;
  onClose: () => void;
}) {
  const [clock, setClock] = useState("");
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
    let wasFull = Boolean(fsElement());
    const onFs = () => {
      const full = Boolean(fsElement());
      if (wasFull && !full) onCloseRef.current();
      wasFull = full;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("fullscreenchange", onFs);
    document.addEventListener("webkitfullscreenchange", onFs);
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(first);
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
      className="fixed inset-0 z-[90] flex flex-col overflow-hidden bg-[#06060a] text-[#f4f4f6] animate-[focus-in_500ms_var(--ease-out)]"
    >
      {/* The room: slow colour fields, a floor glow, grain. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div
          className="focus-field absolute -top-[25%] -left-[10%] size-[70vmax] rounded-full"
          style={{ background: "radial-gradient(closest-side, rgba(163,230,53,.13), transparent)" }}
        />
        <div
          className="focus-field focus-field-b absolute -right-[15%] -bottom-[30%] size-[70vmax] rounded-full"
          style={{ background: "radial-gradient(closest-side, rgba(139,92,246,.16), transparent)" }}
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
            onClick={close}
            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-13 text-white/75 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Minimize2 size={14} aria-hidden="true" />
            <span className="max-sm:hidden">Exit</span>
          </button>
        </div>
      </header>

      <div className="relative flex-1 overflow-y-auto px-5 pt-6 pb-[max(28px,env(safe-area-inset-bottom))] sm:px-8">
        <div className="mx-auto w-full max-w-[1280px]">
          <StudyHall members={members} viewerId={viewerId} serverNow={serverNow} room />
        </div>
      </div>
    </div>,
    document.body,
  );
}
