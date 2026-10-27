"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { Check, ChevronRight, NotebookPen, PanelRight, Play, Search, X } from "lucide-react";
import { motion } from "motion/react";
import {
  DifficultyTag,
  Kbd,
  LevelChip,
  ProgressRing,
  StatusBadge,
  Tag,
  Tooltip,
  cn,
} from "@upsolve/ui";
import { setSheetItemStarred } from "@/app/actions/sheets";
import type { SheetItemView } from "@/lib/sheets-data";
import { StarToggle } from "./fx/toggles";
import { NoteEditor } from "./note-editor";
import { ItemTick } from "./sheets";
import { PlatformMark, parseYouTube, type PlatformId } from "./site-icons";

type Status = "all" | "todo" | "done" | "starred" | "due";
type Site = SheetItemView["links"][number]["site"];

/** Revision state of a solved, tracked item (keyed by problem id). */
export type ItemReview = { due: boolean; step: number };

const TIER_ORDER = ["easy", "medium", "hard", "basic", "core", "pro"];
const STATUS_LABEL: Record<Status, string> = {
  all: "All",
  todo: "To do",
  done: "Done",
  starred: "Starred",
  due: "Revise",
};

/** Searchable, filterable sheet: Step → section → problems, each with every link it has. */
export function SheetBrowser({
  sheetId,
  items,
  reviews,
}: {
  sheetId: string;
  items: SheetItemView[];
  reviews: Record<string, ItemReview>;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status>("all");
  const [tiers, setTiers] = useState<string[]>([]);
  const [stars, setStars] = useState(
    () => new Set(items.filter((i) => i.starred).map((i) => i.itemKey)),
  );
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [video, setVideo] = useState<{ url: string; title: string } | null>(null);
  const [highlight, setHighlight] = useState<string | null>(null);
  const continueItem =
    items.find((i) => !i.status && i.kind === "practice") ?? items.find((i) => !i.status);
  const [open, setOpen] = useState<Set<string>>(() => {
    const first = continueItem?.step ?? items[0]?.step;
    return new Set(first ? [first] : []);
  });
  const [closedSections, setClosedSections] = useState<Set<string>>(new Set());

  const reviewOf = (i: SheetItemView) =>
    i.problemId && i.status ? reviews[i.problemId] : undefined;
  const dueCount = items.filter((i) => reviewOf(i)?.due).length;

  const availableTiers = useMemo(
    () =>
      [...new Set(items.map((i) => i.tier).filter((t): t is string => !!t))].sort(
        (a, b) => TIER_ORDER.indexOf(a) - TIER_ORDER.indexOf(b),
      ),
    [items],
  );

  const q = query.trim().toLowerCase();
  const filtering = q !== "" || status !== "all" || tiers.length > 0;
  const matches = (item: SheetItemView) => {
    if (q && !item.title.toLowerCase().includes(q) && !item.section?.toLowerCase().includes(q)) {
      return false;
    }
    if (status === "todo" && item.status) return false;
    if (status === "done" && !item.status) return false;
    if (status === "starred" && !stars.has(item.itemKey)) return false;
    if (status === "due" && !reviewOf(item)?.due) return false;
    if (tiers.length && (!item.tier || !tiers.includes(item.tier))) return false;
    return true;
  };

  // Step → section → items, in sheet order.
  type Group = { name: string; items: SheetItemView[] };
  const steps: { name: string; all: SheetItemView[]; sections: Group[] }[] = [];
  for (const item of items) {
    if (steps.at(-1)?.name !== item.step) steps.push({ name: item.step, all: [], sections: [] });
    const step = steps.at(-1)!;
    step.all.push(item);
    const section = item.section ?? "";
    if (step.sections.at(-1)?.name !== section) step.sections.push({ name: section, items: [] });
    step.sections.at(-1)!.items.push(item);
  }
  const visibleCount = items.filter(matches).length;

  const toggle = (set: typeof setOpen, key: string) =>
    set((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  // "/" focuses the search box (unless you're already typing somewhere).
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.key !== "/" || t?.closest("input, textarea, [contenteditable]")) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const doneAll = items.filter((i) => i.status).length;

  // "Continue" scrolls to the item once its step has rendered.
  useEffect(() => {
    if (!highlight) return;
    document
      .getElementById(`item-${highlight}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
    const t = setTimeout(() => setHighlight(null), 2400);
    return () => clearTimeout(t);
  }, [highlight]);

  return (
    <div className="flex flex-col gap-3.5">
      {continueItem && (
        <button
          type="button"
          onClick={() => {
            setQuery("");
            setStatus("all");
            setTiers([]);
            setOpen((prev) => new Set([...prev, continueItem.step]));
            setClosedSections((prev) => {
              const next = new Set(prev);
              next.delete(`${continueItem.step}::${continueItem.section ?? ""}`);
              return next;
            });
            setHighlight(continueItem.itemKey);
          }}
          className="group/continue surface-card relative isolate flex items-center gap-4 overflow-hidden rounded-lg px-[18px] py-3.5 text-left transition-[border-color,transform] duration-[var(--dur-base)] hover:-translate-y-0.5 hover:border-line-2"
        >
          <span
            aria-hidden="true"
            className="absolute inset-0 -z-10 animate-aurora bg-[radial-gradient(60%_120%_at_0%_50%,color-mix(in_srgb,var(--signal)_14%,transparent),transparent_70%),radial-gradient(50%_120%_at_100%_50%,color-mix(in_srgb,var(--violet)_16%,transparent),transparent_70%)] motion-reduce:animate-none"
          />
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-signal text-signal-ink shadow-glow-signal transition-transform duration-[var(--dur-base)] group-hover/continue:scale-110">
            <Play size={16} aria-hidden="true" className="translate-x-px fill-current" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block label-mono">Continue where you left off</span>
            <span className="block truncate text-16 font-[600]">{continueItem.title}</span>
            <span className="block truncate text-12 text-ink-3">
              {continueItem.step}
              {continueItem.section ? ` › ${continueItem.section}` : ""}
            </span>
          </span>
          <ProgressRing
            total={Math.max(1, items.length)}
            size={52}
            stroke={6}
            className="hidden sm:grid"
            segments={[{ label: "Done", value: doneAll, color: "var(--violet)" }]}
            aria-label={`${doneAll} of ${items.length} done`}
          >
            <span className="tnum text-[10px] text-ink-2">
              {Math.round((doneAll / Math.max(1, items.length)) * 100)}%
            </span>
          </ProgressRing>
        </button>
      )}

      <div className="glass z-30 -mx-1 flex flex-wrap items-center gap-2.5 rounded-[18px] border border-line px-2.5 py-2 shadow-e1 md:sticky md:top-[64px]">
        <label className="relative min-w-[200px] flex-1">
          <span className="sr-only">Search problems</span>
          <Search
            size={14}
            aria-hidden="true"
            className="absolute top-1/2 left-3 -translate-y-1/2 text-ink-3"
          />
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search problems or topics"
            className="h-[36px] w-full rounded-full border border-line-2 bg-surface-2 pr-10 pl-9 text-13 text-ink shadow-inset outline-none transition-[border-color,box-shadow] duration-[var(--dur-base)] placeholder:text-ink-4 focus:border-signal-2 focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--signal)_16%,transparent)]"
          />
          <Kbd className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2">/</Kbd>
        </label>

        <div
          role="radiogroup"
          aria-label="Show"
          className="relative isolate inline-flex flex-wrap rounded-full border border-line bg-surface-inset p-[3px] shadow-inset"
        >
          {(["all", "todo", "done", "starred", "due"] as const).map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={status === s}
              onClick={() => setStatus(s)}
              className={cn(
                "relative inline-flex h-[28px] items-center gap-1.5 rounded-full px-3 text-[12.5px] font-[550] transition-colors duration-[var(--dur-base)]",
                status === s ? "text-ink" : "text-ink-3 hover:text-ink",
              )}
            >
              {status === s && (
                <motion.span
                  layoutId="sheet-status"
                  transition={{ type: "spring", stiffness: 500, damping: 38 }}
                  className="absolute inset-0 -z-10 rounded-full border border-line-2 bg-surface-4 shadow-e1"
                />
              )}
              {STATUS_LABEL[s]}
              {s === "starred" && stars.size > 0 && (
                <span className="tnum rounded-full bg-medium-soft px-1.5 font-mono text-[10.5px] text-medium">
                  {stars.size}
                </span>
              )}
              {s === "due" && dueCount > 0 && (
                <span className="tnum rounded-full bg-violet-soft px-1.5 font-mono text-[10.5px] text-violet">
                  {dueCount}
                </span>
              )}
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
                    "h-[28px] rounded-full border px-3 text-12 font-[550] capitalize transition-colors duration-[var(--dur-base)]",
                    on
                      ? "border-violet-line bg-violet-soft text-ink"
                      : "border-line-2 text-ink-2 hover:border-line-3 hover:text-ink",
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
          className="ml-auto rounded-full px-2.5 py-1 text-12 font-[550] text-ink-3 transition-colors hover:bg-surface-3 hover:text-ink"
        >
          {open.size === steps.length ? "Collapse all" : "Expand all"}
        </button>
      </div>

      {filtering && (
        <div className="flex flex-wrap items-center gap-1.5">
          {q && <FilterChip label={`“${query.trim()}”`} onRemove={() => setQuery("")} />}
          {status !== "all" && (
            <FilterChip label={STATUS_LABEL[status]} onRemove={() => setStatus("all")} />
          )}
          {tiers.map((t) => (
            <FilterChip
              key={t}
              label={t}
              onRemove={() => setTiers((ts) => ts.filter((x) => x !== t))}
            />
          ))}
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setStatus("all");
              setTiers([]);
            }}
            className="ml-1 font-mono text-[11px] text-ink-3 underline-offset-4 hover:text-ink hover:underline"
          >
            Clear all
          </button>
        </div>
      )}
      {filtering && (
        <p className="font-mono text-[11.5px] text-ink-3">
          {visibleCount} of {items.length} match
          {status === "due" &&
            visibleCount === 0 &&
            " · nothing to revise from this sheet right now"}
        </p>
      )}

      {steps.map((step, stepIndex) => {
        const shown = step.all.filter(matches);
        if (filtering && shown.length === 0) return null;
        const done = step.all.filter((i) => i.status).length;
        const isOpen = filtering || open.has(step.name);
        const minutesLeft = step.all
          .filter((i) => !i.status)
          .reduce((n, i) => n + (i.minutes ?? 0), 0);
        const pct = step.all.length ? Math.round((done / step.all.length) * 100) : 0;
        return (
          <section
            key={step.name}
            className={cn(
              "surface-card overflow-clip rounded-lg transition-shadow duration-[var(--dur-base)] hover:shadow-e2",
              pct === 100 && "border-success-line shadow-[var(--e1),0_0_30px_-14px_var(--success)]",
            )}
          >
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => toggle(setOpen, step.name)}
              className={cn(
                "flex w-full items-center gap-3 rounded-t-lg px-[18px] py-3.5 text-left transition-colors duration-[var(--dur-base)] hover:bg-surface-2/50",
                // Stays visible under the top bar (and toolbar) while you scroll a long step.
                isOpen && "glass sticky top-[64px] z-20 border-b border-line md:top-[122px]",
              )}
            >
              <ChevronRight
                size={15}
                aria-hidden="true"
                className={cn(
                  "shrink-0 text-ink-3 transition-transform duration-[var(--dur-base)]",
                  isOpen && "rotate-90",
                )}
              />
              <span className="tnum hidden w-9 font-mono text-24 leading-none font-[600] text-ink-4 sm:block">
                {String(stepIndex + 1).padStart(2, "0")}
              </span>
              <span className="min-w-0 flex-1 truncate text-15 font-[600]">{step.name}</span>
              {pct === 100 && (
                <span className="grid size-5 animate-[pop-in_var(--dur-slow)_var(--ease-spring)] place-items-center rounded-full bg-success text-[#06210f] shadow-[0_0_12px_-3px_var(--success)]">
                  <Check size={12} strokeWidth={3} aria-label="Complete" />
                </span>
              )}
              {minutesLeft > 0 && (
                <span className="tnum hidden text-12 text-ink-3 md:block">
                  ~{formatMinutes(minutesLeft)} left
                </span>
              )}
              <span className="hidden h-1.5 w-28 overflow-hidden rounded-full bg-surface-3 sm:block">
                <span
                  className="block h-full origin-left animate-[grow-x_700ms_var(--ease-out)_backwards] rounded-full"
                  style={{
                    width: `${pct}%`,
                    background:
                      pct === 100
                        ? "var(--success)"
                        : "linear-gradient(90deg, color-mix(in srgb, var(--violet) 55%, transparent), var(--violet))",
                  }}
                />
              </span>
              <span className="tnum w-14 text-right font-mono text-12 text-ink-3">
                {done}/{step.all.length}
              </span>
            </button>

            {isOpen && (
              <div className="animate-[rise-in_var(--dur-slow)_var(--ease-out)_backwards] border-t border-line px-2 pt-1 pb-3 sm:px-3">
                {step.sections.map((section) => {
                  const rows = section.items.filter(matches);
                  if (rows.length === 0) return null;
                  const key = `${step.name}::${section.name}`;
                  const sectionOpen = filtering || !closedSections.has(key);
                  const sectionDone = section.items.filter((i) => i.status).length;
                  const list = (
                    <ul className="overflow-hidden rounded-[14px] border border-line bg-surface-inset">
                      {rows.map((item) => (
                        <ItemRow
                          key={item.itemKey}
                          sheetId={sheetId}
                          item={item}
                          review={reviewOf(item)}
                          starred={stars.has(item.itemKey)}
                          highlighted={highlight === item.itemKey}
                          noteOpen={noteFor === item.itemKey}
                          onStar={(on) => {
                            setStars((prev) => {
                              const next = new Set(prev);
                              if (on) next.add(item.itemKey);
                              else next.delete(item.itemKey);
                              return next;
                            });
                            void setSheetItemStarred(sheetId, item.itemKey, on);
                          }}
                          onNote={() =>
                            setNoteFor((k) => (k === item.itemKey ? null : item.itemKey))
                          }
                          onVideo={(url) => setVideo({ url, title: item.title })}
                        />
                      ))}
                    </ul>
                  );
                  if (!section.name)
                    return (
                      <div key={key} className="mt-2">
                        {list}
                      </div>
                    );
                  return (
                    <div key={key} className="relative mt-2 pl-4 sm:pl-5">
                      {/* Tree connector, like a folder outline. */}
                      <span
                        aria-hidden="true"
                        className="absolute top-0 bottom-3 left-[7px] w-px bg-line-2 sm:left-[9px]"
                      />
                      <button
                        type="button"
                        aria-expanded={sectionOpen}
                        onClick={() => toggle(setClosedSections, key)}
                        className="relative flex w-full items-center gap-2 rounded-md py-2 pr-2 pl-1 text-left hover:bg-surface-2/50"
                      >
                        <span
                          aria-hidden="true"
                          className="absolute top-1/2 -left-[9px] h-px w-2.5 bg-line-2 sm:-left-[11px]"
                        />
                        <ChevronRight
                          size={13}
                          aria-hidden="true"
                          className={cn(
                            "shrink-0 text-ink-3 transition-transform duration-[var(--dur-base)]",
                            sectionOpen && "rotate-90",
                          )}
                        />
                        <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium">
                          {section.name}
                        </span>
                        <span className="hidden h-1 w-16 overflow-hidden rounded-full bg-surface-3 sm:block">
                          <span
                            className="block h-full rounded-full"
                            style={{
                              width: `${(sectionDone / Math.max(1, section.items.length)) * 100}%`,
                              background:
                                sectionDone === section.items.length
                                  ? "var(--success)"
                                  : "var(--violet)",
                            }}
                          />
                        </span>
                        {sectionDone === section.items.length ? (
                          <Check
                            size={13}
                            strokeWidth={2.5}
                            className="text-success"
                            aria-label="Section complete"
                          />
                        ) : null}
                        <span className="tnum font-mono text-11 text-ink-3">
                          {sectionDone}/{section.items.length}
                        </span>
                      </button>
                      {sectionOpen && list}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}

      {video && <VideoModal url={video.url} title={video.title} onClose={() => setVideo(null)} />}
    </div>
  );
}

function ItemRow({
  sheetId,
  item,
  review,
  starred,
  highlighted,
  noteOpen,
  onStar,
  onNote,
  onVideo,
}: {
  sheetId: string;
  item: SheetItemView;
  review: ItemReview | undefined;
  starred: boolean;
  highlighted: boolean;
  noteOpen: boolean;
  onStar: (on: boolean) => void;
  onNote: () => void;
  onVideo: (url: string) => void;
}) {
  const link = (site: Site) => item.links.find((l) => l.site === site)?.url;
  const practice = link("takeuforward") ?? link("neetcode") ?? link("source");
  const practiceSite: Site | null = link("takeuforward")
    ? "takeuforward"
    : link("neetcode")
      ? "neetcode"
      : link("source")
        ? "source"
        : null;
  const youtube = link("youtube");
  const [, startTransition] = useTransition();
  const title = (
    <span className={cn("text-[13.5px] font-medium", item.status && "text-ink-2")}>
      {item.title}
    </span>
  );

  return (
    <>
      <li
        id={`item-${item.itemKey}`}
        className={cn(
          "group/row relative flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-line px-3 py-2.5 transition-colors duration-[600ms] [contain-intrinsic-size:auto_48px] [content-visibility:auto] first:border-t-0 hover:bg-surface-2/70 sm:flex-nowrap",
          highlighted && "animate-[row-pulse_1.2s_var(--ease-out)_2] bg-signal/12",
        )}
      >
        <span
          aria-hidden="true"
          className="absolute top-2 bottom-2 left-0 w-[3px] scale-y-0 rounded-r-full transition-transform duration-[var(--dur-base)] group-hover/row:scale-y-100"
          style={{ background: accentOf(item.tier) }}
        />
        <ItemTick
          sheetId={sheetId}
          itemKey={item.itemKey}
          status={item.status}
          title={item.title}
        />
        <span className="flex min-w-0 flex-1 items-center gap-2">
          {item.problemId ? (
            <Link
              href={`/dashboard/problems/${item.problemId}`}
              className="min-w-0 truncate hover:underline"
            >
              {title}
            </Link>
          ) : (
            <span className="min-w-0 truncate">{title}</span>
          )}
          <TierTag tier={item.tier} />
          {item.kind === "learning" && <Tag mono>read</Tag>}
          {review?.due && <StatusBadge status="revise" className="h-5 px-1.5 text-11" />}
          {!item.tracked && item.kind === "practice" && (
            <span
              className="hidden font-mono text-[10.5px] text-ink-3 lg:inline"
              title="We can't detect this one automatically yet; tick it yourself"
            >
              manual
            </span>
          )}
        </span>
        {item.minutes && (
          <span className="hidden w-12 text-right font-mono text-[10.5px] text-ink-3 xl:block">
            {item.minutes} min
          </span>
        )}

        <span className="ml-auto flex items-center gap-0.5 sm:ml-0">
          <Slot>
            {practice && practiceSite && (
              <Resource
                href={practice}
                label={SITE_LABEL[practiceSite]}
                site={
                  practiceSite === "takeuforward"
                    ? "tuf"
                    : practiceSite === "neetcode"
                      ? "neetcode"
                      : "article"
                }
              />
            )}
          </Slot>
          <Slot className="hidden sm:inline-grid">
            {link("article") && (
              <Resource href={link("article")!} label="Read the article" site="article" />
            )}
          </Slot>
          <Slot>
            {youtube && (
              <Resource
                label="Watch the explanation"
                site="youtube"
                onClick={() => (parseYouTube(youtube) ? onVideo(youtube) : window.open(youtube))}
              />
            )}
          </Slot>
          <Slot>
            {link("leetcode") && (
              <Resource href={link("leetcode")!} label="Solve on LeetCode" site="leetcode" />
            )}
          </Slot>
          <Slot className="hidden sm:inline-grid">
            {link("geeksforgeeks") && (
              <Resource href={link("geeksforgeeks")!} label="Solve on GeeksforGeeks" site="gfg" />
            )}
          </Slot>
          <span aria-hidden="true" className="mx-1 hidden h-4 w-px bg-line-2 sm:block" />
          <Slot className="hidden opacity-60 transition-opacity duration-[var(--dur-base)] group-focus-within/row:opacity-100 group-hover/row:opacity-100 sm:inline-grid">
            {item.problemId && (
              <IconButton
                label={item.note ? "Your note" : "Add a note"}
                pressed={noteOpen}
                onClick={onNote}
              >
                <span className="relative">
                  <NotebookPen size={14} strokeWidth={1.75} />
                  {item.note && (
                    <i className="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-signal shadow-[0_0_6px_var(--signal)]" />
                  )}
                </span>
              </IconButton>
            )}
          </Slot>
          <Slot
            className={
              starred
                ? undefined
                : "opacity-60 transition-opacity duration-[var(--dur-base)] group-focus-within/row:opacity-100 group-hover/row:opacity-100"
            }
          >
            <StarToggle
              on={starred}
              aria-label={starred ? "Unstar" : "Star to come back to"}
              title={starred ? "Unstar" : "Star to come back to"}
              className="size-[30px] rounded-md"
              onClick={() => startTransition(() => onStar(!starred))}
            />
          </Slot>
          <Slot className="hidden opacity-60 transition-opacity duration-[var(--dur-base)] group-focus-within/row:opacity-100 group-hover/row:opacity-100 sm:inline-grid">
            {item.problemId && (
              <Link
                href={`/dashboard/problems/${item.problemId}`}
                aria-label="Your attempts, notes and revision"
                title="Your attempts, notes and revision"
                className="grid size-[30px] place-items-center rounded-md text-ink-3 transition-colors duration-[var(--dur-base)] hover:bg-surface-2 hover:text-ink"
              >
                <PanelRight size={14} strokeWidth={1.75} />
              </Link>
            )}
          </Slot>
        </span>
      </li>
      {noteOpen && item.problemId && (
        <li className="border-t border-line bg-surface-2/40 px-3 py-3 sm:pl-10">
          <NoteEditor problemId={item.problemId} initial={item.note ?? ""} />
        </li>
      )}
    </>
  );
}

const SITE_LABEL: Record<Site, string> = {
  takeuforward: "Practice on takeUforward",
  neetcode: "Practice on NeetCode",
  source: "Open the sheet",
  leetcode: "Solve on LeetCode",
  geeksforgeeks: "Solve on GeeksforGeeks",
  youtube: "Watch the explanation",
  article: "Read the article",
};

/** Fixed-width cell so icons line up across rows even when a link is missing. */
function Slot({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-grid size-[30px] place-items-center", className)}>{children}</span>
  );
}

/** Resource dock icon: monochrome mark, brand colour + slight magnify on hover, tooltip. */
function Resource({
  href,
  label,
  site,
  onClick,
}: {
  href?: string;
  label: string;
  site: PlatformId;
  onClick?: () => void;
}) {
  const cls =
    "group grid size-[30px] place-items-center rounded-md text-ink-3 transition-[background-color,transform] duration-[var(--dur-fast)] hover:scale-110 hover:bg-surface-2";
  const mark = <PlatformMark site={site} size={15} />;
  return (
    <Tooltip content={label} side="top">
      {href ? (
        <a href={href} target="_blank" rel="noreferrer" aria-label={label} className={cls}>
          {mark}
        </a>
      ) : (
        <button type="button" onClick={onClick} aria-label={label} className={cls}>
          {mark}
        </button>
      )}
    </Tooltip>
  );
}

/** Left accent bar colour for a row (difficulty or level). */
function accentOf(tier: string | null) {
  if (tier === "easy" || tier === "basic") return "var(--easy)";
  if (tier === "medium" || tier === "core") return "var(--medium)";
  if (tier === "hard" || tier === "pro") return "var(--hard)";
  return "var(--violet)";
}

function IconButton({
  label,
  pressed,
  onClick,
  children,
}: {
  label: string;
  pressed?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "grid size-[30px] place-items-center rounded-md text-ink-3 transition-colors duration-[var(--dur-base)] hover:bg-surface-2 hover:text-ink",
        pressed && "bg-surface-2 text-ink",
      )}
    >
      {children}
    </button>
  );
}

function TierTag({ tier }: { tier: string | null }) {
  if (tier === "easy" || tier === "medium" || tier === "hard")
    return <DifficultyTag difficulty={tier} />;
  return tier === "basic" || tier === "core" || tier === "pro" ? (
    <LevelChip level={tier} className="shrink-0" />
  ) : null;
}

function formatMinutes(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  return min % 60 ? `${h}h ${min % 60}m` : `${h}h`;
}

/** Plays the creator's explanation without leaving the sheet (privacy-enhanced embed). */
function VideoModal({ url, title, onClose }: { url: string; title: string; onClose: () => void }) {
  const yt = parseYouTube(url);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);
  if (!yt) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Video: ${title}`}
      className="fixed inset-0 z-50 grid animate-[fade-in-pop_var(--dur-base)_var(--ease-out)] place-items-center bg-[rgba(4,4,8,.7)] p-4 backdrop-blur-[6px]"
      onClick={onClose}
    >
      <div
        className="glass w-full max-w-[960px] animate-[modal-in_var(--dur-slow)_var(--ease-spring)] overflow-hidden rounded-[22px] border border-line-2 shadow-e4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3">
          <Play size={14} aria-hidden="true" className="text-[#ff0033]" />
          <p className="min-w-0 flex-1 truncate text-[14px] font-[550]">{title}</p>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-[11.5px] text-ink-3 hover:text-ink"
          >
            Open on YouTube
          </a>
          <button
            ref={closeRef}
            type="button"
            aria-label="Close video"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-full text-ink-2 hover:bg-surface-2 hover:text-ink"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
        <div className="relative aspect-video w-full bg-black">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${yt.id}?start=${yt.start}&autoplay=1&rel=0`}
            title={title}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
          />
        </div>
      </div>
    </div>
  );
}

/** An active filter you can remove with one click. */
function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex h-[26px] animate-pop items-center gap-1 rounded-full border border-line-2 bg-surface-2 pr-1 pl-2.5 text-[12px] capitalize">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove filter ${label}`}
        className="grid size-5 place-items-center rounded-full text-ink-3 transition-colors hover:bg-surface-3 hover:text-ink"
      >
        <X size={11} aria-hidden="true" />
      </button>
    </span>
  );
}
