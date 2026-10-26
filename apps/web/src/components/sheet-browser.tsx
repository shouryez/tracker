"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import {
  ArrowRight,
  ChevronRight,
  FileText,
  NotebookPen,
  PanelRight,
  Play,
  RotateCcw,
  Search,
  Star,
  X,
} from "lucide-react";
import { DifficultyTag, Tag, cn } from "@upsolve/ui";
import { setSheetItemStarred } from "@/app/actions/sheets";
import type { SheetItemView } from "@/lib/sheets-data";
import { NoteEditor } from "./note-editor";
import { ItemTick } from "./sheets";
import { LeetCodeMark, LetterMark, parseYouTube, YouTubeMark } from "./site-icons";

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
          className="group/continue flex items-center gap-3 rounded-lg border border-line bg-surface px-[18px] py-3 text-left shadow-card transition-colors duration-[240ms] hover:border-ink-3"
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-signal text-signal-ink">
            <ArrowRight size={15} aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-mono text-[10.5px] tracking-[.08em] text-ink-3 uppercase">
              Continue where you left off
            </span>
            <span className="block truncate text-[14px] font-[550]">{continueItem.title}</span>
          </span>
          <span className="hidden truncate font-mono text-[11px] text-ink-3 sm:block">
            {continueItem.step}
            {continueItem.section ? ` › ${continueItem.section}` : ""}
          </span>
        </button>
      )}

      <div className="flex flex-wrap items-center gap-2.5">
        <label className="relative min-w-[200px] flex-1">
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
          aria-label="Show"
          className="inline-flex flex-wrap rounded-full border border-line bg-surface-2 p-[3px]"
        >
          {(["all", "todo", "done", "starred", "due"] as const).map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={status === s}
              onClick={() => setStatus(s)}
              className={cn(
                "inline-flex h-[28px] items-center gap-1.5 rounded-full px-3 text-[12.5px] transition-colors duration-[240ms]",
                status === s ? "bg-surface text-ink shadow-card" : "text-ink-2 hover:text-ink",
              )}
            >
              {STATUS_LABEL[s]}
              {s === "starred" && stars.size > 0 && (
                <span className="font-mono text-[10.5px] text-ink-3">{stars.size}</span>
              )}
              {s === "due" && dueCount > 0 && (
                <span className="rounded-full bg-warn/15 px-1.5 font-mono text-[10.5px] text-warn">
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
            className="overflow-hidden rounded-lg border border-line bg-surface shadow-card"
          >
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => toggle(setOpen, step.name)}
              className="flex w-full items-center gap-3 px-[18px] py-3.5 text-left transition-colors duration-[240ms] hover:bg-surface-2/50"
            >
              <ChevronRight
                size={15}
                aria-hidden="true"
                className={cn(
                  "shrink-0 text-ink-3 transition-transform duration-[240ms]",
                  isOpen && "rotate-90",
                )}
              />
              <span className="hidden w-6 font-mono text-[11px] text-ink-3 sm:block">
                {String(stepIndex + 1).padStart(2, "0")}
              </span>
              <span className="min-w-0 flex-1 truncate text-[14.5px] font-[550]">{step.name}</span>
              {minutesLeft > 0 && (
                <span className="hidden font-mono text-[11px] text-ink-3 md:block">
                  ~{formatMinutes(minutesLeft)} left
                </span>
              )}
              <span className="hidden h-1.5 w-28 overflow-hidden rounded-full bg-surface-3 sm:block">
                <span
                  className={cn("block h-full rounded-full", pct === 100 ? "bg-ok" : "bg-ink")}
                  style={{ width: `${pct}%` }}
                />
              </span>
              <span className="w-14 text-right font-mono text-[11.5px] text-ink-3">
                {done}/{step.all.length}
              </span>
            </button>

            {isOpen && (
              <div className="border-t border-line px-2 pt-1 pb-3 sm:px-3">
                {step.sections.map((section) => {
                  const rows = section.items.filter(matches);
                  if (rows.length === 0) return null;
                  const key = `${step.name}::${section.name}`;
                  const sectionOpen = filtering || !closedSections.has(key);
                  const sectionDone = section.items.filter((i) => i.status).length;
                  const list = (
                    <ul className="overflow-hidden rounded-md border border-line bg-bg-2/40">
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
                            "shrink-0 text-ink-3 transition-transform duration-[240ms]",
                            sectionOpen && "rotate-90",
                          )}
                        />
                        <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium">
                          {section.name}
                        </span>
                        <span className="font-mono text-[11px] text-ink-3">
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
    <span className={cn("text-[13.5px]", item.status && "text-ink-3")}>{item.title}</span>
  );

  return (
    <>
      <li
        id={`item-${item.itemKey}`}
        className={cn(
          "flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-line px-3 py-2.5 transition-colors duration-[600ms] first:border-t-0 hover:bg-surface-2/60 sm:flex-nowrap",
          highlighted && "bg-signal/15",
        )}
      >
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
          {review?.due && (
            <span className="inline-flex items-center gap-1 rounded-full bg-warn/15 px-1.5 py-0.5 font-mono text-[10.5px] text-warn">
              <RotateCcw size={10} aria-hidden="true" /> revise
            </span>
          )}
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
              <IconLink href={practice} label={SITE_LABEL[practiceSite]}>
                {practiceSite === "takeuforward" ? (
                  <LetterMark text="TUF" color="#2563eb" />
                ) : practiceSite === "neetcode" ? (
                  <LetterMark text="NC" color="#7c3aed" />
                ) : (
                  <FileText size={14} strokeWidth={1.75} />
                )}
              </IconLink>
            )}
          </Slot>
          <Slot className="hidden sm:inline-grid">
            {link("article") && (
              <IconLink href={link("article")!} label="Read the article">
                <FileText size={14} strokeWidth={1.75} />
              </IconLink>
            )}
          </Slot>
          <Slot>
            {youtube && (
              <IconButton
                label="Watch the explanation"
                onClick={() => (parseYouTube(youtube) ? onVideo(youtube) : window.open(youtube))}
              >
                <YouTubeMark />
              </IconButton>
            )}
          </Slot>
          <Slot>
            {link("leetcode") && (
              <IconLink href={link("leetcode")!} label="Solve on LeetCode">
                <LeetCodeMark className="text-ink" />
              </IconLink>
            )}
          </Slot>
          <Slot className="hidden sm:inline-grid">
            {link("geeksforgeeks") && (
              <IconLink href={link("geeksforgeeks")!} label="Solve on GeeksforGeeks">
                <LetterMark text="GfG" color="#2f8d46" />
              </IconLink>
            )}
          </Slot>
          <span aria-hidden="true" className="mx-1 hidden h-4 w-px bg-line-2 sm:block" />
          <Slot className="hidden sm:inline-grid">
            {item.problemId && (
              <IconButton
                label={item.note ? "Your note" : "Add a note"}
                pressed={noteOpen}
                onClick={onNote}
              >
                <NotebookPen
                  size={14}
                  strokeWidth={1.75}
                  className={item.note ? "text-primary" : undefined}
                />
              </IconButton>
            )}
          </Slot>
          <Slot>
            <IconButton
              label={starred ? "Unstar" : "Star to come back to"}
              pressed={starred}
              onClick={() => startTransition(() => onStar(!starred))}
            >
              <Star
                size={14}
                strokeWidth={1.75}
                className={starred ? "fill-warn text-warn" : undefined}
              />
            </IconButton>
          </Slot>
          <Slot className="hidden sm:inline-grid">
            {item.problemId && (
              <Link
                href={`/dashboard/problems/${item.problemId}`}
                aria-label="Your attempts, notes and revision"
                title="Your attempts, notes and revision"
                className="grid size-[30px] place-items-center rounded-md text-ink-3 transition-colors duration-[240ms] hover:bg-surface-2 hover:text-ink"
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

function IconLink({ href, label, children }: { href: string; label: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      title={label}
      className="grid size-[30px] place-items-center rounded-md text-ink-2 transition-colors duration-[240ms] hover:bg-surface-2 hover:text-ink"
    >
      {children}
    </a>
  );
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
        "grid size-[30px] place-items-center rounded-md text-ink-3 transition-colors duration-[240ms] hover:bg-surface-2 hover:text-ink",
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
  const tone =
    tier === "basic" ? "easy" : tier === "core" ? "medium" : tier === "pro" ? "hard" : null;
  return tier && tone ? (
    <Tag tone={tone} className="shrink-0 capitalize">
      {tier}
    </Tag>
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
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[960px] overflow-hidden rounded-lg border border-line bg-surface shadow-card"
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
