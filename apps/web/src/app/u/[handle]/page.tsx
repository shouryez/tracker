import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Plug, Shapes } from "lucide-react";
import {
  ButtonArrow,
  Card,
  CardHeader,
  CardSub,
  CardTitle,
  Logo,
  PixelHeatmap,
  SkeletonCard,
  ThemeToggle,
  VerifiedChip,
  buttonClasses,
} from "@upsolve/ui";
import { SolvedSplit, TopicBar } from "@/components/charts";
import { TopicRadar } from "@/components/charts/insights";
import { StreakFlame } from "@/components/fx/decor";
import { PLATFORM_LABEL, PLATFORM_PROFILE_URL } from "@/components/platform-meta";
import { ShareButton } from "@/components/share-button";
import { PlatformMark, platformMarkId } from "@/components/site-icons";
import { buildStats, getPublicProfile } from "@/lib/data";
import { VerifiedBadge } from "@/components/verified-badge";
import { KpiStrip } from "@/components/dashboard/lamplight";
import type { SolvedCounts } from "@upsolve/adapters";

export async function generateMetadata({ params }: PageProps<"/u/[handle]">): Promise<Metadata> {
  const { handle } = await params;
  const image = `/api/share-card?handle=${encodeURIComponent(handle)}`;
  return {
    title: `@${handle}`,
    description: `${handle}'s DSA practice on DsaKaro: solved problems, streak and contest ratings.`,
    openGraph: { images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", images: [image] },
  };
}

export default function PublicProfilePage({ params }: PageProps<"/u/[handle]">) {
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex h-[72px] w-[min(1000px,100%-32px)] items-center justify-between">
        <Link href="/" aria-label="DsaKaro home">
          <Logo />
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/signup" className={buttonClasses({ variant: "signal", size: "sm" })}>
            Track yours
          </Link>
        </div>
      </header>
      <main className="mx-auto w-[min(1000px,100%-32px)] pt-10 pb-24">
        <Suspense
          fallback={
            <div className="flex flex-col gap-4">
              <SkeletonCard lines={3} className="h-[220px]" />
              <SkeletonCard lines={4} className="h-[260px]" />
            </div>
          }
        >
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
      {/* Banner: avatar inside a ring split by difficulty (easy → medium → hard). */}
      <div className="surface-card relative mb-2 overflow-hidden rounded-[24px] p-6 sm:p-8">
        <div className="absolute top-5 right-5 z-10">
          <ShareButton title={`@${profile.handle} on DsaKaro`} />
        </div>
        <div className="relative flex flex-wrap items-center gap-6">
          <AvatarRing
            name={profile.name ?? profile.handle}
            src={profile.avatarUrl}
            solved={stats.solved}
          />
          <div className="min-w-0">
            <p className="text-[13.5px] text-ink-3">@{profile.handle}</p>
            <h1 className="mt-2 font-display text-[clamp(32px,4.6vw,52px)] leading-[1]">
              {profile.name ?? profile.handle}
            </h1>
            {subtitle && (
              <p className="mt-2 flex flex-wrap items-center gap-x-2 text-14 text-ink-2">
                {subtitle}
                {profile.collegeVerified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-signal-soft px-2 py-0.5 text-12 font-[600] text-signal-text">
                    <VerifiedBadge size={13} /> Verified student
                  </span>
                )}
              </p>
            )}
            {stats.streak > 0 && (
              <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary-soft py-1 pr-3 pl-1.5 text-13 font-[600]">
                <StreakFlame streak={stats.streak} size={22} /> {stats.streak}-day streak
              </span>
            )}
          </div>
        </div>
      </div>

      <KpiStrip
        items={[
          {
            label: "Solved",
            value: stats.solved.total,
            note: `${stats.solved.easy} easy · ${stats.solved.medium} medium · ${stats.solved.hard} hard`,
          },
          { label: "Active days", value: stats.activeDays, note: "this year" },
          { label: "Streak", value: stats.streak, unit: "days", note: "current" },
          {
            label: "Best rating",
            value: stats.bestRating?.rating ?? "—",
            note: stats.bestRating ? PLATFORM_LABEL[stats.bestRating.platform] : "unrated",
          },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>The last year</CardTitle>
          <CardSub>one square per day</CardSub>
        </CardHeader>
        <PixelHeatmap levels={stats.heatmap52} weeks={52} className="gap-[2px]" />
      </Card>

      <div className="grid gap-3.5 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle icon={<Plug size={14} />} tint="var(--info)">
              Platforms
            </CardTitle>
          </CardHeader>
          {profile.accounts.map((a) => (
            <div key={a.id} className="surface-inset mb-2.5 rounded-[14px] p-3.5 last:mb-0">
              <p className="mb-2.5 flex flex-wrap items-center gap-2 text-[14px] font-[600]">
                {platformMarkId(a.platform) && (
                  <PlatformMark site={platformMarkId(a.platform)!} size={15} brand />
                )}
                {PLATFORM_LABEL[a.platform]}
                {a.verified && <VerifiedChip />}
                <a
                  href={PLATFORM_PROFILE_URL[a.platform]?.(a.handle)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-12 font-normal text-ink-3 hover:underline"
                >
                  {a.handle}
                </a>
                <span className="num ml-auto text-17">{a.snapshot?.rating ?? "—"}</span>
              </p>
              {a.snapshot && <SolvedSplit solved={a.snapshot.solved} />}
            </div>
          ))}
        </Card>
        <Card>
          <CardHeader>
            <CardTitle icon={<Shapes size={14} />} tint="var(--easy)">
              Top topics
            </CardTitle>
          </CardHeader>
          {stats.topics.length >= 3 && (
            <TopicRadar
              size={230}
              topics={stats.topics.map((t) => ({
                label: t.name,
                score: Math.round((t.solved / Math.max(1, stats.topics[0]!.solved)) * 100),
              }))}
            />
          )}
          {stats.topics.map((t, i) => (
            <TopicBar
              key={t.slug}
              name={t.name}
              value={t.solved}
              max={stats.topics[0]!.solved}
              top={i === 0}
            />
          ))}
        </Card>
      </div>

      <div className="mt-6 flex justify-center">
        <Link href="/signup" className={buttonClasses({ variant: "signal" })}>
          Build your own profile <ButtonArrow />
        </Link>
      </div>
    </div>
  );
}

function AvatarRing({
  name,
  src,
  solved,
}: {
  name: string;
  src: string | null;
  solved: SolvedCounts;
}) {
  const total = Math.max(1, solved.easy + solved.medium + solved.hard);
  const e = (solved.easy / total) * 360;
  const m = (solved.medium / total) * 360;
  const ring =
    solved.easy + solved.medium + solved.hard === 0
      ? "var(--line-2)"
      : `conic-gradient(var(--easy) 0 ${e}deg, var(--medium) ${e}deg ${e + m}deg, var(--hard) ${e + m}deg 360deg)`;
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  return (
    <span
      role="img"
      aria-label={`${solved.easy} easy, ${solved.medium} medium, ${solved.hard} hard`}
      className="grid size-[112px] shrink-0 place-items-center rounded-full p-[5px]"
      style={{ background: ring }}
    >
      <span className="grid size-full place-items-center overflow-hidden rounded-full border-4 border-[var(--bg)] bg-[color-mix(in_srgb,var(--ink)_10%,var(--bg))] text-[28px] font-semibold text-ink">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" referrerPolicy="no-referrer" className="size-full object-cover" />
        ) : (
          initials
        )}
      </span>
    </span>
  );
}
