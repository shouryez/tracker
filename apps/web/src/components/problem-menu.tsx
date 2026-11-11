"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import {
  CalendarPlus,
  Clock3,
  Copy,
  ExternalLink,
  Play,
  SquareArrowOutUpRight,
} from "lucide-react";
import { toast } from "sonner";
import { DifficultyTag } from "@upsolve/ui";
import { addProblemsToPlan } from "@/app/actions/daily";
import { logReview, undoReview } from "@/app/actions/learning";
import { getProblemPeek, type ProblemPeek } from "@/app/actions/peek";
import { feel } from "@/lib/feel";

const LINK = 'a[href^="/dashboard/problems/"]';
const idOf = (a: Element) =>
  /\/dashboard\/problems\/([0-9a-f-]{36})/.exec(a.getAttribute("href") ?? "")?.[1] ?? null;

const cache = new Map<string, Promise<ProblemPeek | null>>();
const peekOf = (id: string) => {
  if (!cache.has(id))
    cache.set(
      id,
      getProblemPeek(id).catch(() => null),
    );
  return cache.get(id)!;
};

/** Due by the end of tomorrow (worked out when a card or menu opens, not during render). */
const isDue = (p: ProblemPeek | null) => Boolean(p?.dueAt && p.dueAt <= Date.now() + 86_400_000);

const ago = (ms: number) => {
  const d = Math.floor((Date.now() - ms) / 86_400_000);
  return d <= 0 ? "today" : d === 1 ? "yesterday" : `${d} days ago`;
};
const mins = (ms: number) => `${Math.max(1, Math.round(ms / 60_000))} min`;
const reviewUrl = (url: string) => {
  const u = new URL(url);
  u.searchParams.set("upsolve", "review");
  return u.toString();
};

/**
 * Two global helpers for every problem link in the app (FRONTEND-PLAN §7.3–7.4):
 * - Peek: rest the mouse on a link for 400 ms to see difficulty, ring, last solved and your
 *   best time in a frosted card.
 * - Menu: right-click, long-press (touch), or the Menu key / Shift+F10 for Open, Re-solve,
 *   Add to Today, Not today and Copy link.
 * One delegated listener each; nothing is added to the links themselves.
 */
