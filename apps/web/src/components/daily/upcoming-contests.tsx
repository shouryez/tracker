"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, CalendarPlus, Play } from "lucide-react";
import { toast } from "sonner";
import { Button, SegmentedControl, Tag, cn } from "@upsolve/ui";
import { startFocus } from "@/app/actions/daily";
import { maybeAutoPopout } from "@/components/daily/focus-live";
import { SplitFlapCountdown } from "@/components/fx/split-flap";
import { PlatformMark, type PlatformId } from "@/components/site-icons";
import { labStart } from "@/lib/ext-bridge";

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

/**
 * The next contest on a split-flap board. Inside 30 minutes it turns into a "starting soon"
 * bar that can start a study session named after the contest (FRONTEND-PLAN §8 Contests 4).
 */
function NextContest({ c, now, tz }: { c: UpcomingRow; now: number; tz: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const soon = c.startsAt - now < 30 * 60_000;
  const live = c.startsAt <= now;
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-x-6 gap-y-4 rounded-[18px] p-4",
        soon
          ? "bg-primary-soft shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--primary)_40%,transparent)]"
          : "surface-inset",
      )}
    >
      <div className="min-w-0 flex-[1_1_220px]">
        <p className="flex items-center gap-2 text-12 font-[600] text-ink-3">
          <PlatformMark site={c.platform as PlatformId} size={14} brand />
          {live ? "Live now" : soon ? "Starting soon" : "Next up"}
          {soon && <span className="size-1.5 rounded-full bg-primary motion-safe:animate-pulse" />}
        </p>
        <p className="mt-1 truncate font-display text-[20px] leading-tight font-[650] tracking-[-0.02em]">
          {c.name}
        </p>
        <p className="tnum mt-0.5 text-12 text-ink-3">
          {new Date(c.startsAt).toLocaleString("en-IN", {
            weekday: "short",
            day: "numeric",
            month: "short",
            hour: "numeric",
            minute: "2-digit",
            timeZone: tz,
          })}
        </p>
        {soon && (
          <Button
            variant="signal"
            size="sm"
            className="mt-3"
            loading={pending}
            onClick={() =>
              start(async () => {
                const res = await startFocus("stopwatch", c.name);
                if (!res.ok) return void toast.error(res.error);
                if (!res.existing) {
                  await labStart(res.id, res.startedAt);
                  maybeAutoPopout();
                }
                toast.success(`Session started for ${c.name}`, {
                  description: "It times the contest like any study session.",
                });
                router.refresh();
              })
            }
          >
            <Play size={13} aria-hidden="true" className="fill-current" /> Start a session for it
          </Button>
        )}
      </div>
      {!live && <SplitFlapCountdown to={c.startsAt} />}
    </div>
  );
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

  const next =
    now === null ? undefined : contests.find((c) => c.startsAt + c.durationMin * 60_000 > now);
  return (
    <div className="flex flex-col gap-3">
      {next && now !== null && <NextContest c={next} now={now} tz={tz} />}
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
      <ul className="grid gap-2 lg:grid-cols-2">
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
