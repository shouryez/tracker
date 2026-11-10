"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Dumbbell, Printer, Search } from "lucide-react";
import { toast } from "sonner";
import { Button, Card, DifficultyTag, EmptyState, Tag, cn, inputClasses } from "@upsolve/ui";
import { addProblemsToPlan } from "@/app/actions/daily";
import type { MistakePattern, NotebookEntry } from "@/lib/daily-data";

type Topic = { id: string; label: string };

/** Searchable pattern notebook, grouped by topic, printable as a PDF cheat sheet. */
export function NotebookView({ entries, topics }: { entries: NotebookEntry[]; topics: Topic[] }) {
  const [q, setQ] = useState("");
  const [topic, setTopic] = useState<string>("all");
  const label = (id: string | null) => topics.find((t) => t.id === id)?.label ?? "Other";

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = entries.filter(
      (e) =>
        (topic === "all" || e.topic === topic) &&
        (!needle ||
          e.title.toLowerCase().includes(needle) ||
          e.takeaway?.toLowerCase().includes(needle) ||
          e.note?.toLowerCase().includes(needle)),
    );
    const map = new Map<string, NotebookEntry[]>();
    for (const e of filtered) map.set(e.topic ?? "", [...(map.get(e.topic ?? "") ?? []), e]);
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [entries, q, topic]);

  const used = topics.filter((t) => entries.some((e) => e.topic === t.id));

  if (entries.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<Search size={18} />}
          title={
            <>
              Your notebook builds <em>itself.</em>
            </>
          }
        >
          After each Accepted, the extension asks for the pattern and a one-line takeaway. Those,
          plus your problem notes, collect here by topic.
        </EmptyState>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="glass flex flex-wrap items-center gap-2.5 rounded-[18px] border border-line px-3 py-2.5 shadow-e1 print:hidden">
        <label className="relative min-w-[220px] flex-1">
          <span className="sr-only">Search notebook</span>
          <Search
            size={14}
            aria-hidden="true"
            className="absolute top-1/2 left-3 -translate-y-1/2 text-ink-3"
          />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search problems, takeaways, notes"
            className={inputClasses({ icon: true, className: "h-[38px]" })}
          />
        </label>
        <select
          aria-label="Topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className={inputClasses({ className: "h-[38px] w-auto" })}
        >
          <option value="all">All topics</option>
          {used.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
        <Button variant="secondary" size="sm" onClick={() => window.print()}>
          <Printer size={14} aria-hidden="true" /> Print / PDF
        </Button>
      </div>

      {/* Index cards, one per topic, laid out like a notebook spread. */}
      <div className="columns-1 gap-4 md:columns-2 xl:columns-3">
        {groups.map(([t, list]) => (
          <section
            key={t}
            className="surface-card mb-4 break-inside-avoid rounded-lg p-[18px] [background-image:repeating-linear-gradient(180deg,transparent_0_27px,var(--line)_27px_28px)] [background-position:0_64px] [background-repeat:no-repeat] [background-size:100%_calc(100%-64px)]"
          >
            <div className="mb-3 flex flex-col gap-2">
              <span className="flex items-center gap-2">
                <span className="label-mono">{label(t || null)}</span>
                <span className="ml-auto tnum text-12 text-ink-3">
                  {list.length} problem{list.length === 1 ? "" : "s"}
                </span>
              </span>
              <span className="rekha">
                <i style={{ width: `${Math.min(100, list.length * 20)}%` }} />
              </span>
            </div>
            <ul className="flex flex-col">
              {list.map((e) => (
                <li key={e.problemId} className="border-t border-line py-2.5 first:border-t-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/dashboard/problems/${e.problemId}`}
                      className="text-[13.5px] font-[600] hover:underline"
                    >
                      {e.title}
                    </Link>
                    {e.difficulty && <DifficultyTag difficulty={e.difficulty} />}
                    {e.mistakes.map((m) => (
                      <Tag key={m} tone="wa" className="h-5 px-1.5 text-11">
                        {m.replace(/-/g, " ")}
                      </Tag>
                    ))}
                  </div>
                  {e.takeaway && (
                    <p className="mt-1.5 text-13 text-ink">
                      <span className="mr-1.5 text-signal-text">→</span>
                      {e.takeaway}
                    </p>
                  )}
                  {e.note && (
                    <p className="mt-1 line-clamp-3 text-12 whitespace-pre-line text-ink-2">
                      {e.note}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      {groups.length === 0 && <p className="text-13 text-ink-3">Nothing matches.</p>}
    </div>
  );
}

/** Repeated mistakes, worded plainly, each with a one-tap drill. */
export function MistakeJournal({
  mistakes,
  verdicts,
  topics,
}: {
  mistakes: MistakePattern[];
  verdicts: { topic: string; wa: number; tle: number; total: number }[];
  topics: Topic[];
}) {
  const [pending, start] = useTransition();
  const label = (id: string | null) => topics.find((t) => t.id === id)?.label ?? "Other topics";

  if (mistakes.length === 0 && verdicts.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<Dumbbell size={18} />}
          title={
            <>
              No repeated mistakes <em>yet.</em>
            </>
          }
        >
          When a solve had wrong answers, the extension asks what tripped you up. Patterns show up
          here with problems to drill.
        </EmptyState>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3.5">
      {mistakes.map((m) => (
        <Card key={`${m.topic}:${m.tag}`} className="flex flex-col gap-3">
          <p className="text-15">
            You keep hitting{" "}
            <Tag tone="wa" className="mx-0.5 align-middle">
              {m.label}
            </Tag>{" "}
            in <span className="font-[600]">{label(m.topic)}</span>{" "}
            <span className="tnum text-ink-3">
              ({m.count} of {m.sessions} sessions)
            </span>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {m.problems.map((p) => (
              <Link
                key={p.id}
                href={`/dashboard/problems/${p.id}`}
                className="rounded-full border border-line-2 px-2.5 py-1 text-12 transition-colors hover:border-line-3 hover:bg-surface-2"
              >
                {p.title}
              </Link>
            ))}
            <Button
              size="sm"
              variant="secondary"
              loading={pending}
              className="ml-auto"
              onClick={() =>
                start(async () => {
                  const res = await addProblemsToPlan(m.problems.slice(0, 3).map((p) => p.id));
                  if (res.ok) toast.success("Drill added to today");
                  else toast.error(res.error);
                })
              }
            >
              <Dumbbell size={14} aria-hidden="true" /> Drill these
            </Button>
          </div>
        </Card>
      ))}
      {verdicts.length > 0 && (
        <Card>
          <p className="mb-3 label-mono">Where submissions fail (last 120 days)</p>
          <ul className="flex flex-col gap-2.5">
            {verdicts.map((v) => {
              const bad = ((v.wa + v.tle) / v.total) * 100;
              return (
                <li
                  key={v.topic}
                  className="grid grid-cols-[140px_1fr_auto] items-center gap-3 text-13"
                >
                  <span className="truncate">{v.topic}</span>
                  <span className="flex h-2 overflow-hidden rounded-full bg-surface-3">
                    <span
                      className="h-full bg-v-wa"
                      style={{ width: `${(v.wa / v.total) * 100}%` }}
                    />
                    <span
                      className="h-full bg-v-tle"
                      style={{ width: `${(v.tle / v.total) * 100}%` }}
                    />
                  </span>
                  <span className={cn("tnum text-12", bad > 50 ? "text-hard" : "text-ink-3")}>
                    {Math.round(bad)}% fail
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 flex gap-3 text-11 text-ink-3">
            <span className="flex items-center gap-1">
              <i className="size-2 rounded-[2px] bg-v-wa" /> wrong answer
            </span>
            <span className="flex items-center gap-1">
              <i className="size-2 rounded-[2px] bg-v-tle" /> time limit
            </span>
          </p>
        </Card>
      )}
    </div>
  );
}
