import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Flame, Grid3x3, Plug, Shapes } from "lucide-react";
import {
  ButtonArrow,
  Card,
  CardHeader,
  CardSub,
  CardTitle,
  Grain,
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
import { NumberTicker } from "@/components/fx/number-ticker";
import { PLATFORM_LABEL, PLATFORM_PROFILE_URL } from "@/components/platform-meta";
import { ShareButton } from "@/components/share-button";
import { PlatformMark, platformMarkId } from "@/components/site-icons";
import { buildStats, getPublicProfile } from "@/lib/data";
import { VerifiedBadge } from "@/components/verified-badge";
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
      <div className="surface-hero border-beam relative mb-2 overflow-hidden rounded-[28px] p-6 sm:p-8">
        <Grain />
        <span aria-hidden="true" className="starfield absolute inset-0 opacity-40" />
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
            <p className="font-mono text-12 text-white/65">@{profile.handle}</p>
            <h1 className="mt-2 font-display text-[clamp(40px,6.4vw,72px)] leading-[.98] tracking-[-0.02em]">
              {profile.name ?? profile.handle}
            </h1>
            {subtitle && (
              <p className="mt-2 flex flex-wrap items-center gap-x-2 text-15 text-white/75 italic">
                {subtitle}
                {profile.collegeVerified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/12 px-2 py-0.5 text-12 font-[600] text-white not-italic">
                    <VerifiedBadge size={13} className="text-white" /> Verified student
                  </span>
                )}
              </p>
            )}
            {stats.streak > 0 && (
              <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/12 py-1 pr-3 pl-1.5 text-13 font-[600]">
                <StreakFlame streak={stats.streak} size={22} /> {stats.streak}-day streak
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="stagger-in grid grid-cols-2 gap-3.5 md:grid-cols-4">
        <ProfileStat label="Solved" value={stats.solved.total} tint="var(--violet)" />
        <ProfileStat
          label="Active days"
          value={stats.activeDays}
          unit="this year"
          tint="var(--easy)"
        />
        <ProfileStat label="Streak" value={stats.streak} unit="days" tint="var(--ember)" />
        <ProfileStat
          label="Best rating"
          value={stats.bestRating?.rating ?? 0}
          unit={stats.bestRating ? undefined : "unrated"}
          tint="var(--medium)"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle icon={<Grid3x3 size={14} />} tint="var(--primary)">
            Activity
          </CardTitle>
          <CardSub>last 52 weeks</CardSub>
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
                  className="font-mono text-[12px] font-normal text-ink-3 hover:underline"
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

function ProfileStat({
  label,
  value,
  unit,
  tint,
}: {
  label: string;
  value: number;
  unit?: string;
  tint: string;
}) {
  return (
    <Card spotlight glow={tint}>
      <CardTitle icon={<Flame size={14} />} tint={tint}>
        {label}
      </CardTitle>
      <p className="num mt-3 text-[38px]">
        {value ? <NumberTicker value={value} /> : "—"}
        {unit && (
          <small className="ml-1.5 font-display text-[.42em] font-normal tracking-normal text-ink-3 italic">
            {unit}
          </small>
        )}
      </p>
    </Card>
  );
}

/** Avatar with a progress ring: the ring's arcs are the easy / medium / hard share of solves. */
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
      ? "var(--surface-3)"
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
      className="grid size-[112px] shrink-0 place-items-center rounded-full p-[5px] shadow-[0_0_40px_-8px_var(--violet)]"
      style={{ background: ring }}
    >
      <span className="grid size-full place-items-center overflow-hidden rounded-full border-4 border-[var(--bg)] bg-[linear-gradient(135deg,#34343a,#18181b)] text-[28px] font-semibold text-white">
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

// DsaKaro
