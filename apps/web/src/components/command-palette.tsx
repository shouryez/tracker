"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { Command } from "cmdk";
import {
  Bookmark,
  Briefcase,
  Check,
  ListPlus,
  Layers,
  Shapes,
  Sparkles,
  Timer,
  Clock3,
  CornerDownLeft,
  Download,
  LogOut,
  MessageSquarePlus,
  Moon,
  Puzzle,
  Search,
} from "lucide-react";
import { TOPICS } from "@upsolve/core";
import { DifficultyTag, Kbd, Spinner, THEME_STORAGE_KEY, cn } from "@upsolve/ui";
import { getProblemPeek, type ProblemPeek } from "@/app/actions/peek";
import { quickSearch, type QuickResult } from "@/app/actions/search";
import { ACCOUNT, MENU, SOCIAL, TOOLKIT } from "@/app/dashboard/_components/nav-links";
import { openNextPicker } from "@/components/daily/next-problem";
import { openFeedback } from "@/app/dashboard/_components/feedback-button";

/** Other components open the palette with this event (e.g. the header search). */
export const COMMAND_EVENT = "upsolve:command";
export function openCommandPalette() {
  window.dispatchEvent(new Event(COMMAND_EVENT));
}

// Recently opened destinations, per browser (a convenience only).
const RECENT_KEY = "upsolve:recent";
type Recent = { href: string; label: string };
function readRecent(): Recent[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]") as Recent[];
  } catch {
    return [];
  }
}
function pushRecent(r: Recent) {
  try {
    const next = [r, ...readRecent().filter((x) => x.href !== r.href)].slice(0, 4);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // Storage blocked: no recents.
  }
}

/** Wraps the matched part of `text` in a highlight. */
function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  const i = q.length >= 2 ? text.toLowerCase().indexOf(q.toLowerCase()) : -1;
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="bg-transparent font-[600] text-signal-text">
        {text.slice(i, i + q.length)}
      </mark>
      {text.slice(i + q.length)}
    </>
  );
}

