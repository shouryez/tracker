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
      className="group/search flex h-[40px] w-full max-w-[380px] flex-1 items-center gap-2.5 rounded-full border border-line bg-surface px-3.5 text-left text-[13px] text-ink-3 shadow-xs transition-[border-color,box-shadow] duration-[var(--dur-base)] hover:border-line-2 hover:shadow-sm"
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
