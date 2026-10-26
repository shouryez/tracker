import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BadgeCheck } from "lucide-react";
import {
  ButtonArrow,
  Card,
  CardHeader,
  CardSub,
  CardTitle,
  Eyebrow,
  Logo,
  PixelHeatmap,
  Stat,
  ThemeToggle,
  buttonClasses,
} from "@upsolve/ui";
import { SolvedSplit, TopicBar } from "@/components/charts";
import { PLATFORM_LABEL, PLATFORM_PROFILE_URL } from "@/components/platform-meta";
import { buildStats, getPublicProfile } from "@/lib/data";

export async function generateMetadata({ params }: PageProps<"/u/[handle]">): Promise<Metadata> {
  const { handle } = await params;
  const image = `/api/share-card?handle=${encodeURIComponent(handle)}`;
  return {
    title: `@${handle}`,
    description: `${handle}'s DSA practice on Upsolve: solved problems, streak and contest ratings.`,
    openGraph: { images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", images: [image] },
  };
}

export default function PublicProfilePage({ params }: PageProps<"/u/[handle]">) {
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex h-[72px] w-[min(1000px,100%-32px)] items-center justify-between">
        <Link href="/" aria-label="Upsolve home">
          <Logo />
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/login" className={buttonClasses({ variant: "primary", size: "sm" })}>
            Track yours
          </Link>
        </div>
      </header>
      <main className="mx-auto w-[min(1000px,100%-32px)] pt-10 pb-24">
        <Suspense fallback={<div className="h-[600px] animate-pulse rounded-lg bg-surface" />}>
          <ProfileContent params={params} />
        </Suspense>
      </main>
    </div>
  );
}

async function ProfileContent({ params }: { params: PageProps<"/u/[handle]">["params"] }) {
  const { handle } = await params;
  const profile = await getPublicProfile(handle);
  if (!profile) notFound();

  const stats = buildStats(profile.accounts, new Date(), new Set(profile.frozenDays));
  const subtitle = [profile.college, profile.gradYear ? `Batch ${profile.gradYear}` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex flex-col gap-5">
      <div className="mb-4">
        <Eyebrow>@{profile.handle}</Eyebrow>
        <h1 className="mt-4 font-display text-[clamp(44px,7vw,80px)] leading-[.98] tracking-[-0.02em]">
          {profile.name ?? profile.handle}
          {subtitle && <span className="block text-[.5em] text-ink-3 italic">{subtitle}</span>}
        </h1>
      </div>

      <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
        <Card>
          <CardSub>SOLVED</CardSub>
          <Stat value={stats.solved.total.toLocaleString("en-IN")} className="mt-2" />
        </Card>
        <Card>
          <CardSub>ACTIVE DAYS</CardSub>
          <Stat value={stats.activeDays} unit="/ yr" className="mt-2" />
        </Card>
        <Card>
          <CardSub>STREAK</CardSub>
          <Stat value={stats.streak} unit="days" className="mt-2" />
        </Card>
        <Card>
          <CardSub>BEST RATING</CardSub>
          <Stat value={stats.bestRating?.rating ?? "—"} className="mt-2" />
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activity</CardTitle>
          <CardSub>last 52 weeks</CardSub>
        </CardHeader>
        <PixelHeatmap levels={stats.heatmap52} weeks={52} className="gap-[2px]" />
      </Card>

      <div className="grid gap-3.5 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Platforms</CardTitle>
          </CardHeader>
          {profile.accounts.map((a) => (
            <div
              key={a.id}
              className="border-t border-dashed border-line-2 py-3 first:border-t-0 first:pt-0"
            >
              <p className="mb-2 flex flex-wrap items-center gap-2 text-[14px] font-[550]">
                {PLATFORM_LABEL[a.platform]}
                {a.verified && <BadgeCheck size={14} className="text-ok" aria-label="verified" />}
                <a
                  href={PLATFORM_PROFILE_URL[a.platform]?.(a.handle)}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-[12px] font-normal text-ink-3 hover:underline"
                >
                  {a.handle}
                </a>
                <span className="ml-auto font-mono text-[12px]">
                  {a.snapshot?.rating ?? "unrated"}
                </span>
              </p>
              {a.snapshot && <SolvedSplit solved={a.snapshot.solved} />}
            </div>
          ))}
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Top topics</CardTitle>
          </CardHeader>
          {stats.topics.map((t) => (
            <TopicBar key={t.slug} name={t.name} value={t.solved} max={stats.topics[0]!.solved} />
          ))}
        </Card>
      </div>

      <div className="mt-6 flex justify-center">
        <Link href="/login" className={buttonClasses({ variant: "signal" })}>
          Build your own profile <ButtonArrow />
        </Link>
      </div>
    </div>
  );
}
