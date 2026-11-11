"use client";

import { useEffect } from "react";
import { feel, reducedMotion } from "@/lib/feel";
import type { StudyContents } from "@/lib/study-data";

const clock = (ms: number) => {
  const m = Math.round(ms / 60_000);
  return m >= 60 ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m` : `${m}m`;
};

const OUTCOME: Record<string, string> = {
  solved: "AC",
  synced: "AC",
  open: "tried",
  abandoned: "left",
};

/**
 * The session receipt (FRONTEND-PLAN Â§8 Sessions 3): when a study session ends, a paper slip
 * "prints" out of a slot with everything it added up to. Paper in both themes, on purpose.
 */
export function SessionReceipt({
  label,
  at,
  wall,
  focusMs,
  awayMs,
  switches,
  contents,
}: {
  label: string | null;
  /** When the session ended (ms). */
  at: number;
  wall: number;
  focusMs: number | null;
  awayMs: number | null;
  switches: number | null;
  contents: StudyContents | null;
}) {
  useEffect(() => {
    if (!reducedMotion()) feel.print();
  }, []);
  const now = new Date(at);
  const problems = contents?.problems ?? [];
  const solved = problems.filter((p) => p.outcome === "solved" || p.outcome === "synced").length;
  const rows: [string, string][] = [
    ["Focus", clock(focusMs ?? wall)],
    ...(awayMs !== null ? ([["Away (not counted)", clock(awayMs)]] as [string, string][]) : []),
    ...(switches !== null ? ([["Tab switches", String(switches)]] as [string, string][]) : []),
    ["Problems", `${solved} solved / ${problems.length}`],
    ...(contents?.videos.length
      ? ([["Videos", String(contents.videos.length)]] as [string, string][])
      : []),
    ...(contents?.ticks.length
      ? ([["Sheet ticks", String(contents.ticks.length)]] as [string, string][])
      : []),
  ];
  return (
    <div className="relative mx-auto w-full max-w-[340px]">
      {/* The printer slot */}
      <div className="relative z-10 h-3 rounded-full bg-[color-mix(in_srgb,var(--ink)_14%,transparent)] shadow-[inset_0_2px_4px_rgba(0,0,0,.45)]" />
      <div className="-mt-1.5 overflow-hidden px-3 pb-3">
        <div className="receipt receipt-print relative bg-[#f6f3ec] px-5 pt-5 pb-7 font-mono text-[12px] leading-relaxed text-[#26231e] shadow-[0_18px_30px_-16px_rgba(0,0,0,.55)]">
          <p className="text-center text-[13px] font-[700] tracking-[.18em]">DSA à¤•à¤°à¥‹</p>
          <p className="text-center text-[10.5px] text-[#6e685e]">study session receipt</p>
          <p className="mt-2 text-center text-[10.5px] text-[#6e685e]">
            {now.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}{" "}
            Â· {now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
          </p>
          {label && <p className="mt-1 truncate text-center font-[700]">{label}</p>}
          <hr className="my-3 border-0 border-t border-dashed border-[#bdb6a8]" />
          {rows.map(([k, v]) => (
            <p key={k} className="flex justify-between gap-3">
              <span>{k}</span>
              <span className="font-[700] tabular-nums">{v}</span>
            </p>
          ))}
          {problems.length > 0 && (
            <>
              <hr className="my-3 border-0 border-t border-dashed border-[#bdb6a8]" />
              {problems.slice(0, 6).map((p, i) => (
                <p key={`${p.url}-${i}`} className="flex justify-between gap-3">
                  <span className="truncate">{p.title}</span>
                  <span className="shrink-0 tabular-nums">
                    {OUTCOME[p.outcome] ?? p.outcome} {clock(p.activeMs)}
                  </span>
                </p>
              ))}
              {problems.length > 6 && <p className="text-[#6e685e]">+{problems.length - 6} more</p>}
            </>
          )}
          <hr className="my-3 border-0 border-t border-dashed border-[#bdb6a8]" />
          <p className="flex justify-between text-[13px] font-[700]">
            <span>TOTAL</span>
            <span className="tabular-nums">{clock(focusMs ?? wall)}</span>
          </p>
          <p className="mt-3 text-center text-[10.5px] text-[#6e685e]">
            Idle and away time never count. Thank you, come again.
          </p>
          {/* Barcode, for the look */}
          <div
            aria-hidden="true"
            className="mx-auto mt-3 h-8 w-[70%] bg-[repeating-linear-gradient(90deg,#26231e_0_2px,transparent_2px_4px,#26231e_4px_5px,transparent_5px_8px)] opacity-80"
          />
        </div>
      </div>
    </div>
  );
}
