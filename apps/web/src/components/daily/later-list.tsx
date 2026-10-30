"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import { BookmarkPlus, Check, FileText, Puzzle, Trash2, Video } from "lucide-react";
import { toast } from "sonner";
import { Button, EmptyState, SegmentedControl, Tag, cn, inputClasses } from "@upsolve/ui";
import { removeSaved, saveForLater, setSavedDone, setSavedTopic } from "@/app/actions/daily";
import type { SavedItem } from "@/lib/daily-data";

type Filter = "todo" | "video" | "article" | "problem" | "done";
const KIND_ICON = { video: Video, article: FileText, problem: Puzzle, other: FileText } as const;

const href = (s: SavedItem) => {
  if (s.kind !== "video" || !s.atSeconds) return s.url;
  try {
    const u = new URL(s.url);
    u.searchParams.set("t", `${s.atSeconds}s`);
    return u.toString();
  } catch {
    return s.url;
  }
};
const stamp = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;

/** Videos, articles and problems saved from anywhere, filed under a topic. */
export function LaterList({
  items,
  topics,
}: {
  items: SavedItem[];
  topics: { id: string; label: string }[];
}) {
  const [filter, setFilter] = useState<Filter>("todo");
  const [url, setUrl] = useState("");
  const [pending, start] = useTransition();
  const [list, apply] = useOptimistic(
    items,
    (s, op: { id: string; done?: boolean; removed?: boolean; topic?: string | null }) =>
      op.removed
        ? s.filter((i) => i.id !== op.id)
        : s.map((i) =>
            i.id === op.id
              ? {
                  ...i,
                  done: op.done ?? i.done,
                  topic: (op.topic !== undefined ? op.topic : i.topic) as SavedItem["topic"],
                }
              : i,
          ),
  );
  const shown = useMemo(
    () =>
      list.filter((i) =>
        filter === "done" ? i.done : !i.done && (filter === "todo" || i.kind === filter),
      ),
    [list, filter],
  );
  const count = (f: Filter) =>
    list.filter((i) => (f === "done" ? i.done : !i.done && (f === "todo" || i.kind === f))).length;
  const label = (id: string | null) => topics.find((t) => t.id === id)?.label;

  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const u = url.trim();
          if (!u) return;
          start(async () => {
            const res = await saveForLater(u);
            if (res.ok) {
              setUrl("");
              toast.success("Saved for later");
            } else toast.error(res.error);
          });
        }}
        className="flex gap-2"
      >
        <label htmlFor="later-url" className="sr-only">
          Link to save
        </label>
        <input
          id="later-url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste a YouTube, article or problem link"
          className={inputClasses({ className: "flex-1" })}
        />
        <Button type="submit" variant="secondary" loading={pending} disabled={!url.trim()}>
          <BookmarkPlus size={15} aria-hidden="true" /> Save
        </Button>
      </form>

      <div className="-mx-1 max-w-[calc(100%+0.5rem)] self-start overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
        <SegmentedControl
          label="Show"
          size="sm"
          value={filter}
          onChange={setFilter}
          items={[
            { value: "todo", label: "To watch/read", count: count("todo") },
            { value: "video", label: "Videos", count: count("video") },
            { value: "article", label: "Articles", count: count("article") },
            { value: "problem", label: "Problems", count: count("problem") },
            { value: "done", label: "Done", count: count("done") },
          ]}
        />
      </div>

      {shown.length === 0 ? (
        <EmptyState
          icon={<BookmarkPlus size={18} />}
          title={
            <>
              Nothing saved <em>here.</em>
            </>
          }
        >
          Right-click any page and choose &ldquo;Save to DsaKaro&rdquo;, or use the extension
          button. YouTube saves remember the minute you were at.
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-2">
          {shown.map((s) => {
            const Icon = KIND_ICON[s.kind];
            return (
              <li
                key={s.id}
                className={cn(
                  "surface-inset group/row flex flex-wrap items-center gap-3 rounded-[14px] px-3.5 py-3",
                  s.done && "opacity-70",
                )}
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-[10px] border border-line bg-surface-2 text-ink-2">
                  <Icon size={16} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <a
                    href={href(s)}
                    target="_blank"
                    rel="noreferrer"
                    className="block truncate text-[13.5px] font-[600] hover:underline"
                  >
                    {s.title}
                  </a>
                  <span className="flex flex-wrap items-center gap-1.5 text-11 text-ink-3">
                    {new URL(s.url).hostname.replace(/^www\./, "")}
                    {s.atSeconds ? (
                      <Tag className="h-5 px-1.5 text-11">at {stamp(s.atSeconds)}</Tag>
                    ) : null}
                    {label(s.topic) && (
                      <Tag tone="revise" className="h-5 px-1.5 text-11">
                        {label(s.topic)}
                      </Tag>
                    )}
                  </span>
                </span>
                <select
                  aria-label="Topic"
                  value={s.topic ?? ""}
                  onChange={(e) => {
                    const t = e.target.value || null;
                    start(async () => {
                      apply({ id: s.id, topic: t });
                      await setSavedTopic(s.id, t);
                    });
                  }}
                  className="h-8 rounded-full border border-line-2 bg-surface-2 px-2.5 text-12 text-ink-2"
                >
                  <option value="">No topic</option>
                  {topics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <Button
                  size="sm"
                  variant={s.done ? "ghost" : "secondary"}
                  onClick={() =>
                    start(async () => {
                      apply({ id: s.id, done: !s.done });
                      await setSavedDone(s.id, !s.done);
                    })
                  }
                >
                  <Check size={14} aria-hidden="true" /> {s.done ? "Undo" : "Done"}
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`Delete ${s.title}`}
                  className="hover:text-bad"
                  onClick={() =>
                    start(async () => {
                      apply({ id: s.id, removed: true });
                      await removeSaved(s.id);
                    })
                  }
                >
                  <Trash2 size={14} aria-hidden="true" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// DsaKaro
