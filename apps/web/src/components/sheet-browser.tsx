"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronRight, ExternalLink, Search } from "lucide-react";
import { DifficultyTag, Tag, cn } from "@upsolve/ui";
import type { SheetItemView } from "@/lib/sheets-data";
import { SegmentedProgress } from "./progress";
import { ItemTick } from "./sheets";

type Status = "all" | "todo" | "done";

const SITE: Record<SheetItemView["links"][number]["site"], { label: string; dot: string }> = {
  leetcode: { label: "LeetCode", dot: "bg-medium" },
  geeksforgeeks: { label: "GFG", dot: "bg-easy" },
  takeuforward: { label: "TUF", dot: "bg-primary" },
  source: { label: "Source", dot: "bg-ink-3" },
};

const TIER_ORDER = ["easy", "medium", "hard", "basic", "core", "pro"];

/** Searchable, filterable sheet: one collapsible table per step. */
export function SheetBrowser({ sheetId, items }: { sheetId: string; items: SheetItemView[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status>("all");
  const [tiers, setTiers] = useState<string[]>([]);
  const [open, setOpen] = useState<Set<string>>(() => {
    const first = items.find((i) => !i.status)?.step ?? items[0]?.step;
    return new Set(first ? [first] : []);
  });

  const availableTiers = useMemo(
    () =>
      [...new Set(items.map((i) => i.tier).filter((t): t is string => !!t))].sort(
        (a, b) => TIER_ORDER.indexOf(a) - TIER_ORDER.indexOf(b),
      ),
    [items],
  );

  // Number every item once, in sheet order, so numbers stay stable while filtering.
  const numbered = useMemo(() => items.map((item, i) => ({ item, n: i + 1 })), [items]);

  const q = query.trim().toLowerCase();
  const filtering = q !== "" || status !== "all" || tiers.length > 0;
  const visible = numbered.filter(({ item }) => {
    if (q && !item.title.toLowerCase().includes(q) && !item.section?.toLowerCase().includes(q)) {
      return false;
    }
    if (status === "todo" && item.status) return false;
    if (status === "done" && !item.status) return false;
    if (tiers.length && (!item.tier || !tiers.includes(item.tier))) return false;
    return true;
  });

  const steps: { name: string; all: SheetItemView[]; rows: typeof visible }[] = [];
  for (const item of items) {
    if (steps.at(-1)?.name !== item.step) steps.push({ name: item.step, all: [], rows: [] });
    steps.at(-1)!.all.push(item);
  }
  for (const row of visible) steps.find((s) => s.name === row.item.step)!.rows.push(row);

  const toggle = (name: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-wrap items-center gap-2.5">
        <label className="relative min-w-[220px] flex-1">
          <span className="sr-only">Search problems</span>
          <Search
            size={14}
            aria-hidden="true"
            className="absolute top-1/2 left-3 -translate-y-1/2 text-ink-3"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search problems or topics"
            className="h-[36px] w-full rounded-full border border-line-2 bg-surface pr-3.5 pl-9 text-[13px] text-ink outline-none transition-[border-color,box-shadow] duration-[240ms] placeholder:text-ink-3 focus:border-primary focus:shadow-[0_0_0_4px_var(--primary-soft)]"
          />
        </label>

        <div
          role="radiogroup"
          aria-label="Status"
          className="inline-flex rounded-full border border-line bg-surface-2 p-[3px]"
        >
          {(["all", "todo", "done"] as const).map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={status === s}
              onClick={() => setStatus(s)}
              className={cn(
                "h-[28px] rounded-full px-3 text-[12.5px] transition-colors duration-[240ms]",
                status === s ? "bg-surface text-ink shadow-card" : "text-ink-2 hover:text-ink",
              )}
            >
              {s === "all" ? "All" : s === "todo" ? "To do" : "Done"}
            </button>
          ))}
        </div>

        {availableTiers.length > 0 && (
          <div className="flex flex-wrap gap-1.5" aria-label="Difficulty">
            {availableTiers.map((t) => {
              const on = tiers.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setTiers((ts) => (on ? ts.filter((x) => x !== t) : [...ts, t]))}
                  className={cn(
                    "h-[28px] rounded-full border px-3 font-mono text-[11.5px] capitalize transition-colors duration-[240ms]",
                    on
                      ? "border-transparent bg-ink text-bg"
                      : "border-line-2 text-ink-2 hover:text-ink",
                  )}
                >
                  {t}
                </button>
              );
            })}
          </div>
        )}

        <button
          type="button"
          onClick={() =>
            setOpen((prev) =>
              prev.size === steps.length ? new Set() : new Set(steps.map((s) => s.name)),
            )
          }
          className="ml-auto font-mono text-[11.5px] text-ink-3 hover:text-ink"
        >
          {open.size === steps.length ? "Collapse all" : "Expand all"}
        </button>
      </div>

      {filtering && (
        <p className="font-mono text-[11.5px] text-ink-3">
          {visible.length} of {items.length} problems match
        </p>
      )}

      {steps.map((step) => {
        if (filtering && step.rows.length === 0) return null;
        const done = step.all.filter((i) => i.status).length;
        const isOpen = filtering || open.has(step.name);
        return (
          <section
            key={step.name}
            className="overflow-hidden rounded-lg border border-line bg-surface shadow-card"
          >
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => toggle(step.name)}
              className="flex w-full items-center gap-3 px-[18px] py-3.5 text-left"
            >
              <ChevronRight
                size={15}
                aria-hidden="true"
                className={cn(
                  "shrink-0 text-ink-3 transition-transform duration-[240ms]",
                  isOpen && "rotate-90",
                )}
              />
              <span className="min-w-0 flex-1 truncate text-[14px] font-[550]">{step.name}</span>
              <SegmentedProgress
                done={done}
                total={step.all.length}
                segments={12}
                className="hidden w-32 sm:grid"
              />
              <span className="w-14 text-right font-mono text-[11.5px] text-ink-3">
                {done}/{step.all.length}
              </span>
            </button>

            {isOpen && (
              <table className="w-full border-t border-line text-[13.5px]">
                <thead className="sr-only sm:not-sr-only">
                  <tr className="font-mono text-[10.5px] tracking-[.08em] text-ink-3 uppercase">
                    <th scope="col" className="w-12 py-2 pl-[18px] text-left font-medium">
                      <span className="sr-only">Done</span>
                    </th>
                    <th
                      scope="col"
                      className="hidden w-12 py-2 text-left font-medium sm:table-cell"
                    >
                      #
                    </th>
                    <th scope="col" className="py-2 text-left font-medium">
                      Problem
                    </th>
                    <th
                      scope="col"
                      className="hidden w-24 py-2 text-left font-medium md:table-cell"
                    >
                      Level
                    </th>
                    <th scope="col" className="py-2 pr-[18px] text-right font-medium">
                      Solve on
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {step.rows.map(({ item, n }, i) => {
                    const prev = step.rows[i - 1]?.item;
                    const showSection = item.section && item.section !== prev?.section;
                    return [
                      showSection && (
                        <tr key={`${item.itemKey}-section`}>
                          <td
                            colSpan={5}
                            className="px-[18px] pt-4 pb-1.5 font-mono text-[10.5px] tracking-[.08em] text-ink-3 uppercase"
                          >
                            {item.section}
                          </td>
                        </tr>
                      ),
                      <tr
                        key={item.itemKey}
                        className="border-t border-dashed border-line-2 transition-colors duration-[120ms] hover:bg-surface-2/60"
                      >
                        <td className="py-2.5 pl-[18px] align-middle">
                          <ItemTick
                            sheetId={sheetId}
                            itemKey={item.itemKey}
                            status={item.status}
                            title={item.title}
                          />
                        </td>
                        <td className="hidden py-2.5 align-middle font-mono text-[11.5px] text-ink-3 sm:table-cell">
                          {n}
                        </td>
                        <td className="py-2.5 pr-3 align-middle">
                          {item.problemId ? (
                            <Link
                              href={`/dashboard/problems/${item.problemId}`}
                              className={cn("hover:underline", item.status && "text-ink-3")}
                            >
                              {item.title}
                            </Link>
                          ) : (
                            <a
                              href={item.url ?? undefined}
                              target="_blank"
                              rel="noreferrer"
                              className={cn("hover:underline", item.status && "text-ink-3")}
                            >
                              {item.title}
                            </a>
                          )}
                          {item.kind === "learning" && (
                            <Tag mono className="ml-2 align-middle">
                              read
                            </Tag>
                          )}
                          {!item.tracked && item.kind === "practice" && (
                            <span
                              className="ml-2 font-mono text-[10.5px] text-ink-3"
                              title="We can't detect this one yet; tick it yourself"
                            >
                              manual
                            </span>
                          )}
                        </td>
                        <td className="hidden py-2.5 align-middle md:table-cell">
                          <TierTag tier={item.tier} />
                        </td>
                        <td className="py-2.5 pr-[18px] align-middle">
                          <div className="flex justify-end gap-1.5">
                            {item.links.map((link) => (
                              <a
                                key={link.site}
                                href={link.url}
                                target="_blank"
                                rel="noreferrer"
                                title={`Open on ${SITE[link.site].label}`}
                                className="inline-flex h-[24px] items-center gap-1.5 rounded-full border border-line-2 px-2 font-mono text-[11px] text-ink-2 transition-colors duration-[240ms] hover:border-ink-3 hover:text-ink"
                              >
                                <span
                                  aria-hidden="true"
                                  className={cn("size-1.5 rounded-full", SITE[link.site].dot)}
                                />
                                {SITE[link.site].label}
                                <ExternalLink
                                  size={10}
                                  aria-hidden="true"
                                  className="hidden sm:block"
                                />
                              </a>
                            ))}
                          </div>
                        </td>
                      </tr>,
                    ];
                  })}
                </tbody>
              </table>
            )}
          </section>
        );
      })}
    </div>
  );
}

function TierTag({ tier }: { tier: string | null }) {
  if (tier === "easy" || tier === "medium" || tier === "hard")
    return <DifficultyTag difficulty={tier} />;
  return tier ? (
    <Tag mono className="capitalize">
      {tier}
    </Tag>
  ) : null;
}
