import { CheckSquare, ChevronRight, History, Play } from "lucide-react";
import { DifficultyTag, Tag, cn } from "@upsolve/ui";
import { PlatformMark, platformMarkId } from "@/components/site-icons";
import { formatDuration } from "@/lib/format";
import type { StudyContents, StudySession } from "@/lib/study-data";

const OUTCOME: Record<string, { label: string; tone: "success" | "medium" | "neutral" | "info" }> =
  {
    solved: { label: "Solved", tone: "success" },
    synced: { label: "Solved", tone: "success" },
    open: { label: "In progress", tone: "info" },
    abandoned: { label: "Attempted", tone: "medium" },
  };
/** Watch time: seconds under a minute ("24s"), else minutes ("12m", "1h 5m"). */
const watchTime = (ms: number) => (ms < 60_000 ? `${Math.round(ms / 1000)}s` : formatDuration(ms));
const HOW: Record<string, string> = {
  solo: "solo",
  hint: "with a hint",
  solution: "saw the solution",
};

/** Counts for a one-line summary, e.g. "2 solved · 1 attempted · 1 video · 3 ticked". */
export function studyCounts(c: StudyContents) {
  const solved = c.problems.filter((p) => p.outcome === "solved" || p.outcome === "synced").length;
  const tried = c.problems.length - solved;
  return [
    solved && `${solved} solved`,
    tried && `${tried} attempted`,
    c.videos.length && `${c.videos.length} ${c.videos.length === 1 ? "video" : "videos"}`,
    c.ticks.length && `${c.ticks.length} ticked`,
  ].filter(Boolean) as string[];
}

/** Problems worked on, videos watched and sheet items ticked during a study session. */
export function StudyContentsList({
  contents,
  className,
}: {
  contents: StudyContents;
  className?: string;
}) {
  const { problems, videos, ticks } = contents;
  if (problems.length + videos.length + ticks.length === 0) {
    return (
      <p className={cn("text-13 text-ink-3", className)}>
        Nothing logged in this session yet. Solve with the extension on, watch a sheet video here or
        tick a sheet item, and it shows up.
      </p>
    );
  }
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {problems.length > 0 && (
        <ul className="flex flex-col gap-1">
          {problems.map((p, i) => {
            const mark = platformMarkId(p.platform);
            const o = OUTCOME[p.outcome] ?? OUTCOME.abandoned!;
            return (
              <li
                key={`${p.url}-${i}`}
                className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-13"
              >
                {mark && <PlatformMark site={mark} size={14} className="text-ink-3" />}
                <a
                  href={p.url}
                  target="_blank"
                  rel="noreferrer"
                  className="min-w-0 truncate font-[550] hover:underline"
                >
                  {p.title}
                </a>
                {p.difficulty && <DifficultyTag difficulty={p.difficulty} />}
                <Tag tone={o.tone} className="h-5 px-1.5 text-11">
                  {o.label}
                </Tag>
                <span className="font-mono text-11 text-ink-3">
                  {[
                    p.activeMs > 0 && formatDuration(p.activeMs),
                    p.independence && HOW[p.independence],
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {videos.length > 0 && (
        <ul className="flex flex-col gap-1">
          {videos.map((v, i) => (
            <li
              key={`${v.url}-${i}`}
              className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-13"
            >
              <Play size={13} aria-hidden="true" className="shrink-0 fill-current text-[#ff0033]" />
              <a
                href={v.url}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 truncate font-[550] hover:underline"
              >
                {v.title}
              </a>
              <span className="font-mono text-11 text-ink-3">
                {[v.sheet, `${watchTime(v.watchedMs)} watched`].filter(Boolean).join(" · ")}
              </span>
            </li>
          ))}
        </ul>
      )}
      {ticks.length > 0 && (
        <ul className="flex flex-col gap-1">
          {ticks.map((t, i) => (
            <li
              key={`${t.title}-${i}`}
              className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-13"
            >
              <CheckSquare size={13} aria-hidden="true" className="shrink-0 text-success" />
              <span className="min-w-0 truncate font-[550]">{t.title}</span>
              <span className="font-mono text-11 text-ink-3">ticked · {t.sheet}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Past study sessions, newest first: when, how long, and what you did in each. */
export function StudyHistory({
  sessions,
  timeZone,
}: {
  sessions: StudySession[];
  timeZone: string;
}) {
  if (sessions.length === 0) {
    return (
      <p className="flex items-center gap-2 text-13 text-ink-3">
        <History size={14} aria-hidden="true" /> Finished study sessions show up here, with
        everything you solved and watched in them.
      </p>
    );
  }
  const day = (ms: number) =>
    new Date(ms).toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone,
    });
  const time = (ms: number) =>
    new Date(ms).toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone,
    });
  return (
    <ul className="flex flex-col gap-2">
      {sessions.map((s, i) => {
        const counts = studyCounts(s);
        return (
          <li key={s.id}>
            <details open={i === 0} className="group/s surface-inset rounded-[16px] px-4 py-3">
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 [&::-webkit-details-marker]:hidden">
                <ChevronRight
                  size={14}
                  aria-hidden="true"
                  className="shrink-0 text-ink-3 transition-transform group-open/s:rotate-90"
                />
                <span className="text-14 font-[600]">
                  {day(s.startedAt)} · {time(s.startedAt)} – {time(s.endedAt)}
                </span>
                {s.label && <Tag className="h-5 px-1.5 text-11">{s.label}</Tag>}
                <span className="ml-auto font-mono text-12 text-ink-3">
                  {formatDuration(s.focusMs)} focus
                  {s.tracked && s.awayMs > 0 ? ` · ${formatDuration(s.awayMs)} away` : ""}
                </span>
                <span className="basis-full pl-[26px] text-12 text-ink-3">
                  {counts.length ? counts.join(" · ") : "nothing logged"}
                </span>
              </summary>
              <StudyContentsList
                contents={s}
                className="mt-3 border-t border-line pt-3 pl-[26px]"
              />
            </details>
          </li>
        );
      })}
    </ul>
  );
}
