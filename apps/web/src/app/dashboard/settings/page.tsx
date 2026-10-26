import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { Flame, Globe, Plug, Puzzle, RotateCcw, UserRound, UsersRound } from "lucide-react";
import { ButtonArrow, Card, CardHeader, CardTitle, buttonClasses } from "@upsolve/ui";
import { PlatformConnections } from "@/components/platform-connections";
import { getCurrentUser, isDemoUser } from "@/lib/auth";
import { getProfile } from "@/lib/data";
import { CURRENT_YEARS, GOALS } from "@/lib/profile-options";
import { getExtensionTokens } from "@/lib/sessions-data";
import { ExtensionTokens } from "./extension-tokens";
import { LearningSettings } from "./learning-settings";
import { StreakFreezes } from "./streak-freezes";
import { PrefSwitch } from "@/components/social";
import { getStreakFreezes } from "@/lib/social-data";
import { localDate, requestNow } from "@/lib/time";
import { PublicToggle } from "./public-toggle";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="flex max-w-[860px] flex-col gap-5">
      <h1 className="text-[clamp(26px,3.4vw,38px)] leading-[1.02] font-[550] tracking-[-0.04em]">
        Settings<span className="block text-ink-3">Profile, platforms and revision</span>
      </h1>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-lg bg-surface" />}>
        <SettingsContent />
      </Suspense>
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
  const today = localDate(profile?.timezone ?? "Asia/Kolkata", requestNow());
  const icon = (I: typeof Plug) => <I size={13} strokeWidth={2} />;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle icon={icon(UserRound)}>Profile</CardTitle>
          <Link href="/onboarding" className={buttonClasses({ variant: "secondary", size: "sm" })}>
            Edit
          </Link>
        </CardHeader>
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-3">
          <Item label="Name">{profile?.name ?? "—"}</Item>
          <Item label="Handle">{profile?.handle ? `@${profile.handle}` : "—"}</Item>
          <Item label="Email">{user.email ?? "—"}</Item>
          <Item label="College">{profile?.college?.name ?? "—"}</Item>
          <Item label="Branch">{profile?.branch ?? "—"}</Item>
          <Item label="Year">
            {CURRENT_YEARS.find((c) => c.value === profile?.currentYear)?.label ?? "—"}
            {profile?.gradYear ? ` · graduating ${profile.gradYear}` : ""}
          </Item>
          <Item label="Goal">{GOALS.find((g) => g.value === profile?.goal)?.label ?? "—"}</Item>
          <Item label="Language">{profile?.mainLanguage ?? "—"}</Item>
          <Item label="Daily goal">{profile ? `${profile.dailyGoalMin} min` : "—"}</Item>
        </dl>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle icon={icon(Plug)}>Platforms</CardTitle>
        </CardHeader>
        <PlatformConnections userId={user.id} />
      </Card>

      <Card>
        <CardHeader>
          <CardTitle icon={icon(Puzzle)}>Browser extension</CardTitle>
          <Link
            href="/extension/connect"
            className={buttonClasses({ variant: "secondary", size: "sm" })}
          >
            Connect a browser
          </Link>
        </CardHeader>
        <ExtensionTokens
          tokens={tokens.map((t) => ({
            id: t.id,
            label: t.label,
            createdAt: t.createdAt.toISOString(),
            lastUsedAt: t.lastUsedAt?.toISOString() ?? null,
          }))}
        />
      </Card>

      {profile && (
        <Card id="learning" className="scroll-mt-6">
          <CardHeader>
            <CardTitle icon={icon(RotateCcw)}>Revision &amp; email</CardTitle>
          </CardHeader>
          <LearningSettings
            initial={{ reviewCap: profile.reviewCap, weeklyEmail: profile.weeklyEmail }}
          />
        </Card>
      )}

      {profile && (
        <Card id="social" className="scroll-mt-6">
          <CardHeader>
            <CardTitle icon={icon(UsersRound)}>Social &amp; privacy</CardTitle>
          </CardHeader>
          <div className="flex flex-col divide-y divide-dashed divide-line-2">
            <div className="flex items-center justify-between gap-4 pb-3.5">
              <div className="min-w-0">
                <p className="text-[13.5px] font-medium">College &amp; batch leaderboards</p>
                <p className="text-[12.5px] text-ink-3">
                  Show your name and this week&apos;s numbers to other opted-in students at your
                  college, and see theirs.
                </p>
              </div>
              <PrefSwitch
                pref="onLeaderboards"
                initial={profile.onLeaderboards}
                label="Appear on college boards"
              />
            </div>
            <div className="flex items-center justify-between gap-4 pt-3.5">
              <div className="min-w-0">
                <p className="text-[13.5px] font-medium">Show what I&apos;m solving to my groups</p>
                <p className="text-[12.5px] text-ink-3">
                  Friend-group study rooms show your current problem and timer while the extension
                  is running.
                </p>
              </div>
              <PrefSwitch pref="shareLive" initial={profile.shareLive} label="Share live status" />
            </div>
          </div>
        </Card>
      )}

      <Card id="streak" className="scroll-mt-6">
        <CardHeader>
          <CardTitle icon={icon(Flame)}>Exam-week streak freeze</CardTitle>
        </CardHeader>
        <StreakFreezes freezes={freezes} today={today} />
      </Card>

      <Card>
        <CardHeader>
          <CardTitle icon={icon(Globe)}>Public profile</CardTitle>
          {profile && <PublicToggle isPublic={profile.isPublic} />}
        </CardHeader>
        <p className="text-[13px] text-ink-2">
          A shareable page with your heatmap, solved counts, ratings and top topics. Your email,
          college year and verification codes are never shown.
        </p>
        {profile?.handle && profile.isPublic && (
          <Link
            href={`/u/${profile.handle}`}
            className={buttonClasses({ variant: "secondary", size: "sm", className: "mt-4" })}
          >
            View /u/{profile.handle} <ButtonArrow />
          </Link>
        )}
      </Card>
    </>
  );
}

function Item({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="font-mono text-[10.5px] tracking-[.08em] text-ink-3 uppercase">{label}</dt>
      <dd className="truncate text-[13.5px]">{children}</dd>
    </div>
  );
}
