"use client";

import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import { cn } from "@upsolve/ui";

/** Today's date and a ticking clock in the user's timezone. Starts from the server's time. */
export function LiveClock({
  now: serverNow,
  timeZone,
  className,
}: {
  now: number;
  timeZone: string;
  className?: string;
}) {
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const d = new Date(now);
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
      timeZone,
    })
      .formatToParts(d)
      .map((p) => [p.type, p.value]),
  );
  const date = d.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone,
  });
  const shortDate = d.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone,
  });

  return (
    <div className={cn("surface-card flex items-center gap-4 rounded-lg px-4 py-3.5", className)}>
      <span className="grid size-9 shrink-0 place-items-center rounded-full border border-line-2 text-ink-3">
        <CalendarDays size={16} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-13 font-[600]" suppressHydrationWarning>
          <span className="sm:hidden">{shortDate}</span>
          <span className="hidden sm:inline">{date}</span>
        </span>
        <span className="block truncate font-mono text-[10.5px] tracking-[.08em] text-ink-3 uppercase">
          {timeZone.replace("_", " ")}
        </span>
      </span>
      <time
        dateTime={d.toISOString()}
        className="num shrink-0 font-mono text-[30px] leading-none tracking-[-0.04em]"
        suppressHydrationWarning
      >
        {parts.hour}:{parts.minute}
        <span className="text-[.55em] text-ink-3">:{parts.second}</span>
        <span className="ml-1.5 font-sans text-[.42em] font-[600] tracking-normal text-ink-3 uppercase">
          {parts.dayPeriod}
        </span>
      </time>
    </div>
  );
}
