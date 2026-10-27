"use client";

import { Search } from "lucide-react";
import { Kbd } from "@upsolve/ui";
import { openCommandPalette } from "@/components/command-palette";

/** Looks like a search field; opens the command palette (Ctrl/⌘ K). */
export function SearchBox() {
  return (
    <button
      type="button"
      onClick={openCommandPalette}
      aria-label="Search problems, pages and commands (Ctrl K)"
      className="group/search flex h-10 w-full max-w-[400px] flex-1 items-center gap-2.5 rounded-full border border-line-2 bg-surface-2/70 px-3.5 text-left text-13 text-ink-3 shadow-inset transition-[border-color,box-shadow,background-color] duration-[var(--dur-base)] hover:border-line-3 hover:bg-surface-2 hover:text-ink-2"
    >
      <Search
        size={15}
        aria-hidden="true"
        className="transition-transform duration-[var(--dur-base)] group-hover/search:scale-110"
      />
      <span className="flex-1 truncate">Search problems, pages, commands</span>
      <Kbd className="hidden sm:inline-flex">Ctrl K</Kbd>
    </button>
  );
}
