"use client";

import { useEffect, useState } from "react";
import { cn } from "@upsolve/ui";
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
}: {
  members: HallMember[];
  viewerId: string;
  serverNow: number;
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
          {members.slice(0, 4).map((m) => (
            <StudyBuddy key={m.userId} buddy={m.avatar} level="idle" size={52} />
          ))}
        </div>
        <p className="max-w-[300px] text-13 text-ink-3">
          Everyone&apos;s napping. Start a study session and your buddy sits down at the desk for
          the whole group to see.
        </p>
      </div>
    );

  return (
    <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
      {rows.map(({ m, session, today, state }) => {
        const level = buddyLevel(state, session);
        const live = state !== "idle";
        return (
          <li
            key={m.userId}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-[16px] border px-2 pt-3 pb-2.5 text-center transition-colors",
              state === "studying"
                ? "border-signal-2/35 bg-signal/[.05]"
                : state === "paused"
                  ? "border-medium/30 bg-medium-soft/40"
                  : "border-line bg-surface-2/40",
            )}
          >
            <StudyBuddy buddy={m.avatar} level={level} size={72} />
            <p className="mt-0.5 w-full truncate text-13 font-[600]">
              {m.name}
              {m.userId === viewerId && (
                <span className="ml-1 text-11 font-normal text-ink-3">you</span>
              )}
            </p>
            <p
              className={cn(
                "font-mono text-[18px] leading-none font-[600] tabular-nums",
                state === "studying"
                  ? "text-ink"
                  : state === "paused"
                    ? "text-medium"
                    : "text-ink-4",
              )}
              suppressHydrationWarning
            >
              {live ? focusClock(session) : "--:--"}
            </p>
            <p className="text-11 text-ink-3" suppressHydrationWarning>
              <span
                className={cn(
                  state === "studying" ? "text-signal-text" : state === "paused" && "text-medium",
                )}
              >
                {LEVEL_LABEL[level]}
              </span>
              {" · "}
              today <span className="tnum font-[600] text-ink-2">{hm(today)}</span>
            </p>
          </li>
        );
      })}
    </ul>
  );
}
