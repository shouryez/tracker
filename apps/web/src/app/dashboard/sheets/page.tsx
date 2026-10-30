import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ExternalLink, Play, Puzzle } from "lucide-react";
import { ButtonArrow, Card, ProgressRing, SkeletonCard, buttonClasses } from "@upsolve/ui";
import { TiltCard } from "@/components/fx/pointer";
import { NumberTicker } from "@/components/fx/number-ticker";
import { Dot, PAGE_GLOW, PageHeader } from "@/components/page-header";
import { formatEta } from "@/components/progress";
import { SheetCover, sheetIdentity } from "@/components/sheet-identity";
import { FollowButton } from "@/components/sheets";
import { getCurrentUser, isDemoUser } from "@/lib/auth";
import { getSheetSummaries, type SheetSummary } from "@/lib/sheets-data";
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
  const [sheets, tokens] = await Promise.all([
    getSheetSummaries(user.id),
    getExtensionTokens(user.id),
  ]);
  const followed = sheets.filter((s) => s.following);
  const others = sheets.filter((s) => !s.following);
  const hero = followed[0];
  const rest = [...followed.slice(1), ...others];
  const doneAll = sheets.reduce((n, s) => n + s.done, 0);

  return (
    <>
      <PageHeader
        eyebrow="Sheets · curated lists"
        glow={PAGE_GLOW.sheets}
        title={
          <>
            Sheets, <em>ticked for you.</em>
          </>
        }
        subtitle={
          <>
            <span>{followed.length} following</span>
            <Dot />
            <span>
              {doneAll} ticks across {sheets.length} sheets
            </span>
          </>
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

      {hero && <ContinueHero s={hero} />}
      {!hero && (
        <p className="text-14 text-ink-2">
          Follow the sheets you&apos;re working through and their progress shows on your dashboard.
        </p>
      )}

      <div className="stagger-in grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">
        {rest.map((s) => (
          <SheetCard key={s.id} s={s} />
        ))}
      </div>
    </>
  );
}

function ContinueHero({ s }: { s: SheetSummary }) {
  const { color } = sheetIdentity(s.slug, s.name);
  const pct = Math.round((s.done / Math.max(1, s.total)) * 100);
  return (
    <Card tier="hero" beam className="grid items-center gap-6 p-6 md:grid-cols-[auto_1fr_auto]">
      <ProgressRing
        total={Math.max(1, s.total)}
        size={150}
        stroke={13}
        className="[&_circle:first-of-type]:stroke-white/15"
        segments={[{ label: "Done", value: s.done, color }]}
        aria-label={`${s.done} of ${s.total} done`}
      >
        <span className="num text-36">
          <NumberTicker value={pct} />
          <span className="text-[.55em] text-white/60">%</span>
        </span>
        <span className="tnum text-11 text-white/65">
          {s.done} / {s.total}
        </span>
      </ProgressRing>
      <div className="min-w-0">
        <p className="label-mono text-white/60">Continue where you left off</p>
        <p className="mt-1 text-30 leading-tight font-[600] tracking-[-0.03em]">
          {s.name.replace(/'s.*$/, "")}{" "}
          <em className="font-display font-normal">
            {s.name.match(/'s(.*)$/)?.[1]?.trim() ?? "sheet"}
          </em>
        </p>
        <p className="mt-2 text-13 text-white/70">
          {s.doneRecently > 0 ? `${s.doneRecently} ticked recently` : "No ticks yet this month"}
          {s.eta ? ` · done by ${formatEta(s.eta)} at your pace` : ""} · {s.autoTracked} tick
          automatically
        </p>
      </div>
      <div className="flex flex-wrap gap-2 md:flex-col">
        <Link
          href={`/dashboard/sheets/${s.slug}`}
          className={buttonClasses({ variant: "signal", size: "lg" })}
        >
          <Play size={15} aria-hidden="true" /> Continue <ButtonArrow />
        </Link>
        <FollowButton sheetId={s.id} following={s.following} />
      </div>
    </Card>
  );
}

function SheetCard({ s }: { s: SheetSummary }) {
  const { color } = sheetIdentity(s.slug, s.name);
  const pct = Math.round((s.done / Math.max(1, s.total)) * 100);
  return (
    <TiltCard className="rounded-lg">
      <Card interactive spotlight className="flex h-full flex-col gap-4 p-0">
        <SheetCover
          slug={s.slug}
          name={s.name}
          className="h-24 rounded-t-[inherit] border-b border-line"
        />
        <div className="flex flex-1 flex-col gap-4 px-[18px] pb-[18px]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Link
                href={`/dashboard/sheets/${s.slug}`}
                className="block text-17 font-[600] tracking-[-0.02em] after:absolute after:inset-0 hover:underline"
              >
                {s.name}
              </Link>
              {s.author && (
                <a
                  href={s.sourceUrl ?? undefined}
                  target="_blank"
                  rel="noreferrer"
                  className="relative z-10 inline-flex items-center gap-1 text-12 text-ink-3 hover:text-ink"
                >
                  by {s.author} <ExternalLink size={10} aria-hidden="true" />
                </a>
              )}
            </div>
            <span className="relative z-10">
              <FollowButton sheetId={s.id} following={s.following} />
            </span>
          </div>
          <div className="mt-auto flex items-center gap-4" data-tilt-layer>
            <ProgressRing
              total={Math.max(1, s.total)}
              size={76}
              stroke={8}
              segments={[{ label: "Done", value: s.done, color }]}
              aria-label={`${s.done} of ${s.total} done`}
            >
              <span className="num text-17">{pct}%</span>
            </ProgressRing>
            <div className="min-w-0">
              <p className="num text-24">
                <NumberTicker value={s.done} />
                <span className="text-[.6em] text-ink-3"> / {s.total}</span>
              </p>
              <p className="mt-1 text-12 text-ink-3">
                {s.autoTracked} tick automatically
                {s.eta ? ` · est. ${formatEta(s.eta)}` : ""}
              </p>
            </div>
          </div>
        </div>
      </Card>
    </TiltCard>
  );
}

// DsaKaro
