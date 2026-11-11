"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn, inputClasses } from "@upsolve/ui";

export type SelectOption = { value: string; label: string; hint?: string };

/**
 * Custom select / combobox: a popover that springs open from its trigger, with search
 * (when there are more than 7 options), a check on the selected option and full keyboard
 * navigation. Renders a hidden input with `name`, so it drops into existing forms.
 */
export function Select({
  options,
  value,
  onChange,
  name,
  placeholder = "Choose…",
  label,
  className,
  disabled,
}: {
  options: SelectOption[];
  value: string;
  onChange?: (v: string) => void;
  name?: string;
  placeholder?: string;
  /** Accessible name for the trigger. */
  label: string;
  className?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [current, setCurrent] = useState(value);
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const id = useId();

  const searchable = options.length > 7;
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  }, [options, query]);
  const selected = options.find((o) => o.value === current);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  useEffect(() => {
    list.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({
      block: "nearest",
    });
  }, [active]);

  function choose(v: string) {
    setCurrent(v);
    onChange?.(v);
    setOpen(false);
    setQuery("");
  }

  function openList() {
    setActive(
      Math.max(
        0,
        shown.findIndex((o) => o.value === current),
      ),
    );
    setOpen(true);
  }

  function onKey(e: React.KeyboardEvent) {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      openList();
      return;
    }
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(shown.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const o = shown[active];
      if (o) choose(o.value);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={root} className={cn("relative", className)} onKeyDown={onKey}>
      {name && <input type="hidden" name={name} value={current} />}
      <button
        type="button"
        disabled={disabled}
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        onClick={() => (open ? setOpen(false) : openList())}
        className={cn(inputClasses(), "flex items-center justify-between gap-2 text-left")}
      >
        <span className={cn("truncate", !selected && "text-ink-4")}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          size={15}
          aria-hidden="true"
          className={cn(
            "shrink-0 text-ink-3 transition-transform duration-[var(--dur-base)]",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div className="glass-overlay absolute top-full left-0 z-50 mt-1.5 w-full min-w-[220px] origin-top animate-[pop-open_var(--dur-base)_var(--ease-spring)] overflow-hidden rounded-[14px]">
          {searchable && (
            <div className="relative border-b border-line p-1.5">
              <Search
                size={14}
                aria-hidden="true"
                className="absolute top-1/2 left-4 -translate-y-1/2 text-ink-3"
              />
              <input
                autoFocus
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                placeholder="Search…"
                aria-label="Search options"
                aria-controls={`${id}-list`}
                className="h-9 w-full rounded-[10px] bg-surface-2 pr-3 pl-8 text-13 outline-none placeholder:text-ink-4"
              />
            </div>
          )}
          <ul
            ref={list}
            id={`${id}-list`}
            role="listbox"
            aria-label={label}
            className="max-h-64 overflow-y-auto p-1.5"
          >
            {shown.length === 0 && <li className="px-3 py-2 text-13 text-ink-3">No matches</li>}
            {shown.map((o, i) => {
              const isSel = o.value === current;
              return (
                <li
                  key={o.value}
                  data-index={i}
                  role="option"
                  aria-selected={isSel}
                  onPointerEnter={() => setActive(i)}
                  onClick={() => choose(o.value)}
                  className={cn(
                    "flex cursor-pointer items-center justify-between gap-3 rounded-[9px] px-2.5 py-2 text-13",
                    i === active ? "bg-surface-3 text-ink" : "text-ink-2",
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate">{o.label}</span>
                    {o.hint && <span className="block truncate text-11 text-ink-3">{o.hint}</span>}
                  </span>
                  {isSel && (
                    <Check size={14} aria-hidden="true" className="shrink-0 text-signal-text" />
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
