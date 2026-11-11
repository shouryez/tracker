"use client";

import { useEffect, useRef } from "react";
import { cn } from "@upsolve/ui";

/**
 * Sticky section nav with scroll-spy. The active section is the last one whose top has
 * passed the header line; at the bottom of the page the last section wins (short final
 * sections can never reach the top). Clicking a link marks it right away. Sets
 * data-active on the links directly (no re-render per scroll).
 */
export function SectionNav({
  groups,
}: {
  groups: { label: string; sections: { id: string; label: string }[] }[];
}) {
  const sections = groups.flatMap((g) => g.sections);
  const nav = useRef<HTMLElement>(null);
  useEffect(() => {
    const links = nav.current?.querySelectorAll<HTMLAnchorElement>("a[data-section]");
    if (!links) return;
    const mark = (id: string) =>
      links.forEach((l) => {
        if (l.dataset.section === id) l.dataset.active = "";
        else delete l.dataset.active;
      });
    let frame = 0;
    let lockUntil = 0;
    const update = () => {
      if (performance.now() < lockUntil) return;
      const els = sections
        .map((s) => document.getElementById(s.id))
        .filter((e): e is HTMLElement => !!e);
      if (els.length === 0) return;
      const atBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 8;
      if (atBottom) return mark(els.at(-1)!.id);
      let current = els[0]!.id;
      for (const el of els) if (el.getBoundingClientRect().top <= 140) current = el.id;
      mark(current);
    };
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest<HTMLAnchorElement>("a[data-section]");
      if (!a?.dataset.section) return;
      mark(a.dataset.section);
      // Keep the clicked item while the page scrolls there.
      lockUntil = performance.now() + 900;
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    nav.current?.addEventListener("click", onClick);
    const el = nav.current;
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      el?.removeEventListener("click", onClick);
    };
  }, [sections]);

  return (
    <nav
      ref={nav}
      aria-label="Settings sections"
      className="glass sticky top-[64px] z-20 -mx-1 flex gap-1 self-start overflow-x-auto rounded-[16px] p-1 lg:top-[32px] lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-none"
    >
      {groups.map((g) => (
        <div key={g.label} className="contents lg:flex lg:flex-col lg:gap-0.5">
          <p className="hidden px-3 pt-4 pb-1.5 text-[11.5px] font-[600] tracking-[0.06em] text-ink-3 first:pt-0 lg:block">
            {g.label}
          </p>
          {g.sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              data-section={s.id}
              className={cn(
                "relative shrink-0 rounded-[12px] px-3 py-2 text-[13.5px] whitespace-nowrap text-ink-2 transition-colors hover:bg-[color-mix(in_srgb,var(--ink)_6%,transparent)] hover:text-ink",
                "data-[active]:bg-[color-mix(in_srgb,var(--ink)_8%,transparent)] data-[active]:font-[600] data-[active]:text-ink",
                "before:absolute before:top-2 before:bottom-2 before:left-0 before:w-[3px] before:scale-y-0 before:rounded-r-full before:bg-primary before:transition-transform max-lg:before:hidden data-[active]:before:scale-y-100",
              )}
            >
              {s.label}
            </a>
          ))}
        </div>
      ))}
    </nav>
  );
}
