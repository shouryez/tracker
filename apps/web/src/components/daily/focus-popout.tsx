"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Coffee, Pause, Play, Square, UsersRound } from "lucide-react";
import { cn } from "@upsolve/ui";
import { StudyBuddy } from "@/components/study-buddy";
import { hallTimes, hm } from "@/components/study-hall";
import { buddyLevel } from "@/lib/buddies";
import type { ActiveFocus, HallMember } from "@/lib/daily-data";
import type { LabLive } from "@/lib/ext-bridge";
import { focusClock, focusElapsed, focusPhase } from "@/lib/focus";
import { ActivityLine } from "./focus-live";

/**
 * The study timer in a small window that floats over every tab (and other apps). A slim
 * horizontal widget by default; taller windows get a stacked layout with a bigger ring,
 * narrow ones drop the ring. Rendered from this page into the pop-out window.
 */
export function FocusPopout({
  win,
  active,
  live,
  pending,
  onTogglePause,
  onStop,
}: {
  win: Window;
  active: ActiveFocus;
  live: LabLive | null;
  pending: boolean;
  onTogglePause: () => void;
  onStop: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  const [size, setSize] = useState(() => ({ w: win.innerWidth, h: win.innerHeight }));
  const paused = active.pausedAt !== null;

  // Group view: a group's members and their live timers under yours (remembered).
  const [groupId, setGroupId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(GROUP_KEY);
    } catch {
      return null;
    }
  });
  const [hall, setHall] = useState<Hall | null>(null);
  const groupOn = groupId !== null;
  useEffect(() => {
    if (groupId === null) return;
    let alive = true;
    const load = async () => {
      try {
        const q = groupId ? `?group=${encodeURIComponent(groupId)}` : "";
        const res = await fetch(`/api/study-hall${q}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as Hall;
        if (alive) setHall({ ...data, skew: data.serverNow - Date.now() });
      } catch {}
    };
    void load();
    const id = window.setInterval(load, 15_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [groupId]);
  const pickGroup = (id: string | null) => {
    setGroupId(id);
    try {
      if (id === null) localStorage.removeItem(GROUP_KEY);
      else localStorage.setItem(GROUP_KEY, id);
    } catch {}
    // Make room for the list (or give it back); the click allows resizing the window.
    try {
      win.resizeTo(Math.max(win.outerWidth, 380), id === null ? 180 : 420);
    } catch {}
  };

  useEffect(() => {
    const onResize = () => setSize({ w: win.innerWidth, h: win.innerHeight });
    win.addEventListener("resize", onResize);
    return () => win.removeEventListener("resize", onResize);
  }, [win]);

  // Space pauses inside the pop-out too.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat) return;
      e.preventDefault();
      if (!pending) onTogglePause();
    };
    win.addEventListener("keydown", onKey);
    return () => win.removeEventListener("keydown", onKey);
  }, [win, pending, onTogglePause]);

  // Tick while running, or while the group shows (their timers run on).
  useEffect(() => {
    if (paused && !groupOn) return;
    const first = window.setTimeout(() => setNow(Date.now()), 0);
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [paused, groupOn]);

  const elapsed = focusElapsed(active, paused ? active.pausedAt! : now);
  const p = focusPhase(active.mode, elapsed);
  const span = p ? p.length : 60 * 60_000;
  const progress = Math.min(1, (p ? p.length - p.left : elapsed % span) / span);
  const onBreak = Boolean(p && !p.working);
  const tone = paused ? "var(--medium)" : onBreak ? "var(--info)" : "var(--signal)";
  const status = paused
    ? live?.autoPaused
      ? "Auto-paused"
      : "Paused"
    : p
      ? p.working
        ? `Focus · round ${p.round}`
        : "Break"
      : "Studying";
  const time = focusClock(p ? p.left : elapsed);

  const tall = !groupOn && size.h >= 260 && size.w >= 240;
  const showRing = tall || size.w >= 330;
  const ringPx = tall
    ? Math.min(size.w * 0.6, size.h * 0.42, 240)
    : Math.max(64, Math.min(size.h - 40, 96));

  const ring = (
    <div className="relative shrink-0" style={{ width: ringPx, height: ringPx }}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 size-full -rotate-90">
        <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="5" />
        <circle
          cx="50"
          cy="50"
          r="44"
          fill="none"
          stroke="var(--tone)"
          strokeWidth="5"
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray="1"
          strokeDashoffset={1 - progress}
          className="transition-[stroke-dashoffset,stroke] duration-1000 ease-linear"
          style={{
            filter: "drop-shadow(0 0 4px color-mix(in srgb, var(--tone) 70%, transparent))",
          }}
        />
      </svg>
      {/* Pause / resume sits inside the ring. */}
      <button
        type="button"
        onClick={onTogglePause}
        disabled={pending}
        aria-label={paused ? "Resume" : "Pause"}
        className={cn(
          "absolute grid place-items-center rounded-full bg-[var(--tone)] text-[#0b0b0f] shadow-[0_0_22px_-4px_var(--tone)] transition-[transform,background-color] duration-300 hover:scale-105 active:scale-95 disabled:opacity-60",
          tall ? "inset-[30%]" : "inset-[21%]",
        )}
      >
        {paused ? (
          <Play className="size-[38%] translate-x-[6%] fill-current" aria-hidden="true" />
        ) : (
          <Pause className="size-[36%] fill-current" aria-hidden="true" />
        )}
      </button>
    </div>
  );

  const statusRow = (
    <span className="flex min-w-0 items-center gap-1.5 font-mono text-[10px] tracking-[.16em] whitespace-nowrap text-white/55 uppercase">
      {onBreak && !paused ? (
        <Coffee size={11} aria-hidden="true" />
      ) : (
        <span
          className={cn(
            "size-1.5 shrink-0 rounded-full bg-[var(--tone)]",
            !paused && "pulse-ring text-[var(--tone)]",
          )}
        />
      )}
      {status}
    </span>
  );

  const groupBtn = (
    <button
      type="button"
      onClick={() => pickGroup(groupOn ? null : "")}
      aria-pressed={groupOn}
      aria-label={groupOn ? "Hide your group" : "Show your group"}
      title={groupOn ? "Hide your group" : "Show your group"}
      className={cn(
        "grid size-7 shrink-0 place-items-center rounded-full border transition-colors",
        groupOn
          ? "border-[var(--tone)]/50 bg-[var(--tone)]/15 text-[var(--tone)]"
          : "border-white/10 bg-white/[.04] text-white/55 hover:text-white",
      )}
    >
      <UsersRound size={12} aria-hidden="true" />
    </button>
  );

  const stopBtn = (
    <button
      type="button"
      onClick={onStop}
      disabled={pending}
      aria-label="Stop and save"
      title="Stop and save"
      className="grid size-7 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[.04] text-white/55 transition-colors hover:border-bad/40 hover:bg-bad/15 hover:text-bad disabled:opacity-50"
    >
      <Square size={10} className="fill-current" aria-hidden="true" />
    </button>
  );

  // What you're on (from the extension); else the session label.
  const activity =
    live?.now || live?.autoPaused ? (
      <ActivityLine live={live} paused={paused} className="min-w-0 text-[12px]" />
    ) : active.label ? (
      <p className="min-w-0 truncate text-[12px] text-white/55">{active.label}</p>
    ) : null;

  return createPortal(
    <div
      className="relative h-dvh w-full overflow-hidden bg-[#09090c] text-[#f4f4f6] select-none"
      style={{ "--tone": tone } as CSSProperties}
    >
      {/* Ambient: a soft glow of the state colour and a hairline of progress along the top. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(110% 130% at ${tall ? "50% 0%" : "0% 50%"}, color-mix(in srgb, var(--tone) 15%, transparent), transparent 60%), linear-gradient(180deg, rgba(255,255,255,.035), transparent 70%)`,
        }}
      />
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-[2px] bg-white/[.06]">
        <div
          className="h-full origin-left bg-[var(--tone)] shadow-[0_0_10px_var(--tone)] transition-transform duration-1000 ease-linear"
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>

      {tall ? (
        <div className="relative flex h-full flex-col items-center justify-center gap-4 px-5 py-6 text-center">
          {statusRow}
          {ring}
          <div className="flex flex-col items-center">
            <span
              className={cn(
                "font-mono text-[clamp(32px,12vw,52px)] leading-none font-[600] tracking-[-.04em] tabular-nums",
                paused && "animate-[focus-blink_2s_ease-in-out_infinite]",
              )}
            >
              {time}
            </span>
            {p && <span className="mt-1.5 text-11 text-white/40">{focusClock(elapsed)} total</span>}
          </div>
          {active.label && (live?.now || live?.autoPaused) && (
            <p className="max-w-full truncate font-display text-[15px] text-white/75 italic">
              {active.label}
            </p>
          )}
          <div className="flex max-w-full items-center gap-3">
            {activity}
            {groupBtn}
            {stopBtn}
          </div>
        </div>
      ) : (
        <div className="relative flex h-full flex-col">
          <div
            className={cn(
              "flex items-center gap-3.5 px-4",
              groupOn ? "h-[132px] shrink-0" : "h-full",
            )}
          >
            {showRing && ring}
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                {statusRow}
                <span className="flex items-center gap-1.5">
                  {groupBtn}
                  {stopBtn}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "font-mono text-[clamp(26px,9vw,36px)] leading-none font-[600] tracking-[-.04em] tabular-nums",
                    paused && "animate-[focus-blink_2s_ease-in-out_infinite]",
                  )}
                >
                  {time}
                </span>
                {p && (
                  <span className="truncate font-mono text-[11px] text-white/35">
                    / {focusClock(elapsed)}
                  </span>
                )}
                {!showRing && (
                  <button
                    type="button"
                    onClick={onTogglePause}
                    disabled={pending}
                    aria-label={paused ? "Resume" : "Pause"}
                    className="ml-auto grid size-8 shrink-0 place-items-center rounded-full bg-[var(--tone)] text-[#0b0b0f]"
                  >
                    {paused ? (
                      <Play size={13} className="fill-current" aria-hidden="true" />
                    ) : (
                      <Pause size={13} className="fill-current" aria-hidden="true" />
                    )}
                  </button>
                )}
              </div>
              {activity}
            </div>
          </div>
          {groupOn && <GroupPanel hall={hall} now={now} onPick={(id) => pickGroup(id)} />}
        </div>
      )}
    </div>,
    win.document.body,
  );
}