/** Ctrl/⌘ K: jump to any page, search problems, run actions. */
export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<QuickResult[]>([]);
  const [recent, setRecent] = useState<Recent[]>([]);
  const [searching, startSearch] = useTransition();
  const signOut = useRef<HTMLFormElement>(null);
  // The highlighted row, for the preview pane on wide screens.
  const [selected, setSelected] = useState("");
  const [preview, setPreview] = useState<ProblemPeek | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setRecent(readRecent());
        setOpen((o) => !o);
      }
    };
    const onOpen = () => {
      setRecent(readRecent());
      setOpen(true);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener(COMMAND_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(COMMAND_EVENT, onOpen);
    };
  }, []);

  // Debounced problem search.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const t = setTimeout(() => startSearch(async () => setResults(await quickSearch(q))), 180);
    return () => clearTimeout(t);
  }, [query]);

  const go = (href: string, label?: string) => {
    if (label) pushRecent({ href, label });
    setOpen(false);
    setQuery("");
    router.push(href);
  };
  const run = (fn: () => void) => {
    setOpen(false);
    setQuery("");
    fn();
  };
  const shown = query.trim().length >= 2 ? results : [];
  const q = query.trim().toLowerCase();
  // Topic jumps: "dp", "graph", "two pointers"...
  const topics =
    q.length >= 2
      ? TOPICS.filter(
          (t) =>
            t.label.toLowerCase().includes(q) ||
            t.id.includes(q) ||
            t.tags.some((g) => g.startsWith(q)),
        ).slice(0, 3)
      : [];
  const selectedProblem = shown.find(
    (p) => selected.trim().toLowerCase() === `problem ${p.title} ${query}`.trim().toLowerCase(),
  );
  const previewId = selectedProblem?.id ?? null;
  useEffect(() => {
    if (!previewId) return;
    let live = true;
    const t = setTimeout(async () => {
      const p = await getProblemPeek(previewId);
      if (live) setPreview(p);
    }, 120);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [previewId]);

  return (
    <>
      <form ref={signOut} action="/auth/signout" method="post" hidden />
      <Command.Dialog
        open={open}
        onOpenChange={setOpen}
        label="Command menu"
        shouldFilter
        value={selected}
        onValueChange={setSelected}
        overlayClassName="fixed inset-0 z-[90] bg-[rgba(4,4,8,.55)] backdrop-blur-[6px] data-[state=open]:animate-[fade-in-pop_var(--dur-base)_var(--ease-out)]"
        contentClassName="glass-chrome fixed top-[14vh] left-1/2 z-[91] w-[min(640px,calc(100vw-24px))] -translate-x-1/2 lg:w-[min(880px,calc(100vw-24px))] overflow-hidden rounded-[22px] data-[state=open]:animate-[modal-in_var(--dur-slow)_var(--ease-spring)]"
      >
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search size={16} className="shrink-0 text-ink-3" aria-hidden="true" />
          <Command.Input
            value={query}
            onValueChange={(v) => {
              setQuery(v);
              // A new query starts at its top result (and the preview follows it).
              setSelected("");
            }}
            placeholder="Search problems, jump to a page, or run a command…"
            className="h-14 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-3"
          />
          {searching ? <Spinner className="text-ink-3" /> : <Kbd>Esc</Kbd>}
        </div>
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_240px]">
          <Command.List className="max-h-[min(420px,60vh)] scroll-py-2 overflow-y-auto p-2">
            <Command.Empty className="px-3 py-10 text-center text-[13.5px] text-ink-2">
              {query.trim().length >= 2 && searching
                ? "Searching…"
                : "Nothing matches. Try another word."}
            </Command.Empty>

            {query.trim() === "" && recent.length > 0 && (
              <Group heading="Recent">
                {recent.map((r) => (
                  <Item
                    key={r.href}
                    value={`recent ${r.label}`}
                    onSelect={() => go(r.href, r.label)}
                    icon={<Clock3 size={14} />}
                  >
                    {r.label}
                  </Item>
                ))}
              </Group>
            )}

            {shown.length > 0 && (
              <Group heading="Problems">
                {shown.map((p) => (
                  <Item
                    key={p.id}
                    value={`problem ${p.title} ${query}`}
                    onSelect={() => go(`/dashboard/problems/${p.id}`, p.title)}
                    tint={p.solved ? "var(--success)" : undefined}
                    icon={
                      p.solved ? (
                        <Check size={14} aria-label="Solved" />
                      ) : (
                        <span className="block size-3 rounded-full border-[1.5px] border-current" />
                      )
                    }
                    right={p.difficulty ? <DifficultyTag difficulty={p.difficulty} /> : null}
                  >
                    <Highlight text={p.title} query={query} />
                  </Item>
                ))}
                <Item
                  value={`search all ${query}`}
                  onSelect={() => go(`/dashboard/search?q=${encodeURIComponent(query.trim())}`)}
                  icon={<Search size={14} />}
                >
                  See all results for “{query.trim()}”
                </Item>
              </Group>
            )}

            {topics.length > 0 && (
              <Group heading="Topics">
                {topics.map((t) => (
                  <Item
                    key={t.id}
                    value={`topic ${t.label} ${t.tags.join(" ")} ${query}`}
                    onSelect={() =>
                      go(`/dashboard/search?q=${encodeURIComponent(t.label)}`, `Topic: ${t.label}`)
                    }
                    icon={<Shapes size={14} />}
                  >
                    Practise <Highlight text={t.label} query={query} />
                  </Item>
                ))}
              </Group>
            )}

            <Group heading="Go to">
              {[...MENU, ...TOOLKIT, ...SOCIAL, ...ACCOUNT].map(({ label, href, icon: Icon }) => (
                <Item
                  key={href}
                  value={`go ${label}`}
                  onSelect={() => go(href, label)}
                  icon={<Icon size={14} />}
                >
                  {label}
                </Item>
              ))}
            </Group>

            <Group heading="Actions">
              <Item
                value="mock interview start round practice pressure"
                icon={<Briefcase size={14} />}
                onSelect={() => go("/dashboard/interview", "Mock interview")}
              >
                Start a mock interview
              </Item>
              <Item
                value="grade revisions swipe deck review due"
                icon={<Layers size={14} />}
                onSelect={() => go("/dashboard/revision?deck=1", "Revision")}
              >
                Grade today&apos;s revisions
              </Item>
              <Item
                value="what should i solve next pick problem"
                icon={<Sparkles size={14} />}
                onSelect={() => run(openNextPicker)}
              >
                What should I solve next?
              </Item>
              <Item
                value="start focus lab timer pomodoro"
                icon={<Timer size={14} />}
                onSelect={() => go("/dashboard/sessions#lab", "Lab timer")}
              >
                Start a focus session
              </Item>
              <Item
                value="add task today plan todo"
                icon={<ListPlus size={14} />}
                onSelect={() => go("/dashboard/today", "Today")}
              >
                Add a task to today
              </Item>
              <Item
                value="save link for later bookmark youtube"
                icon={<Bookmark size={14} />}
                onSelect={() => go("/dashboard/later", "Saved for later")}
              >
                Save a link for later
              </Item>
              <Item
                value="toggle theme dark light"
                icon={<Moon size={14} />}
                onSelect={() =>
                  run(() => {
                    const root = document.documentElement;
                    const next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
                    root.classList.add("theme-transition");
                    root.setAttribute("data-theme", next);
                    setTimeout(() => root.classList.remove("theme-transition"), 400);
                    try {
                      localStorage.setItem(THEME_STORAGE_KEY, next);
                    } catch {
                      // ignore
                    }
                  })
                }
              >
                Toggle light / dark
              </Item>
              <Item
                value="download share card"
                icon={<Download size={14} />}
                onSelect={() =>
                  run(() => {
                    // A file download, not a page: click a temporary download link.
                    const a = document.createElement("a");
                    a.href = "/api/share-card?download=1";
                    a.download = "dsakaro-card.png";
                    a.click();
                  })
                }
              >
                Download your share card
              </Item>
              <Item
                value="connect extension"
                icon={<Puzzle size={14} />}
                onSelect={() => go("/extension/connect")}
              >
                Connect the browser extension
              </Item>
              <Item
                value="send feedback"
                icon={<MessageSquarePlus size={14} />}
                onSelect={() => run(() => openFeedback())}
              >
                Send feedback
              </Item>
              <Item
                value="sign out log out"
                icon={<LogOut size={14} />}
                onSelect={() => run(() => signOut.current?.requestSubmit())}
              >
                Sign out
              </Item>
            </Group>
          </Command.List>
          {/* Preview pane: the highlighted problem, at a glance (wide screens). */}
          <aside
            aria-hidden="true"
            className="hidden border-l border-line p-4 text-12 lg:flex lg:flex-col lg:gap-2"
          >
            {selectedProblem && preview && preview.id === selectedProblem.id ? (
              <>
                <p className="text-11 font-[600] text-ink-3">Preview</p>
                <p className="text-15 leading-snug font-[650] text-ink">{preview.title}</p>
                <span className="flex flex-wrap gap-1.5">
                  {preview.difficulty && <DifficultyTag difficulty={preview.difficulty} />}
                  {preview.rung && (
                    <span className="rounded-full bg-mint-soft px-2 py-0.5 font-[650] text-signal-text">
                      Ring {preview.rung}
                    </span>
                  )}
                </span>
                <p className="text-ink-2">
                  {preview.lastAt ? "You've solved this before." : "Not solved yet."}
                  {preview.bestMs
                    ? ` Best ${Math.max(1, Math.round(preview.bestMs / 60_000))} min.`
                    : ""}
                </p>
                <p className="mt-auto text-ink-4">Enter to open</p>
              </>
            ) : (
              <>
                <p className="text-11 font-[600] text-ink-3">Tips</p>
                <p className="text-ink-2">Type a problem, a topic like “dp”, or a page.</p>
                <p className="text-ink-2">
                  <span className="font-[600] text-ink">g</span> then a letter jumps to a page;{" "}
                  <span className="font-[600] text-ink">?</span> lists every shortcut.
                </p>
              </>
            )}
          </aside>
        </div>
        <div className="flex items-center gap-4 border-t border-line px-4 py-2.5 font-mono text-[11px] text-ink-3">
          <span className="flex items-center gap-1.5">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd> move
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd>
              <CornerDownLeft size={11} />
            </Kbd>{" "}
            open
          </span>
          <span className="ml-auto">Ctrl K anywhere</span>
        </div>
      </Command.Dialog>
    </>
  );
}

