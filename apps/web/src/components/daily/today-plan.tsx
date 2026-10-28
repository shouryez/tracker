"use client";

import Link from "next/link";
import { useOptimistic, useRef, useState, useTransition } from "react";
import { ArrowUpRight, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button, DifficultyTag, ProgressRing, Tag, cn, inputClasses } from "@upsolve/ui";
import { addPlanTask, removePlanItem, setPlanItemDone } from "@/app/actions/daily";
import { CelebrateOnce, burstFrom } from "@/components/dashboard/celebrate";
import { AnimatedCheckbox } from "@/components/fx/toggles";
import type { PlanItem, PlanKind, TodayPlan } from "@/lib/plan";

const KIND: Record<
  PlanKind,
  { label: string; tone: "revise" | "primary" | "medium" | "info" | "signal" | "hard" | "neutral" }
> = {
  revision: { label: "Revision", tone: "revise" },
  next: { label: "Next", tone: "primary" },
  stretch: { label: "Stretch", tone: "medium" },
  shared: { label: "From a friend", tone: "info" },
  contest: { label: "Contest", tone: "signal" },
  drill: { label: "Drill", tone: "hard" },
  custom: { label: "Task", tone: "neutral" },
};

type Op = { id: string; done?: boolean; removed?: boolean } | { add: PlanItem };

/**
 * Today plan: suggested quests plus your own tasks. Problem items tick themselves when
 * you solve them (the extension or a sync reports Accepted); anything can be ticked by hand.
 */
export function TodayPlanList({ plan, compact = false }: { plan: TodayPlan; compact?: boolean }) {
  const [pending, start] = useTransition();
  const [title, setTitle] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const [items, apply] = useOptimistic(plan.items, (state, op: Op) => {
    if ("add" in op) return [...state, op.add];
    if (op.removed) return state.filter((i) => i.id !== op.id);
    return state.map((i) => (i.id === op.id ? { ...i, done: op.done ?? i.done } : i));
  });
  const done = items.filter((i) => i.done).length;
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
      <div className="flex items-center gap-4">
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
        <div className="min-w-0">
          <p className="text-15 font-[600]">
            {items.length === 0
              ? "Nothing planned yet"
              : done === items.length
                ? "All done. Great day."
                : `${items.length - done} left today`}
          </p>
          <p className="text-12 text-ink-3">Problems tick themselves when you solve them.</p>
        </div>
      </div>

      <ul className="flex flex-col gap-1.5">
        {shown.map((item) => (
          <li
            key={item.id}
            className={cn(
              "group/item flex items-center gap-3 rounded-[12px] border border-transparent px-2.5 py-2 transition-colors hover:border-line hover:bg-surface-2/60",
              item.done && "opacity-70",
            )}
          >
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
              {item.detail && (
                <span className="block truncate text-11 text-ink-3">{item.detail}</span>
              )}
            </span>
            <Tag tone={KIND[item.kind].tone} className="hidden h-5 px-1.5 text-11 sm:inline-flex">
              {KIND[item.kind].label}
            </Tag>
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
