"use client";

import Link from "next/link";
import { useOptimistic, useRef, useState, useTransition, type ReactNode } from "react";
import { ArrowUpRight, CalendarClock, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button, DifficultyTag, ProgressRing, Tag, cn, inputClasses } from "@upsolve/ui";
import { addPlanTask, removePlanItem, setPlanItemDone } from "@/app/actions/daily";
import { CelebrateOnce, burstFrom } from "@/components/dashboard/celebrate";
import { AnimatedCheckbox } from "@/components/fx/toggles";
import type { PlanItem, PlanKind, TodayPlan } from "@/lib/plan";

export const KIND: Record<
  PlanKind,
  { label: string; tone: "revise" | "primary" | "medium" | "info" | "signal" | "hard" | "neutral" }
> = {
  revision: { label: "Revision", tone: "revise" },
  next: { label: "Next", tone: "primary" },
  stretch: { label: "Stretch", tone: "medium" },
  shared: { label: "From a friend", tone: "info" },
  contest: { label: "Contest", tone: "signal" },
  drill: { label: "Drill", tone: "hard" },
  sheet: { label: "From sheet", tone: "primary" },
  custom: { label: "Task", tone: "neutral" },
};

type Op = { id: string; done?: boolean; removed?: boolean } | { add: PlanItem };