function Group({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <Command.Group
      heading={heading}
      className="mb-1 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:text-[11.5px] [&_[cmdk-group-heading]]:font-[600] [&_[cmdk-group-heading]]:text-ink-3"
    >
      {children}
    </Command.Group>
  );
}

function Item({
  value,
  onSelect,
  icon,
  tint,
  right,
  children,
}: {
  value: string;
  onSelect: () => void;
  icon: ReactNode;
  tint?: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Command.Item
      value={value}
      onSelect={onSelect}
      className={cn(
        "group/item relative flex h-11 cursor-pointer items-center gap-3 rounded-[12px] px-2.5 text-14 text-ink-2 transition-colors duration-[var(--dur-fast)]",
        "data-[selected=true]:bg-surface-3 data-[selected=true]:text-ink",
        "before:absolute before:top-2.5 before:bottom-2.5 before:left-0 before:w-[3px] before:scale-y-0 before:rounded-r-full before:bg-signal before:transition-transform data-[selected=true]:before:scale-y-100",
      )}
    >
      <span
        className="grid size-7 shrink-0 place-items-center rounded-[9px] border border-line bg-surface-2 text-ink-3 transition-colors group-data-[selected=true]/item:text-ink"
        style={tint ? { color: tint } : undefined}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {right}
    </Command.Item>
  );
}
