import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import {
  AtSign,
  BellRing,
  BookOpen,
  CalendarClock,
  Code2,
  Flame,
  Globe,
  GraduationCap,
  Mail,
  Plug,
  Puzzle,
  RotateCcw,
  ShieldCheck,
  Target,
  Timer,
  UserRound,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { ButtonArrow, Card, CardHeader, CardTitle, SkeletonCard, buttonClasses } from "@upsolve/ui";
import { PAGE_GLOW, PageHeader } from "@/components/page-header";
import { PlatformConnections } from "@/components/platform-connections";
import { PrefSwitch } from "@/components/social";
import { getCurrentUser, isDemoUser } from "@/lib/auth";
import { getProfile } from "@/lib/data";
import { CURRENT_YEARS, GOALS } from "@/lib/profile-options";
import { getExtensionTokens } from "@/lib/sessions-data";
import { getStreakFreezes } from "@/lib/social-data";
import { bestHour } from "@/lib/daily-data";
import { getMyVerification } from "@/lib/verification";
import { CollegeVerification } from "@/components/college-verification";
import { localDate, requestNow } from "@/lib/time";
import { ExtensionTokens } from "./extension-tokens";
import { LearningSettings } from "./learning-settings";
import { PublicToggle } from "./public-toggle";
import { ReminderSettings } from "./reminder-settings";
import { SectionNav } from "./section-nav";
import { StreakFreezes } from "./streak-freezes";

export const metadata: Metadata = { title: "Settings" };

const SECTIONS = [
  { id: "profile", label: "Profile" },
  { id: "verify", label: "College verification" },
  { id: "platforms", label: "Platforms" },
  { id: "extension", label: "Extension" },
  { id: "learning", label: "Revision & email" },
  { id: "reminders", label: "Reminders" },
  { id: "social", label: "Social & privacy" },
  { id: "streak", label: "Streak freeze" },
  { id: "public", label: "Public profile" },
];

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Settings"
        glow={PAGE_GLOW.settings}
        title={
          <>
            Settings, <em>make it yours.</em>
          </>
        }
        subtitle="Profile, platforms, revision and privacy. Everything saves as you change it."
      />
      <div className="grid gap-6 lg:grid-cols-[200px_minmax(0,1fr)]">
        <SectionNav sections={SECTIONS} />
        <div className="flex max-w-[880px] min-w-0 flex-col gap-4">
          <Suspense
            fallback={
              <>
                <SkeletonCard lines={4} className="h-[220px]" />
                <SkeletonCard lines={4} className="h-[260px]" />
              </>
            }
          >
            <SettingsContent />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

async function SettingsContent() {
  const user = await getCurrentUser();
  if (isDemoUser(user)) {
    return <p className="text-ink-2">Sign in to manage your settings.</p>;
  }
  const [profile, tokens, freezes] = await Promise.all([
    getProfile(user.id),
    getExtensionTokens(user.id),
    getStreakFreezes(user.id),
  ]);
  const [best, verification] = await Promise.all([
    bestHour(user.id, profile?.timezone ?? "Asia/Kolkata"),
    getMyVerification(user.id),
  ]);
  const now = requestNow();
  const today = localDate(profile?.timezone ?? "Asia/Kolkata", now);
  const icon = (I: typeof Plug) => <I size={14} strokeWidth={2} />;
  const initials = (profile?.name ?? user.email ?? "U")
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  return (
    <>
      <Card id="profile" className="scroll-mt-24">
        <CardHeader>
          <CardTitle icon={icon(UserRound)} tint="var(--violet)">
            Profile
          </CardTitle>
          <Link href="/onboarding" className={buttonClasses({ variant: "secondary", size: "sm" })}>
            Edit profile
          </Link>
        </CardHeader>
        <div className="mb-5 flex items-center gap-4">
          <span className="grid size-16 place-items-center overflow-hidden rounded-full bg-[linear-gradient(135deg,var(--violet),var(--ember))] text-20 font-[600] text-white ring-4 ring-violet-soft">
            {user.avatarUrl ? (
              // Google avatar, already sized by the provider.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatarUrl}
                alt=""
                referrerPolicy="no-referrer"
                className="size-full object-cover"
              />
            ) : (
              initials
            )}
          </span>
          <div className="min-w-0">
            <p className="truncate text-20 font-[600]">{profile?.name ?? "—"}</p>
            <p className="truncate text-13 text-ink-3">
              {profile?.handle ? `@${profile.handle}` : "no handle yet"} · {user.email ?? ""}
            </p>
          </div>
        </div>
        <dl className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          <Item icon={GraduationCap} label="College">
            {profile?.college?.name ?? "—"}
          </Item>
          <Item icon={BookOpen} label="Branch">
            {profile?.branch ?? "—"}
          </Item>
          <Item icon={CalendarClock} label="Year">
            {CURRENT_YEARS.find((c) => c.value === profile?.currentYear)?.label ?? "—"}
            {profile?.gradYear ? ` · grad ${profile.gradYear}` : ""}
          </Item>
          <Item icon={Target} label="Goal">
            {GOALS.find((g) => g.value === profile?.goal)?.label ?? "—"}
          </Item>
          <Item icon={Code2} label="Language">
            {profile?.mainLanguage ?? "—"}
          </Item>
          <Item icon={Timer} label="Daily goal">
            {profile ? `${profile.dailyGoalMin} min` : "—"}
          </Item>
          <Item icon={AtSign} label="Handle">
            {profile?.handle ? `@${profile.handle}` : "—"}
          </Item>
          <Item icon={Mail} label="Email">
            {user.email ?? "—"}
          </Item>
        </dl>
      </Card>

      <Card id="verify" className="scroll-mt-24">
        <CardHeader>
          <CardTitle icon={icon(ShieldCheck)} tint="var(--violet)">
            College verification
          </CardTitle>
        </CardHeader>
        <CollegeVerification state={verification} />
      </Card>

      <Card id="platforms" className="scroll-mt-24">
        <CardHeader>
          <CardTitle icon={icon(Plug)} tint="var(--info)">
            Platforms
          </CardTitle>
        </CardHeader>
        <PlatformConnections userId={user.id} />
      </Card>

      <Card id="extension" className="scroll-mt-24">
        <CardHeader>
          <CardTitle icon={icon(Puzzle)} tint="var(--signal-mark)">
            Browser extension
          </CardTitle>
          <Link
            href="/extension/connect"
            className={buttonClasses({ variant: "secondary", size: "sm" })}
          >
            Connect a browser <ButtonArrow />
          </Link>
        </CardHeader>
        <ExtensionTokens
          now={now}
          tokens={tokens.map((t) => ({
            id: t.id,
            label: t.label,
            createdAt: t.createdAt.toISOString(),
            lastUsedAt: t.lastUsedAt?.toISOString() ?? null,
          }))}
        />
      </Card>

      {profile && (
        <Card id="learning" className="scroll-mt-24">
          <CardHeader>
            <CardTitle icon={icon(RotateCcw)} tint="var(--violet)">
              Revision &amp; email
            </CardTitle>
          </CardHeader>
          <LearningSettings
            initial={{ reviewCap: profile.reviewCap, weeklyEmail: profile.weeklyEmail }}
          />
        </Card>
      )}

      {profile && (
        <Card id="reminders" className="scroll-mt-24">
          <CardHeader>
            <CardTitle icon={icon(BellRing)} tint="var(--medium)">
              Reminders
            </CardTitle>
          </CardHeader>
          <ReminderSettings
            best={best}
            initial={{
              remindersOn: profile.remindersOn,
              reminderHour: profile.reminderHour,
              contestReminders: profile.contestReminders,
            }}
          />
        </Card>
      )}

      {profile && (
        <Card id="social" className="scroll-mt-24">
          <CardHeader>
            <CardTitle icon={icon(UsersRound)} tint="#ff6bb5">
              Social &amp; privacy
            </CardTitle>
          </CardHeader>
          <div className="flex flex-col gap-4">
            <PrefRow
              title="College & batch leaderboards"
              description="Show your name and this week's numbers to other opted-in students at your college, and see theirs."
            >
              <PrefSwitch
                pref="onLeaderboards"
                initial={profile.onLeaderboards}
                label="Appear on college boards"
              />
            </PrefRow>
            <div className="h-px bg-line" />
            <PrefRow
              title="Show what I'm solving to my groups"
              description="Friend-group study rooms show your current problem and timer while the extension is running."
            >
              <PrefSwitch pref="shareLive" initial={profile.shareLive} label="Share live status" />
            </PrefRow>
          </div>
        </Card>
      )}

      <Card id="streak" className="scroll-mt-24">
        <CardHeader>
          <CardTitle icon={icon(Flame)} tint="var(--ember)">
            Exam-week streak freeze
          </CardTitle>
        </CardHeader>
        <StreakFreezes freezes={freezes} today={today} />
      </Card>

      <Card id="public" className="scroll-mt-24">
        <CardHeader>
          <CardTitle icon={icon(Globe)} tint="var(--easy)">
            Public profile
          </CardTitle>
          {profile && <PublicToggle isPublic={profile.isPublic} />}
        </CardHeader>
        <p className="text-13 text-ink-2">
          A shareable page with your heatmap, solved counts, ratings and top topics. Your email,
          college year and verification codes are never shown.
        </p>
        {profile?.handle && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <code className="surface-inset rounded-full px-3.5 py-2 font-mono text-12 text-ink-2">
              dsakaro.site/u/{profile.handle}
            </code>
            {profile.isPublic && (
              <Link
                href={`/u/${profile.handle}`}
                className={buttonClasses({ variant: "secondary", size: "sm" })}
              >
                View profile <ButtonArrow />
              </Link>
            )}
          </div>
        )}
      </Card>
    </>
  );
}

function Item({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="surface-inset flex min-w-0 items-center gap-3 rounded-[12px] px-3 py-2.5">
      <Icon size={15} aria-hidden="true" className="shrink-0 text-ink-3" />
      <div className="min-w-0">
        <dt className="label-mono">{label}</dt>
        <dd className="truncate text-13 font-[550]">{children}</dd>
      </div>
    </div>
  );
}

function PrefRow({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-14 font-[550]">{title}</p>
        <p className="mt-0.5 text-13 text-ink-3">{description}</p>
      </div>
      {children}
    </div>
  );
}
