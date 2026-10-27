import { CircleCheck, CircleDashed, CircleSlash, Eye, Lightbulb, User } from "lucide-react";
import { DifficultyTag, Tag, cn } from "@upsolve/ui";
import { HowSolved } from "@/components/charts/insights";
import { formatDuration, type SessionRow } from "@/lib/sessions-data";
import { TimeAgo } from "./time-ago";

const MODE = {
  solo: { label: "Solo", Icon: User, cls: "text-success" },
  hint: { label: "Hint", Icon: Lightbulb, cls: "text-medium" },
  solution: { label: "Saw solution", Icon: Eye, cls: "text-violet" },
} as const;

/**
 * One extension-tracked session: outcome glyph, title, submit count, an active vs idle
 * two-tone bar, solve mode and duration.
 */
export function SessionItem({ s }: { s: SessionRow }) {
  const total = Math.max(1, s.activeMs + s.idleMs);
  const mode = s.independence ? MODE[s.independence] : null;
  const Outcome =
    s.outcome === "solved" ? CircleCheck : s.outcome === "abandoned" ? CircleSlash : CircleDashed;
  return (
    <li className="group/row flex items-center gap-3 rounded-[12px] px-2.5 py-2.5 transition-colors hover:bg-surface-2/70">
      <Outcome
        size={17}
        aria-label={s.outcome === "solved" ? "Solved" : s.outcome === "abandoned" ? "Left" : "Open"}
        className={cn(
          "shrink-0",
          s.outcome === "solved"
            ? "text-success"
            : s.outcome === "abandoned"
              ? "text-ink-4"
              : "text-medium",
        )}
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <a
            href={s.url}
            target="_blank"
            rel="noreferrer"
            className="truncate text-[13.5px] font-medium hover:underline"
          >
            {s.title}
          </a>
          {s.difficulty && <DifficultyTag difficulty={s.difficulty} />}
        </span>
        <span className="mt-1.5 flex items-center gap-2.5 text-11 text-ink-3">
          <span
            className="flex h-1.5 w-24 overflow-hidden rounded-full bg-surface-3"
            title={`${formatDuration(s.activeMs)} active · ${formatDuration(s.idleMs)} idle`}
          >
            <span
              className="h-full bg-violet"
              style={{ width: `${(s.activeMs / total) * 100}%` }}
            />
            <span
              className="h-full bg-ink-4/50"
              style={{ width: `${(s.idleMs / total) * 100}%` }}
            />
          </span>
          <span className="tnum">
            {s.submits} submit{s.submits === 1 ? "" : "s"}
          </span>
          {s.note && <span className="hidden truncate italic md:inline">“{s.note}”</span>}
        </span>
      </span>
      {mode && (
        <Tag className={cn("hidden sm:inline-flex", mode.cls)}>
          <mode.Icon size={12} aria-hidden="true" /> {mode.label}
        </Tag>
      )}
      <span className="w-20 shrink-0 text-right">
        <span className="tnum block text-13 font-[600]">{formatDuration(s.activeMs)}</span>
        <span className="block text-11 text-ink-3">
          <TimeAgo date={s.startedAt} />
        </span>
      </span>
    </li>
  );
}

/** Solo / hint / saw-solution as a 3-segment ring (kept under its old name). */
export function HonestSplit({
  solo,
  hint,
  solution,
  className,
}: {
  solo: number;
  hint: number;
  solution: number;
  className?: string;
}) {
  return (
    <div className={className}>
      <HowSolved honest={{ solo, hint, solution }} />
    </div>
  );
}
