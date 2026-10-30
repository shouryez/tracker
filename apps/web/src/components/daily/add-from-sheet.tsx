"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, ListPlus } from "lucide-react";
import { cn } from "@upsolve/ui";

/** Lime-tinted, so it's easy to spot next to the list without competing with the page CTA. */
const pill =
  "inline-flex h-[34px] shrink-0 items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--signal)_55%,transparent)] bg-[color-mix(in_srgb,var(--signal)_14%,transparent)] px-3.5 text-13 font-[650] text-ink shadow-[0_0_0_3px_color-mix(in_srgb,var(--signal)_8%,transparent)] transition-[background-color,border-color,transform] duration-[var(--dur-base)] hover:border-signal hover:bg-[color-mix(in_srgb,var(--signal)_24%,transparent)] active:scale-[.97]";

/**
 * "Add from sheet": opens a followed sheet in pick mode, where you tick the problems you want
 * on today's list. With several sheets it asks which one first.
 */
export function AddFromSheet({ sheets }: { sheets: { slug: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent | KeyboardEvent) => {
      if (
        e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.contains(e.target as Node)
      )
        setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const icon = <ListPlus size={15} aria-hidden="true" className="text-[var(--signal-mark)]" />;

  if (sheets.length <= 1) {
    return (
      <Link
        href={sheets[0] ? `/dashboard/sheets/${sheets[0].slug}?pick=1` : "/dashboard/sheets"}
        className={pill}
      >
        {icon} Add from sheet
      </Link>
    );
  }

  return (
    <div ref={box} className="relative shrink-0">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((o) => !o)}
        className={pill}
      >
        {icon} Add from sheet
        <ChevronDown
          size={13}
          aria-hidden="true"
          className={cn("transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <div
          role="menu"
          className="glass absolute top-full right-0 z-50 mt-1.5 w-60 origin-top-right animate-[pop-open_var(--dur-base)_var(--ease-out)] rounded-[16px] border border-line-2 p-1.5 shadow-e3"
        >
          <p className="px-2.5 pt-1 pb-1.5 label-mono">Pick problems from</p>
          {sheets.map((s) => (
            <Link
              key={s.slug}
              role="menuitem"
              href={`/dashboard/sheets/${s.slug}?pick=1`}
              onClick={() => setOpen(false)}
              className="block truncate rounded-[10px] px-2.5 py-2 text-13 font-[550] transition-colors hover:bg-surface-3"
            >
              {s.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// DsaKaro
