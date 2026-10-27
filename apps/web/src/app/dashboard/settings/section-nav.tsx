"use client";

import { useEffect, useRef } from "react";
import { cn } from "@upsolve/ui";

/**
 * Sticky section nav with scroll-spy: the link for the section in view gets the active
 * pill. Sets data-active on the links directly (no re-render per scroll).
 */
export function SectionNav({ sections }: { sections: { id: string; label: string }[] }) {
  const nav = useRef<HTMLElement>(null);
  useEffect(() => {
    const links = nav.current?.querySelectorAll<HTMLAnchorElement>("a[data-section]");
    if (!links) return;
    const mark = (id: string) =>
      links.forEach((l) => {
        if (l.dataset.section === id) l.dataset.active = "";
        else delete l.dataset.active;
      });
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) mark(visible.target.id);
      },
      { rootMargin: "-90px 0px -60% 0px" },
    );
    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) io.observe(el);
    });
    mark(sections[0]?.id ?? "");
    return () => io.disconnect();
  }, [sections]);

  return (
    <nav
      ref={nav}
      aria-label="Settings sections"
      className="sticky top-[84px] hidden flex-col gap-0.5 self-start lg:flex"
    >
      {sections.map((s) => (
        <a
          key={s.id}
          href={`#${s.id}`}
          data-section={s.id}
          className={cn(
            "relative rounded-[10px] px-3 py-2 text-13 text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink",
            "data-[active]:bg-surface-3 data-[active]:font-[600] data-[active]:text-ink",
            "before:absolute before:top-2 before:bottom-2 before:left-0 before:w-[3px] before:scale-y-0 before:rounded-r-full before:bg-signal before:transition-transform data-[active]:before:scale-y-100",
          )}
        >
          {s.label}
        </a>
      ))}
    </nav>
  );
}
