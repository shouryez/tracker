"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, CalendarPlus } from "lucide-react";
import { SegmentedControl, Tag, cn } from "@upsolve/ui";
import { PlatformMark, type PlatformId } from "@/components/site-icons";

export type UpcomingRow = {
  id: string;
  platform: "leetcode" | "codeforces" | "codechef" | "atcoder";
  name: string;
  startsAt: number;
  durationMin: number;
  url: string;
  calendarUrl: string;
};

const LABEL = {
  leetcode: "LeetCode",
  codeforces: "Codeforces",
  codechef: "CodeChef",
  atcoder: "AtCoder",
};

function until(ms: number) {
  if (ms <= 0) return "live now";
  const m = Math.floor(ms / 60_000);
  if (m < 60) return `in ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 48) return `in ${h}h ${m % 60}m`;
  return `in ${Math.floor(h / 24)}d`;
}

/** Contest calendar across four platforms with live countdowns and calendar links. */
export function UpcomingContests({ contests, tz }: { contests: UpcomingRow[]; tz: string }) {
  const [now, setNow] = useState<number | null>(null);
  const [filter, setFilter] = useState<"all" | UpcomingRow["platform"]>("all");
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 30_000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);
  const shown = contests.filter((c) => filter === "all" || c.platform === filter).slice(0, 12);

  if (contests.length === 0) {
    return <p className="text-13 text-ink-3">Couldn&apos;t load the contest calendar right now.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <SegmentedControl
        label="Platform"
        size="sm"
        value={filter}
        onChange={setFilter}
        className="self-start"
        items={[
          { value: "all", label: "All" },
          { value: "leetcode", label: "LeetCode" },
          { value: "codeforces", label: "CF" },
          { value: "codechef", label: "CodeChef" },
          { value: "atcoder", label: "AtCoder" },
        ]}
      />
      <ul className="flex flex-col gap-2">
        {shown.map((c) => {
          const soon = now !== null && c.startsAt - now < 6 * 3_600_000;
          return (
            <li
              key={c.id}
              className={cn(
                "surface-inset group flex flex-wrap items-center gap-3 rounded-[14px] px-3.5 py-3",
                soon && "border-medium-line",
              )}
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-[10px] border border-line bg-surface-2">
                <PlatformMark site={c.platform as PlatformId} size={17} brand />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-[600]">{c.name}</span>
                <span className="tnum text-11 text-ink-3">
                  {LABEL[c.platform]} ·{" "}
                  {new Date(c.startsAt).toLocaleString("en-IN", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    hour: "numeric",
                    minute: "2-digit",
                    timeZone: tz,
                  })}{" "}
                  · {Math.floor(c.durationMin / 60)}h
                  {c.durationMin % 60 ? ` ${c.durationMin % 60}m` : ""}
                </span>
              </span>
              {now !== null && (
                <Tag tone={soon ? "medium" : "neutral"} className="tnum">
                  {until(c.startsAt - now)}
                </Tag>
              )}
              <a
                href={c.calendarUrl}
                target="_blank"
                rel="noreferrer"
                aria-label={`Add ${c.name} to Google Calendar`}
                title="Add to Google Calendar"
                className="grid size-8 place-items-center rounded-full text-ink-3 transition-colors hover:bg-surface-3 hover:text-ink"
              >
                <CalendarPlus size={15} />
              </a>
              <a
                href={c.url}
                target="_blank"
                rel="noreferrer"
                aria-label={`Open ${c.name}`}
                className="grid size-8 place-items-center rounded-full text-ink-3 transition-colors hover:bg-surface-3 hover:text-ink"
              >
                <ArrowUpRight size={15} />
              </a>
            </li>
          );
        })}
      </ul>
      <p className="text-11 text-ink-3">
        The extension reminds you 30 minutes before a contest (turn it off in Settings).
      </p>
    </div>
  );
}
