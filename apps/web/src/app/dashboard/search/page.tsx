import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Check, Search } from "lucide-react";
import {
  Card,
  CardHeader,
  CardSub,
  CardTitle,
  DifficultyTag,
  EmptyState,
  SkeletonCard,
  Tag,
  cn,
  inputClasses,
} from "@upsolve/ui";
import { PageHeader } from "@/components/page-header";
import { TOPICS, type Difficulty } from "@upsolve/core";
import { getCurrentUser, isDemoUser } from "@/lib/auth";
import { getProfile } from "@/lib/data";
import { getLearning } from "@/lib/learning";
import { search, type SearchFilters } from "@/lib/search-data";
import { localDay, requestNow } from "@/lib/time";

export const metadata: Metadata = { title: "Search" };

export default function SearchPage({ searchParams }: PageProps<"/dashboard/search">) {
  return (
    <div className="flex flex-col gap-5">
      <Suspense fallback={<SkeletonCard lines={8} className="h-[420px]" />}>
        <Results searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Results({
  searchParams,
}: {
  searchParams: PageProps<"/dashboard/search">["searchParams"];
}) {
  const sp = await searchParams;
  const str = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");
  const q = str(sp.q).trim().slice(0, 100);
  const d = DIFFS.find((x) => x.id === str(sp.d))?.id;
  const st = STATUSES.find((x) => x.id === str(sp.s))?.id;
  const t = TOPICS.find((x) => x.id === str(sp.t))?.id;
  const filtered = Boolean(d || st || t);
  const user = await getCurrentUser();
  if (isDemoUser(user)) return <p className="text-ink-2">Sign in to search.</p>;

  const title = (
    <PageHeader
      eyebrow="Search"
      title={
        q ? (
          <>
            Results for <em>“{q}”</em>
          </>
        ) : filtered ? (
          <>
            Filtered <em>problems.</em>
          </>
        ) : (
          <>
            Search, <em>anything.</em>
          </>
        )
      }
      subtitle={
        q || filtered ? undefined : "Problems, sheets and topics. Ctrl K opens this from anywhere."
      }
    />
  );
  const box = (
    <form action="/dashboard/search" role="search" className="flex flex-col gap-3">
      <label className="relative block max-w-[640px]">
        <span className="sr-only">Search</span>
        <Search
          size={16}
          aria-hidden="true"
          className="absolute top-1/2 left-4 -translate-y-1/2 text-ink-3"
        />
        <input
          name="q"
          defaultValue={q}
          placeholder="Search a problem, sheet or topic"
          autoFocus={!q && !filtered}
          className={cn(inputClasses(), "h-12 rounded-full pl-11 text-15")}
        />
      </label>
      {d && <input type="hidden" name="d" value={d} />}
      {st && <input type="hidden" name="s" value={st} />}
      {t && <input type="hidden" name="t" value={t} />}
      <Filters q={q} d={d} s={st} t={t} />
      {!q && !filtered && (
        <div className="flex flex-wrap gap-1.5">
          {["subarray", "linked list", "binary search", "dp", "graphs", "two pointers"].map((t) => (
            <Link
              key={t}
              href={`/dashboard/search?q=${encodeURIComponent(t)}`}
              className="glass-control rounded-full px-3 py-1.5 text-13 text-ink-2 transition-colors hover:text-ink"
            >
              {t}
            </Link>
          ))}
        </div>
      )}
    </form>
  );
  if (q.length < 2 && !filtered)
    return (
      <>
        {title}
        {box}
      </>
    );

  const filters: SearchFilters = { difficulty: d, status: st, topic: t };
  if (st === "due") {
    const [learning, profile] = await Promise.all([getLearning(user.id), getProfile(user.id)]);
    const { end } = localDay(profile?.timezone ?? "Asia/Kolkata", requestNow());
    filters.dueIds = learning
      .filter((p) => !p.state.retired && p.state.dueAt <= end)
      .map((p) => p.problemId);
  }
  const r = await search(user.id, q, filters);
  const empty = r.problems.length + r.sheets.length + r.topics.length === 0;

  return (
    <>
      {title}
      {box}
      {empty ? (
        <Card>
          <EmptyState
            mascot="thinking"
            title={
              <>
                Nothing <em>matches.</em>
              </>
            }
          >
            Try part of a problem title, like &ldquo;subarray&rdquo; or &ldquo;linked list&rdquo;.
          </EmptyState>
        </Card>
      ) : (
        <div className="grid grid-cols-12 gap-3.5">
          <Card
            className={cn("col-span-12", r.sheets.length + r.topics.length > 0 && "xl:col-span-8")}
          >
            <CardHeader>
              <CardTitle>Problems</CardTitle>
              <CardSub>{r.problems.length === 30 ? "first 30" : r.problems.length}</CardSub>
            </CardHeader>
            {r.problems.length === 0 ? (
              <p className="text-[13px] text-ink-2">No problems match.</p>
            ) : (
              <ul>
                {r.problems.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center gap-3 border-t border-line py-2.5 first:border-t-0 first:pt-0"
                  >
                    <span
                      aria-label={p.solved ? "Solved" : undefined}
                      className={
                        p.solved
                          ? "grid size-[18px] shrink-0 place-items-center rounded-[5px] bg-success text-[#06210f]"
                          : "size-[18px] shrink-0 rounded-[5px] border-[1.5px] border-line-3"
                      }
                    >
                      {p.solved && <Check size={12} strokeWidth={3} aria-hidden="true" />}
                    </span>
                    <Link
                      href={`/dashboard/problems/${p.id}`}
                      className="min-w-0 flex-1 truncate text-[13.5px] font-medium hover:underline"
                    >
                      {p.title}
                    </Link>
                    {p.sheets > 0 && (
                      <span className="hidden text-12 text-ink-3 sm:inline">
                        in {p.sheets} sheet{p.sheets === 1 ? "" : "s"}
                      </span>
                    )}
                    {p.difficulty ? <DifficultyTag difficulty={p.difficulty} /> : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>
          {r.sheets.length + r.topics.length > 0 && (
            <div className="col-span-12 flex flex-col gap-3.5 xl:col-span-4">
              {r.sheets.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Sheets</CardTitle>
                  </CardHeader>
                  <ul>
                    {r.sheets.map((s) => (
                      <li
                        key={s.slug}
                        className="border-t border-line py-2 first:border-t-0 first:pt-0"
                      >
                        <Link
                          href={`/dashboard/sheets/${s.slug}`}
                          className="text-[13.5px] font-medium hover:underline"
                        >
                          {s.name}
                        </Link>
                        {s.author && <p className="text-12 text-ink-3">by {s.author}</p>}
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
              {r.topics.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Topics</CardTitle>
                    <CardSub>your mastery</CardSub>
                  </CardHeader>
                  <div className="flex flex-wrap gap-1.5">
                    {r.topics.map((t) => (
                      <Link key={t.id} href="/dashboard/analytics#mastery">
                        <Tag className="hover:border-ink-3">{t.label}</Tag>
                      </Link>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}

const DIFFS: { id: Difficulty; label: string }[] = [
  { id: "easy", label: "Easy" },
  { id: "medium", label: "Medium" },
  { id: "hard", label: "Hard" },
];
const STATUSES: { id: NonNullable<SearchFilters["status"]>; label: string }[] = [
  { id: "unsolved", label: "Unsolved" },
  { id: "solved", label: "Solved" },
  { id: "due", label: "Due to revise" },
];

/**
 * Filter chips (FEATURES-PLAN F7): difficulty, status and topic, each a link that toggles one
 * GET param and keeps the rest, so any filtered search is a shareable URL.
 */
function Filters({ q, d, s, t }: { q: string; d?: string; s?: string; t?: string }) {
  const href = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const next = { q: q || undefined, d, s, t, ...patch };
    for (const [k, v] of Object.entries(next)) if (v) p.set(k, v);
    const qs = p.toString();
    return qs ? `/dashboard/search?${qs}` : "/dashboard/search";
  };
  const chip = (on: boolean) =>
    cn(
      "rounded-full px-3 py-1 text-[12.5px] font-[550] transition-colors",
      on
        ? "bg-[color-mix(in_srgb,var(--signal)_22%,transparent)] text-ink shadow-[inset_0_0_0_1px_var(--signal-mark)]"
        : "glass-control text-ink-2 hover:text-ink",
    );
  return (
    <div className="flex flex-col gap-2" aria-label="Filters">
      <div className="flex flex-wrap items-center gap-1.5">
        {DIFFS.map((x) => (
          <Link
            key={x.id}
            href={href({ d: d === x.id ? undefined : x.id })}
            aria-current={d === x.id ? "true" : undefined}
            className={chip(d === x.id)}
          >
            {x.label}
          </Link>
        ))}
        <span className="mx-1 h-4 w-px bg-line" aria-hidden="true" />
        {STATUSES.map((x) => (
          <Link
            key={x.id}
            href={href({ s: s === x.id ? undefined : x.id })}
            aria-current={s === x.id ? "true" : undefined}
            className={chip(s === x.id)}
          >
            {x.label}
          </Link>
        ))}
        {(d || s || t) && (
          <Link
            href={href({ d: undefined, s: undefined, t: undefined })}
            className="ml-1 text-[12.5px] text-ink-3 underline-offset-2 hover:text-ink hover:underline"
          >
            Clear filters
          </Link>
        )}
      </div>
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
        {TOPICS.map((x) => (
          <Link
            key={x.id}
            href={href({ t: t === x.id ? undefined : x.id })}
            aria-current={t === x.id ? "true" : undefined}
            className={cn(chip(t === x.id), "shrink-0")}
          >
            {x.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
