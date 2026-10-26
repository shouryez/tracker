"use client";

import { useId, useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { cn } from "@upsolve/ui";

export type TabItem = { id: string; label: string; count?: number; content: ReactNode };

/** Tabs with a pill that slides to the active tab. Arrow keys move between tabs. */
export function Tabs({ items, className }: { items: TabItem[]; className?: string }) {
  const [active, setActive] = useState(items[0]?.id);
  const base = useId();
  const current = items.find((t) => t.id === active) ?? items[0];

  return (
    <div className={className}>
      <div
        role="tablist"
        className="relative isolate mb-4 inline-flex rounded-full border border-line bg-surface-2 p-[3px]"
        onKeyDown={(e) => {
          if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
          const i = items.findIndex((t) => t.id === active);
          const next = items[(i + (e.key === "ArrowRight" ? 1 : items.length - 1)) % items.length]!;
          setActive(next.id);
          document.getElementById(`${base}-tab-${next.id}`)?.focus();
        }}
      >
        {items.map((t) => {
          const on = t.id === current?.id;
          return (
            <button
              key={t.id}
              id={`${base}-tab-${t.id}`}
              type="button"
              role="tab"
              aria-selected={on}
              aria-controls={`${base}-panel-${t.id}`}
              tabIndex={on ? 0 : -1}
              onClick={() => setActive(t.id)}
              className={cn(
                "relative inline-flex h-[30px] items-center gap-1.5 rounded-full px-3.5 text-[13px] transition-colors duration-[var(--dur-base)]",
                on ? "text-ink" : "text-ink-2 hover:text-ink",
              )}
            >
              {on && (
                <motion.span
                  layoutId={`${base}-pill`}
                  transition={{ type: "spring", stiffness: 500, damping: 38 }}
                  className="absolute inset-0 -z-10 rounded-full bg-surface shadow-sm"
                />
              )}
              {t.label}
              {t.count !== undefined && (
                <span className="font-mono text-[11px] text-ink-3">{t.count}</span>
              )}
            </button>
          );
        })}
      </div>
      {current && (
        <div
          key={current.id}
          id={`${base}-panel-${current.id}`}
          role="tabpanel"
          aria-labelledby={`${base}-tab-${current.id}`}
          className="animate-page"
        >
          {current.content}
        </div>
      )}
    </div>
  );
}