const GROUP_KEY = "dsakaro:popout-group";

type Hall = {
  groups: { id: string; name: string }[];
  group: { id: string; name: string } | null;
  members: HallMember[];
  serverNow: number;
  viewerId: string;
  /** Server clock minus this device's, so timers tick on the server's time. */
  skew: number;
};

/** The group under the timer: who's studying, their live timers, today's totals. */
function GroupPanel({
  hall,
  now,
  onPick,
}: {
  hall: Hall | null;
  now: number;
  onPick: (id: string) => void;
}) {
  if (!hall) return <p className="px-4 py-3 text-12 text-white/45">Loading your group…</p>;
  if (!hall.group)
    return (
      <p className="px-4 py-3 text-12 text-white/45">
        Join or create a group to see friends studying here.
      </p>
    );
  const t = now + hall.skew;
  const rows = hall.members
    .map((m) => ({ m, ...hallTimes(m, t) }))
    .sort(
      (a, b) =>
        Number(b.state === "studying") - Number(a.state === "studying") ||
        Number(b.state === "paused") - Number(a.state === "paused") ||
        b.today - a.today,
    );
  const studying = rows.filter((r) => r.state === "studying").length;
  return (
    <div className="flex min-h-0 flex-1 flex-col border-t border-white/[.06]">
      <div className="flex items-center justify-between gap-2 px-4 pt-2.5 pb-1.5">
        {hall.groups.length > 1 ? (
          <select
            value={hall.group.id}
            onChange={(e) => onPick(e.target.value)}
            aria-label="Group"
            className="max-w-[60%] truncate rounded-md border border-white/10 bg-white/[.04] px-1.5 py-0.5 text-12 font-[600] text-white outline-none"
          >
            {hall.groups.map((g) => (
              <option key={g.id} value={g.id} className="bg-[#16161b]">
                {g.name}
              </option>
            ))}
          </select>
        ) : (
          <span className="truncate text-12 font-[600] text-white">{hall.group.name}</span>
        )}
        <span className="flex items-center gap-1.5 font-mono text-[10px] tracking-[.12em] text-white/50 uppercase">
          <span className="pulse-ring size-1.5 rounded-full bg-success text-success" />
          {studying} studying
        </span>
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {rows.map(({ m, session, today, state }) => (
          <li
            key={m.userId}
            className={cn(
              "flex items-center gap-2.5 rounded-[12px] px-2 py-1.5",
              state === "studying" && "bg-white/[.035]",
            )}
          >
            <StudyBuddy buddy={m.avatar} level={buddyLevel(state, session)} size={34} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12.5px] font-[600] text-white">
                {m.name}
                {m.userId === hall.viewerId && (
                  <span className="ml-1 text-[10.5px] font-normal text-white/40">you</span>
                )}
              </span>
              <span className="block text-[10.5px] text-white/45">today {hm(today)}</span>
            </span>
            <span
              className={cn(
                "font-mono text-[13px] font-[600] tabular-nums",
                state === "studying"
                  ? "text-white"
                  : state === "paused"
                    ? "text-[#f5b544]"
                    : "text-white/25",
              )}
            >
              {state === "idle" ? "idle" : focusClock(session)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
