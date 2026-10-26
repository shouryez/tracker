"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

/** Header search: problems, sheets and topics. Ctrl/⌘ K focuses it. */
export function SearchBox() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        input.current?.focus();
        input.current?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const q = input.current?.value.trim() ?? "";
        if (q) router.push(`/dashboard/search?q=${encodeURIComponent(q)}`);
      }}
      className="hidden h-[38px] max-w-[360px] flex-1 items-center gap-2 rounded-full border border-line bg-surface px-3.5 text-[13px] text-ink-3 focus-within:border-ink-3 sm:flex"
    >
      <Search size={14} aria-hidden="true" />
      <label htmlFor="global-search" className="sr-only">
        Search problems, topics, sheets
      </label>
      <input
        ref={input}
        id="global-search"
        name="q"
        type="search"
        maxLength={100}
        placeholder="Search problems, topics, sheets"
        className="min-w-0 flex-1 bg-transparent text-ink placeholder:text-ink-3 focus:outline-none"
      />
      <kbd className="rounded-[5px] border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-[10.5px]">
        Ctrl K
      </kbd>
    </form>
  );
}