export function ProblemMenu() {
  const router = useRouter();
  const [peek, setPeek] = useState<{ p: ProblemPeek; x: number; y: number; due: boolean } | null>(
    null,
  );
  const [menu, setMenu] = useState<{
    id: string;
    href: string;
    x: number;
    y: number;
    p: ProblemPeek | null;
    due: boolean;
  } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const openMenu = useCallback(async (a: Element, x: number, y: number) => {
    const id = idOf(a);
    if (!id) return;
    setPeek(null);
    feel.tick();
    setMenu({ id, href: a.getAttribute("href")!, x, y, p: null, due: false });
    const p = await peekOf(id);
    setMenu((m) => (m && m.id === id ? { ...m, p, due: isDue(p) } : m));
  }, []);

  // Peek on hover (mouse only).
  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    let timer = 0;
    let current: Element | null = null;
    const onOver = (e: PointerEvent) => {
      const a = (e.target as Element | null)?.closest(LINK) ?? null;
      if (a === current) return;
      current = a;
      clearTimeout(timer);
      setPeek(null);
      const id = a && idOf(a);
      if (!a || !id) return;
      timer = window.setTimeout(async () => {
        const p = await peekOf(id);
        if (!p || current !== a) return;
        const r = a.getBoundingClientRect();
        setPeek({
          p,
          due: isDue(p),
          x: Math.min(r.left, innerWidth - 300),
          y: r.bottom + 8 > innerHeight - 160 ? r.top - 150 : r.bottom + 8,
        });
      }, 400);
    };
    const hide = () => {
      clearTimeout(timer);
      current = null;
      setPeek(null);
    };
    document.addEventListener("pointerover", onOver);
    window.addEventListener("scroll", hide, { passive: true });
    document.addEventListener("pointerdown", hide);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("pointerover", onOver);
      window.removeEventListener("scroll", hide);
      document.removeEventListener("pointerdown", hide);
    };
  }, []);

  // Right-click, long-press, keyboard.
  useEffect(() => {
    let press = 0;
    let suppressClick = false;
    const onContext = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest(LINK);
      if (!a || e.shiftKey) return; // Shift+right-click keeps the browser's own menu
      e.preventDefault();
      void openMenu(a, e.clientX, e.clientY);
    };
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "touch") return;
      const a = (e.target as Element | null)?.closest(LINK);
      if (!a) return;
      const { clientX, clientY } = e;
      press = window.setTimeout(() => {
        suppressClick = true;
        void openMenu(a, clientX, clientY);
      }, 500);
    };
    const cancel = () => clearTimeout(press);
    const onClick = (e: MouseEvent) => {
      if (suppressClick) {
        suppressClick = false;
        e.preventDefault();
        e.stopPropagation();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (!(e.key === "ContextMenu" || (e.shiftKey && e.key === "F10"))) return;
      const a = document.activeElement?.closest?.(LINK);
      if (!a) return;
      e.preventDefault();
      const r = a.getBoundingClientRect();
      void openMenu(a, r.left, r.bottom + 4);
    };
    document.addEventListener("contextmenu", onContext);
    document.addEventListener("pointerdown", onDown, { passive: true });
    document.addEventListener("pointerup", cancel);
    document.addEventListener("pointermove", cancel, { passive: true });
    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("contextmenu", onContext);
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("pointerup", cancel);
      document.removeEventListener("pointermove", cancel);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [openMenu]);

  // Menu: focus the first item; arrows move; Esc or a click outside closes.
  useEffect(() => {
    if (!menu) return;
    const el = menuRef.current;
    el?.querySelector<HTMLElement>("[role=menuitem]")?.focus();
    const onKey = (e: KeyboardEvent) => {
      const items = Array.from(el?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? []);
      const i = items.indexOf(document.activeElement as HTMLElement);
      if (e.key === "Escape") setMenu(null);
      else if (e.key === "ArrowDown") items[(i + 1) % items.length]?.focus();
      else if (e.key === "ArrowUp") items[(i - 1 + items.length) % items.length]?.focus();
      else return;
      e.preventDefault();
    };
    const onDown = (e: PointerEvent) => {
      if (!el?.contains(e.target as Node)) setMenu(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown, true);
    window.addEventListener("scroll", () => setMenu(null), { once: true, passive: true });
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown, true);
    };
  }, [menu]);

  const act = (fn: () => void) => () => {
    setMenu(null);
    fn();
  };

  if (!mounted) return null;
  return createPortal(
    <>
      {peek && !menu && (
        <div
          aria-hidden="true"
          className="glass-overlay pointer-events-none fixed z-[85] w-[280px] animate-[pop-open_var(--dur-fast)_var(--ease-out)] rounded-[16px] p-3.5 text-12"
          style={{ left: Math.max(12, peek.x), top: peek.y }}
        >
          <p className="line-clamp-2 text-14 font-[650] text-ink">{peek.p.title}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {peek.p.difficulty && <DifficultyTag difficulty={peek.p.difficulty} />}
            {peek.p.rung && (
              <span className="rounded-full bg-mint-soft px-2 py-0.5 font-[650] text-signal-text">
                Ring {peek.p.rung}
              </span>
            )}
          </div>
          <p className="mt-2 text-ink-2">
            {peek.p.lastAt ? `Last solved ${ago(peek.p.lastAt)}` : "Not solved yet"}
            {peek.p.bestMs ? ` · best ${mins(peek.p.bestMs)}` : ""}
            {peek.due ? " · due" : ""}
          </p>
          <p className="mt-1.5 text-11 text-ink-4">Right-click for actions</p>
        </div>
      )}
      {menu && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Problem actions"
          className="glass-overlay fixed z-[95] w-[230px] animate-[pop-open_var(--dur-fast)_var(--ease-spring)] rounded-[14px] p-1.5 text-13"
          style={{
            left: Math.min(menu.x, innerWidth - 240),
            top: Math.min(menu.y, innerHeight - 260),
          }}
        >
          <p className="truncate px-2.5 pt-1 pb-1.5 text-12 font-[600] text-ink-3">
            {menu.p?.title ?? "Problem"}
          </p>
          <MenuItem
            icon={<SquareArrowOutUpRight size={14} />}
            onClick={act(() => router.push(menu.href))}
          >
            Open
          </MenuItem>
          {menu.p?.url && (
            <MenuItem
              icon={<Play size={14} />}
              onClick={act(() => window.open(reviewUrl(menu.p!.url!), "_blank", "noopener"))}
            >
              Re-solve (timed as review)
            </MenuItem>
          )}
          <MenuItem
            icon={<CalendarPlus size={14} />}
            onClick={act(async () => {
              const r = await addProblemsToPlan([menu.id]);
              if (r.ok) {
                feel.success();
                toast.success("Added to Today");
                router.refresh();
              } else toast.error(r.error);
            })}
          >
            Add to Today
          </MenuItem>
          {menu.due && (
            <MenuItem
              icon={<Clock3 size={14} />}
              onClick={act(async () => {
                feel.soft();
                await logReview(menu.id, "snooze");
                toast("Back tomorrow, same rung", {
                  action: { label: "Undo", onClick: () => void undoReview(menu.id, "snooze") },
                });
                router.refresh();
              })}
            >
              Not today
            </MenuItem>
          )}
          <MenuItem
            icon={<ExternalLink size={14} />}
            onClick={act(() => window.open(menu.href, "_blank", "noopener"))}
          >
            Open in a new tab
          </MenuItem>
          <MenuItem
            icon={<Copy size={14} />}
            onClick={act(async () => {
              try {
                await navigator.clipboard.writeText(new URL(menu.href, location.origin).toString());
                toast.success("Link copied");
              } catch {
                toast.error("Couldn't copy the link");
              }
            })}
          >
            Copy link
          </MenuItem>
        </div>
      )}
    </>,
    document.body,
  );
}

function MenuItem({
  icon,
  children,
  onClick,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex h-9 w-full items-center gap-2.5 rounded-[9px] px-2.5 text-left text-ink-2 outline-none hover:bg-[color-mix(in_srgb,var(--ink)_8%,transparent)] hover:text-ink focus-visible:bg-[color-mix(in_srgb,var(--ink)_8%,transparent)] focus-visible:text-ink"
    >
      <span aria-hidden="true" className="text-ink-3">
        {icon}
      </span>
      {children}
    </button>
  );
}
