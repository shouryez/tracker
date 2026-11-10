import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Play, Puzzle } from "lucide-react";
import {
  ButtonArrow,
  Card,
  CardHeader,
  CardSub,
  CardTitle,
  SkeletonCard,
  buttonClasses,
} from "@upsolve/ui";
import { PAGE_GLOW, PageHeader } from "@/components/page-header";
import { formatEta } from "@/components/progress";
import { BookCover } from "@/components/sheet-identity";
import { FollowButton } from "@/components/sheets";
import { getCurrentUser, isDemoUser } from "@/lib/auth";
import { getLatestSolveAcrossSheets, getSheetSummaries } from "@/lib/sheets-data";
import { getExtensionTokens } from "@/lib/sessions-data";

export const metadata: Metadata = { title: "Sheets" };

export default function SheetsPage() {
  return (
    <div className="flex flex-col gap-6">
      <Suspense
        fallback={
          <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 5 }, (_, i) => (
              <SkeletonCard key={i} lines={3} className="h-[300px]" />
            ))}
          </div>
        }
      >
        <SheetsContent />
      </Suspense>
    </div>
  );
}

async function SheetsContent() {
  const user = await getCurrentUser();
  if (isDemoUser(user)) return <p className="text-ink-2">Sign in to track sheets.</p>;
  const [sheets, tokens, latest] = await Promise.all([
    getSheetSummaries(user.id),
    getExtensionTokens(user.id),
    getLatestSolveAcrossSheets(user.id),
  ]);
  const followed = sheets.filter((s) => s.following);
  const others = sheets.filter((s) => !s.following);
  const hero = followed[0];

  return (
    <>
      <PageHeader
        eyebrow="Sheets · curated lists"
        glow={PAGE_GLOW.sheets}
        title="Sheets"
        subtitle="Solve a problem once and it's ticked on every sheet that has it."
        actions={
          hero && (
            <Link
              href={`/dashboard/sheets/${hero.slug}`}
              className={buttonClasses({ variant: "signal", size: "sm" })}
            >
              <Play size={13} aria-hidden="true" /> Continue {hero.name.replace(/'s\b.*$/, "")}
            </Link>
          )
        }
      />

      {tokens.length === 0 && (
        <Card tier="inset" className="flex flex-wrap items-center gap-3">
          <Puzzle size={16} aria-hidden="true" className="text-ink-3" />
          <p className="min-w-0 flex-1 text-13 text-ink-2">
            Ticks come from problems we&apos;ve seen you solve. Without the extension we only see
            your last 20 LeetCode solves.
          </p>
          <Link
            href="/extension/connect"
            className={buttonClasses({ variant: "secondary", size: "sm" })}
          >
            Import full history <ButtonArrow />
          </Link>
        </Card>
      )}

      <Card className="lamp p-6">
        <CardHeader>
          <CardTitle>Your shelf</CardTitle>
          <CardSub>
            {followed.length} following · {sheets.length} sheets
          </CardSub>
        </CardHeader>
        <ul className="grid grid-cols-2 items-end gap-5 sm:grid-cols-3 lg:grid-cols-5">
          {[...followed, ...others].map((s) => (
            <li key={s.id} className="group/book relative flex flex-col gap-3">
              <Link
                href={`/dashboard/sheets/${s.slug}`}
                aria-label={`${s.name}: ${s.done} of ${s.total} done`}
              >
                <BookCover
                  slug={s.slug}
                  name={s.name}
                  author={s.author}
                  done={s.done}
                  total={s.total}
                  main={s.id === hero?.id}
                />
              </Link>
              <div className="flex items-center justify-between gap-2 px-0.5">
                <span className="tnum font-mono text-12 text-ink-2">
                  {s.done} / {s.total}
                </span>
                <FollowButton sheetId={s.id} following={s.following} />
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <div className="flex flex-wrap items-start gap-4">
        <Card className="min-w-0 flex-[2_1_560px]">
          <CardHeader>
            <CardTitle>Progress</CardTitle>
            <span className="flex gap-3 text-12 text-ink-3">
              <span className="flex items-center gap-1.5">
                <i className="size-2 rounded-full bg-easy" /> easy
              </span>
              <span className="flex items-center gap-1.5">
                <i className="size-2 rounded-full bg-medium" /> medium
              </span>
              <span className="flex items-center gap-1.5">
                <i className="size-2 rounded-full bg-hard" /> hard
              </span>
            </span>
          </CardHeader>
          <ul className="flex flex-col">
            {[...followed, ...others].map((s) => (
              <li
                key={s.id}
                className="grid grid-cols-[minmax(0,160px)_minmax(0,1fr)_56px] items-center gap-4 border-t border-line py-3.5 first:border-t-0"
              >
                <Link href={`/dashboard/sheets/${s.slug}`} className="min-w-0">
                  <span className="block truncate font-[550] hover:underline">{s.name}</span>
                  <span className="block truncate text-12 text-ink-3">
                    {s.following
                      ? s.eta
                        ? `done by ${formatEta(s.eta)} at this pace`
                        : "following"
                      : "not following"}
                  </span>
                </Link>
                <span className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-surface-4">
                  {(["easy", "medium", "hard"] as const).map((d) =>
                    s.doneBy[d] ? (
                      <i
                        key={d}
                        className="block h-full"
                        style={{
                          width: `${(s.doneBy[d] / Math.max(1, s.total)) * 100}%`,
                          background: `var(--${d})`,
                        }}
                      />
                    ) : null,
                  )}
                  {s.done - s.doneBy.easy - s.doneBy.medium - s.doneBy.hard > 0 && (
                    <i
                      className="block h-full bg-ink-3"
                      style={{
                        width: `${((s.done - s.doneBy.easy - s.doneBy.medium - s.doneBy.hard) / Math.max(1, s.total)) * 100}%`,
                      }}
                    />
                  )}
                </span>
                <span className="tnum text-right font-mono text-13">
                  {Math.round((s.done / Math.max(1, s.total)) * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </Card>

        {latest && (
          <Card className="min-w-0 flex-[1_1_320px]">
            <CardHeader>
              <CardTitle>One solve, many ticks</CardTitle>
            </CardHeader>
            <SolveSpokes title={latest.title} sheets={latest.sheets} />
            <p className="mt-2 text-12 text-ink-3">
              Your last solve, {latest.title}, ticked {latest.sheets.filter((x) => x.has).length} of
              your {latest.sheets.length} sheets.
            </p>
          </Card>
        )}
      </div>
    </>
  );
}

/** The latest solve in the middle, every sheet around it; lit spokes for sheets that have it. */
function SolveSpokes({
  title,
  sheets,
}: {
  title: string;
  sheets: { name: string; has: boolean }[];
}) {
  const n = Math.max(1, sheets.length);
  return (
    <svg
      viewBox="0 0 300 200"
      className="h-auto w-full"
      role="img"
      aria-label={`${title} is on ${sheets.filter((x) => x.has).length} of ${sheets.length} sheets`}
    >
      {sheets.map((sh, i) => {
        const a = (i / n) * 2 * Math.PI - Math.PI / 2;
        const x = 150 + Math.cos(a) * 104;
        const y = 100 + Math.sin(a) * 70;
        const label = sh.name
          .replace(/'s\b/, "")
          .replace(/ Sheet$/, "")
          .replace(/ DSA$/, "");
        return (
          <g key={sh.name}>
            <line
              x1="150"
              y1="100"
              x2={x}
              y2={y}
              stroke={sh.has ? "var(--signal)" : "var(--line-2)"}
              strokeWidth="1.2"
              strokeDasharray={sh.has ? undefined : "3 3"}
            />
            <rect
              x={x - 42}
              y={y - 12}
              width="84"
              height="24"
              rx="12"
              fill="var(--surface-3)"
              stroke={sh.has ? "var(--signal)" : "var(--line-2)"}
            />
            <text
              x={x}
              y={y + 3.5}
              textAnchor="middle"
              fontSize="10"
              fill={sh.has ? "var(--ink)" : "var(--ink-3)"}
            >
              {label.length > 14 ? `${label.slice(0, 13)}…` : label}
            </text>
          </g>
        );
      })}
      <circle
        cx="150"
        cy="100"
        r="28"
        fill="var(--color-signal-soft)"
        stroke="var(--signal)"
        strokeWidth="1.5"
      />
      <text x="150" y="104" textAnchor="middle" fontSize="9.5" fontWeight="600" fill="var(--ink)">
        {title.length > 12 ? `${title.slice(0, 11)}…` : title}
      </text>
    </svg>
  );
}