/** "Yesterday", or "Tue, 28 Oct": when a rolled-over item was planned. */
function dayLabel(day: string, today: string) {
  const diff = Math.round((Date.parse(today) - Date.parse(day)) / 86_400_000);
  if (diff === 1) return "Yesterday";
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/**
 * Today's to-do list: only what you added (suggestions, sheet items, your own tasks).
 * Problem items tick themselves when you solve them (the extension or a sync reports
 * Accepted) or tick them on a sheet; anything can be ticked by hand. Unfinished items roll
 * over to the next day with the date they were planned for.
 */
export function TodayPlanList({
  plan,
  compact = false,
  action,
}: {
  plan: TodayPlan;
  compact?: boolean;
  /** Shown beside the summary, e.g. the "Add from sheet" button. */
  action?: ReactNode;
}) {
  const [pending, start] = useTransition();
  const [title, setTitle] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const [items, apply] = useOptimistic(plan.items, (state, op: Op) => {
    if ("add" in op) return [...state, op.add];
    if (op.removed) return state.filter((i) => i.id !== op.id);
    return state.map((i) => (i.id === op.id ? { ...i, done: op.done ?? i.done } : i));
  });
  const done = items.filter((i) => i.done).length;
  const carried = items.filter((i) => i.day < plan.day && !i.done).length;
  const shown = compact ? items.slice(0, 6) : items;

  function toggle(item: PlanItem, el: HTMLElement) {
    if (item.auto) return; // solved today: stays done
    const next = !item.done;
    if (next) void burstFrom(el);
    start(async () => {
      apply({ id: item.id, done: next });
      const res = await setPlanItemDone(item.id, next);
      if (!res.ok) toast.error(res.error);
    });
  }

  function remove(item: PlanItem) {
    start(async () => {
      apply({ id: item.id, removed: true });
      const res = await removePlanItem(item.id);
      if (!res.ok) toast.error(res.error);
    });
  }

  function add() {
    const t = title.trim();
    if (!t) return;
    setTitle("");
    start(async () => {
      apply({
        add: {
          id: `tmp-${t}`,
          kind: "custom",
          title: t,
          url: null,
          detail: null,
          problemId: null,
          difficulty: null,
          done: false,
          auto: false,
          day: plan.day,
        },
      });
      const res = await addPlanTask(t);
      if (!res.ok) toast.error(res.error);
    });
    input.current?.focus();
  }

  return (
    <div className="flex flex-col gap-4">
      {items.length > 0 && done === items.length && <CelebrateOnce id={`plan-${plan.day}`} />}
      <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-3", compact && "hidden")}>
        <ProgressRing
          total={Math.max(1, items.length)}
          size={compact ? 64 : 84}
          stroke={compact ? 7 : 9}
          segments={[{ label: "Done", value: done, color: "var(--signal-mark)" }]}
          aria-label={`${done} of ${items.length} done today`}
        >
          <span className={cn("num", compact ? "text-17" : "text-20")}>
            {done}
            <span className="text-ink-3">/{items.length}</span>
          </span>
        </ProgressRing>
        <div className="min-w-0 flex-1">
          <p className="text-15 font-[600]">
            {items.length === 0
              ? "Nothing planned yet"
              : done === items.length
                ? "All done. Great day."
                : `${items.length - done} left today`}
          </p>
          <p className="text-12 text-ink-3">
            {items.length === 0
              ? compact
                ? "Pick from suggestions and your sheets on Today."
                : "Add suggestions or sheet problems, or write your own task below."
              : carried > 0
                ? `${carried} rolled over from earlier. Problems tick themselves when you solve or tick them.`
                : "Problems tick themselves when you solve them or tick them on a sheet."}
          </p>
        </div>
        {action}
      </div>

      <ul className="flex flex-col gap-1.5">
        {shown.map((item) => (
          <li
            key={item.id}
            className={cn(
              "group/item relative isolate flex items-center gap-3 rounded-[12px] border border-transparent px-2.5 py-2 transition-colors hover:border-line hover:bg-surface-2/60",
              "first:[&>.rail]:top-1/2 last:[&>.rail]:bottom-1/2",
            )}
          >
            {/* The day as a path: a rail joins the checkboxes, lime where it's done. */}
            <span
              aria-hidden="true"
              className={cn(
                "rail absolute top-0 bottom-0 left-[20px] -z-10 w-[2px]",
                item.done ? "bg-signal/70" : "bg-line-2",
              )}
            />
            <AnimatedCheckbox
              checked={item.done}
              disabled={item.auto || pending}
              aria-label={`${item.done ? "Undo" : "Done"}: ${item.title}`}
              title={item.auto ? "Solved today" : undefined}
              onClick={(e) => toggle(item, e.currentTarget)}
            />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                {item.problemId ? (
                  <Link
                    href={`/dashboard/problems/${item.problemId}`}
                    className={cn(
                      "truncate text-[13.5px] font-[550] hover:underline",
                      item.done && "line-through decoration-ink-4",
                    )}
                  >
                    {item.title}
                  </Link>
                ) : (
                  <span
                    className={cn(
                      "truncate text-[13.5px] font-[550]",
                      item.done && "line-through decoration-ink-4",
                    )}
                  >
                    {item.title}
                  </span>
                )}
                {item.difficulty && !compact && <DifficultyTag difficulty={item.difficulty} />}
              </span>
              {(item.detail || item.day < plan.day) && (
                <span className="flex min-w-0 items-center gap-1.5 text-11 text-ink-3">
                  {item.day < plan.day && (
                    <span
                      title={`Planned for ${dayLabel(item.day, plan.day)}, rolled over`}
                      className={cn(
                        "inline-flex shrink-0 items-center gap-1 font-[550]",
                        item.done ? "text-ink-3" : "text-medium",
                      )}
                    >
                      <CalendarClock size={11} aria-hidden="true" />
                      {dayLabel(item.day, plan.day)}
                    </span>
                  )}
                  {item.detail && <span className="truncate">{item.detail}</span>}
                </span>
              )}
            </span>
            <span className="hidden sm:inline-flex">
              <Tag tone={KIND[item.kind].tone} className="h-5 px-1.5 text-11">
                {KIND[item.kind].label}
              </Tag>
            </span>
            {item.url && (
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                aria-label={`Open ${item.title}`}
                className="grid size-7 shrink-0 place-items-center rounded-full text-ink-3 transition-colors hover:bg-surface-3 hover:text-ink"
              >
                <ArrowUpRight size={14} />
              </a>
            )}
            {!compact && (
              <button
                type="button"
                aria-label={`Remove ${item.title}`}
                onClick={() => remove(item)}
                className="grid size-7 shrink-0 place-items-center rounded-full text-ink-4 opacity-0 transition-[opacity,color] group-hover/item:opacity-100 hover:text-bad focus-visible:opacity-100"
              >
                <Trash2 size={13} />
              </button>
            )}
          </li>
        ))}
        {compact && items.length === 0 && (
          <li>
            <Link
              href="/dashboard/today"
              className="inline-flex items-center gap-1 px-2.5 text-12 font-[550] text-ink-2 underline-offset-4 hover:text-ink hover:underline"
            >
              Plan today <ArrowUpRight size={12} aria-hidden="true" />
            </Link>
          </li>
        )}
        {compact && items.length > shown.length && (
          <li className="px-2.5 text-12 text-ink-3">
            +{items.length - shown.length} more ·{" "}
            <Link href="/dashboard/today" className="underline hover:text-ink">
              open Today
            </Link>
          </li>
        )}
      </ul>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
        className="flex gap-2"
      >
        <label htmlFor={`task-${compact ? "c" : "f"}`} className="sr-only">
          Add a task
        </label>
        <input
          id={`task-${compact ? "c" : "f"}`}
          ref={input}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={140}
          placeholder="Add your own task, e.g. OS notes ch. 4"
          className={inputClasses({ className: "h-[38px] flex-1" })}
        />
        <Button
          type="submit"
          variant="secondary"
          size="icon"
          aria-label="Add task"
          disabled={!title.trim()}
        >
          <Plus size={16} data-nudge="plus" />
        </Button>
      </form>
    </div>
  );
}
