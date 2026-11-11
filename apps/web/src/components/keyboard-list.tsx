"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { CalendarPlus, Clock3, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@upsolve/ui";
import { addProblemsToPlan } from "@/app/actions/daily";
import { logReview, undoReview } from "@/app/actions/learning";
import { feel } from "@/lib/feel";

const ROW = "[data-krow]";

function typing(t: EventTarget | null) {
  const el = t as HTMLElement | null;
  return !!el?.closest("input, textarea, select, [contenteditable=''], [contenteditable='true']");
}

/**
 * Keyboard-first lists (FRONTEND-PLAN §7.6), for any rows marked data-krow (with
 * data-problem-id): j / k move a focus ring, Enter opens the row's link, x selects. With a
 * selection, a frosted bar offers bulk actions. Mounted once in the dashboard layout.
 */
export function KeyboardList() {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, start] = useTransition();

  useEffect(() => {
    const rows = () => Array.from(document.querySelectorAll<HTMLElement>(ROW));
    const focusRow = (el: HTMLElement | undefined) => {
      if (!el) return;
      el.tabIndex = -1;
      el.focus({ preventScroll: true });
      el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || typing(e.target)) return;
      if (document.querySelector("dialog[open], [role=dialog]")) return;
      const list = rows();
      if (list.length === 0) return;
      const at = list.indexOf(document.activeElement?.closest<HTMLElement>(ROW) as HTMLElement);
      const k = e.key.toLowerCase();
      if (k === "j" || k === "k") {
        e.preventDefault();
        focusRow(
          list[at < 0 ? 0 : Math.min(list.length - 1, Math.max(0, at + (k === "j" ? 1 : -1)))],
        );
        feel.tick();
      } else if (k === "x" && at >= 0) {
        e.preventDefault();
        const id = list[at]!.dataset.problemId;
        if (!id) return;
        setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
        feel.tick();
      } else if (e.key === "Enter" && at >= 0 && document.activeElement === list[at]) {
        const a = list[at]!.querySelector<HTMLAnchorElement>('a[href^="/"]');
        if (a) {
          e.preventDefault();
          router.push(a.getAttribute("href")!);
        }
      } else if (e.key === "Escape" && selected.length) {
        setSelected([]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, selected.length]);

  // Mirror the selection onto the rows (for their checked look).
  useEffect(() => {
    document.querySelectorAll<HTMLElement>(ROW).forEach((el) => {
      if (selected.includes(el.dataset.problemId ?? "")) el.dataset.selected = "";
      else delete el.dataset.selected;
    });
  }, [selected]);

  if (selected.length === 0) return null;
  const n = selected.length;
  return (
    <div
      role="toolbar"
      aria-label={`${n} selected`}
      className="glass-chrome fixed bottom-[92px] left-1/2 z-40 flex -translate-x-1/2 animate-[pop-open_var(--dur-base)_var(--ease-spring)] items-center gap-2 rounded-full py-1.5 pr-1.5 pl-4 text-13 lg:bottom-6"
    >
      <span className="font-[650] whitespace-nowrap">{n} selected</span>
      <Button
        size="sm"
        variant="secondary"
        loading={pending}
        onClick={() =>
          start(async () => {
            const r = await addProblemsToPlan(selected.slice(0, 6));
            if (!r.ok) return void toast.error(r.error);
            feel.success();
            toast.success(`Added ${Math.min(6, n)} to Today`);
            setSelected([]);
            router.refresh();
          })
        }
      >
        <CalendarPlus size={13} aria-hidden="true" /> Add to Today
      </Button>
      <Button
        size="sm"
        variant="secondary"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const ids = [...selected];
            await Promise.all(ids.map((id) => logReview(id, "snooze")));
            feel.soft();
            toast(`${ids.length} back tomorrow, same rung`, {
              action: {
                label: "Undo",
                onClick: () =>
                  void Promise.all(ids.map((id) => undoReview(id, "snooze"))).then(() =>
                    router.refresh(),
                  ),
              },
            });
            setSelected([]);
            router.refresh();
          })
        }
      >
        <Clock3 size={13} aria-hidden="true" /> Not today
      </Button>
      <Button
        size="icon-sm"
        variant="ghost"
        aria-label="Clear selection"
        onClick={() => setSelected([])}
      >
        <X size={14} aria-hidden="true" />
      </Button>
    </div>
  );
}
