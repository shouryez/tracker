"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { reducedMotion } from "@/lib/feel";

/**
 * Leaderboard motion (FRONTEND-PLAN §8 People 2), around a server-rendered list:
 * - remembers each person's rank from your last visit (this browser), marks rows that moved
 *   with ▲/▼ and glides them from where they were (FLIP);
 * - on big boards, starts on "near you" (two above, two below, plus the podium rows already
 *   shown above) with a "See all" button. Rows carry data-rank-user and data-far.
 */
export function BoardFrame({
  boardKey,
  ranks,
  nearYou,
  total,
  children,
}: {
  boardKey: string;
  /** userId → rank, as shown now. */
  ranks: Record<string, number>;
  /** Start collapsed to the rows around you. */
  nearYou: boolean;
  total: number;
  children: ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [all, setAll] = useState(!nearYou);
  const sig = JSON.stringify(ranks);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const key = `dsakaro:board:${boardKey}`;
    let prev: Record<string, number> | null = null;
    try {
      prev = JSON.parse(localStorage.getItem(key) ?? "null");
      localStorage.setItem(key, sig);
    } catch {}
    if (!prev) return;
    const rows = el.querySelectorAll<HTMLElement>("[data-rank-user]");
    rows.forEach((row) => {
      const id = row.dataset.rankUser!;
      const was = prev![id];
      const now = ranks[id];
      if (was === undefined || now === undefined || was === now) return;
      row.dataset.delta = was > now ? `▲${was - now}` : `▼${now - was}`;
      row.dataset.dir = was > now ? "up" : "down";
      if (!reducedMotion())
        row.animate(
          [
            { transform: `translateY(${(was - now) * row.offsetHeight}px)`, opacity: 0.6 },
            { transform: "none", opacity: 1 },
          ],
          { duration: 700, delay: 250, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" },
        );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardKey, sig]);

  return (
    <div ref={box} data-near={all ? undefined : ""} className="board-frame flex flex-col gap-2">
      {children}
      {nearYou && (
        <button
          type="button"
          onClick={() => setAll((v) => !v)}
          className="self-center rounded-full px-3.5 py-1.5 text-12 font-[600] text-ink-2 shadow-[inset_0_0_0_1px_var(--line-2)] hover:text-ink"
        >
          {all ? "Show the people near you" : `See all ${total}`}
        </button>
      )}
    </div>
  );
}
