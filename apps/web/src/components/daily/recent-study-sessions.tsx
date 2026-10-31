"use client";

import { useState } from "react";
import { SegmentedControl } from "@upsolve/ui";
import { formatDuration } from "@/lib/format";
import type { StudySession } from "@/lib/study-data";
import { StudyHistory } from "./study-session";

const RANGES = [
  { value: "1", label: "24 hours" },
  { value: "2", label: "2 days" },
  { value: "5", label: "5 days" },
  { value: "7", label: "7 days" },
] as const;
type Range = (typeof RANGES)[number]["value"];

/**
 * Study sessions of the last 24 hours, 2, 5 or 7 days. The page sends the last week once;
 * switching ranges filters it in place.
 */
export function RecentStudySessions({
  sessions,
  now,
  timeZone,
}: {
  sessions: StudySession[];
  now: number;
  timeZone: string;
}) {
  const [range, setRange] = useState<Range>("1");
  const days = Number(range);
  const shown = sessions.filter((s) => s.endedAt >= now - days * 86_400_000);
  const focus = shown.reduce((a, s) => a + s.focusMs, 0);
  const wider = RANGES.find((r) => Number(r.value) > days);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl
          label="Show study sessions from the last"
          size="sm"
          value={range}
          onChange={setRange}
          items={RANGES.map((r) => ({ value: r.value, label: r.label }))}
        />
        <span className="tnum text-12 text-ink-3">
          {shown.length} session{shown.length === 1 ? "" : "s"}
          {shown.length > 0 && ` · ${formatDuration(focus)} focus`}
        </span>
      </div>

      {shown.length === 0 && sessions.length > 0 ? (
        <p className="text-13 text-ink-3">
          No study sessions in the last {days === 1 ? "24 hours" : `${days} days`}.{" "}
          {wider && (
            <button
              type="button"
              onClick={() => setRange(wider.value)}
              className="font-[550] text-ink-2 underline-offset-4 hover:text-ink hover:underline"
            >
              Show the last {wider.label}
            </button>
          )}
        </p>
      ) : (
        <StudyHistory sessions={shown} timeZone={timeZone} />
      )}
    </div>
  );
}
