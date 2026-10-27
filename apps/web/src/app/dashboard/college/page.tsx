import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Eye, GraduationCap, Lock, Trophy } from "lucide-react";
import {
  ButtonArrow,
  Card,
  CardHeader,
  CardSub,
  CardTitle,
  EmptyState,
  SkeletonCard,
  buttonClasses,
} from "@upsolve/ui";
import { Leaderboard, MetricTabs, ScoreExplainer } from "@/components/leaderboard";
import { PAGE_GLOW, PageHeader } from "@/components/page-header";
import { RangeControl } from "@/components/range-control";
import { PrefSwitch } from "@/components/social";
import { getCurrentUser, isDemoUser } from "@/lib/auth";
import { getProfile } from "@/lib/data";
import { BOARD_METRICS, BOARD_TZ, getCollegeBoards, type BoardMetric } from "@/lib/social-data";
import { localWeekStart, requestNow } from "@/lib/time";

export const metadata: Metadata = { title: "Your college" };

const icon = (Icon: typeof Trophy) => <Icon size={14} strokeWidth={2} />;

export default function CollegePage({ searchParams }: PageProps<"/dashboard/college">) {
  return (
    <div className="flex flex-col gap-6">
      <Suspense
        fallback={
          <div className="grid grid-cols-12 gap-3.5">
            <SkeletonCard lines={8} className="col-span-12 h-[520px] xl:col-span-8" />
            <SkeletonCard lines={4} className="col-span-12 h-[320px] xl:col-span-4" />
          </div>
        }
      >
        <CollegeContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function CollegeContent({
  searchParams,
}: {
  searchParams: PageProps<"/dashboard/college">["searchParams"];
}) {
  const sp = await searchParams;
  const metric: BoardMetric = BOARD_METRICS.find((m) => m.value === sp.by)?.value ?? "consistency";
  const scope: "batch" | "college" = sp.board === "college" ? "college" : "batch";
  const user = await getCurrentUser();
  if (isDemoUser(user)) return <p className="text-ink-2">Sign in to see your college.</p>;
  const profile = await getProfile(user.id);
  const collegeName = profile?.college?.shortName ?? profile?.college?.name ?? "Your college";

  const header = (subtitle: string, actions?: React.ReactNode) => (
    <PageHeader
      eyebrow="College · leaderboards"
      glow={PAGE_GLOW.college}
      title={
        <>
          {collegeName}, <em>this week.</em>
        </>
      }
      subtitle={subtitle}
      actions={actions}
    />
  );

  if (!profile?.collegeId) {
    return (
      <>
        {header("Batch and college leaderboards")}
        <Card>
          <EmptyState
            icon={<GraduationCap size={18} />}
            title={
              <>
                Add your college <em>first.</em>
              </>
            }
            action={
              <Link href="/onboarding" className={buttonClasses({ variant: "signal" })}>
                Edit profile <ButtonArrow />
              </Link>
            }
          >
            College and batch leaderboards use the college on your profile.
          </EmptyState>
        </Card>
      </>
    );
  }

  if (!profile.onLeaderboards) {
    return (
      <>
        {header("Opt-in, and only visible to students who opt in")}
        <div className="grid grid-cols-12 gap-3.5">
          <Card tier="hero" beam className="col-span-12 flex flex-col gap-5 xl:col-span-7">
            <div className="flex items-start justify-between gap-4">
              <span className="grid size-12 place-items-center rounded-[14px] bg-white/12">
                <Lock size={20} aria-hidden="true" />
              </span>
              <span className="flex items-center gap-3 rounded-full bg-white/10 py-1.5 pr-1.5 pl-3.5 text-13">
                Appear on the boards
                <PrefSwitch
                  pref="onLeaderboards"
                  initial={false}
                  label="Appear on college boards"
                />
              </span>
            </div>
            <div>
              <p className="text-30 leading-tight font-[600] tracking-[-0.03em]">
                Join {collegeName}&apos;s <em className="font-display font-normal">boards.</em>
              </p>
              <p className="mt-2 max-w-[60ch] text-14 leading-relaxed text-white/75">
                Boards are opt-in: only students who switch this on appear, and only they can see
                the boards. Never your email, notes or sessions. Switch it off any time.
              </p>
            </div>
          </Card>
          <Card className="col-span-12 xl:col-span-5">
            <CardHeader>
              <CardTitle icon={icon(Eye)} tint="var(--info)">
                What others see
              </CardTitle>
            </CardHeader>
            <div className="surface-inset flex items-center gap-3 rounded-[14px] p-3">
              <span className="grid size-9 place-items-center rounded-full bg-[linear-gradient(135deg,var(--violet),var(--primary))] text-12 font-[600] text-white">
                {(profile.name ?? profile.handle ?? "Y")[0]?.toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-13 font-[600]">
                  {profile.name ?? "You"}
                  {profile.handle && (
                    <span className="ml-1.5 text-11 font-normal text-ink-3">@{profile.handle}</span>
                  )}
                </span>
                <span className="block text-11 text-ink-3">
                  active days · revisions · focus · solved · best rating
                </span>
              </span>
              <span className="num text-20 text-ink-3">—</span>
            </div>
            <p className="mt-3 text-12 text-ink-3">
              This week&apos;s numbers only. Weeks run Monday to Sunday, India time.
            </p>
          </Card>
          <Card className="col-span-12">
            <ScoreExplainer />
          </Card>
        </div>
      </>
    );
  }

  const boards = await getCollegeBoards(user.id, localWeekStart(BOARD_TZ, requestNow()));
  const rows = scope === "batch" ? (boards?.batchRows ?? []) : (boards?.collegeRows ?? []);
  const href = (s: "batch" | "college", m: BoardMetric) => {
    const q = new URLSearchParams();
    if (s === "college") q.set("board", "college");
    if (m !== "consistency") q.set("by", m);
    const qs = q.toString();
    return `/dashboard/college${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      {header(
        scope === "batch"
          ? `Batch ${profile.gradYear ?? ""} · this week`
          : "Whole college · this week",
        <span className="flex items-center gap-3 text-13 text-ink-2">
          On the boards
          <PrefSwitch pref="onLeaderboards" initial label="Appear on college boards" />
        </span>,
      )}

      <div className="stagger-in grid grid-cols-12 gap-3.5">
        <Card className="col-span-12 xl:col-span-8">
          <CardHeader className="flex-wrap">
            <RangeControl
              label="Board"
              value={scope}
              items={(["batch", "college"] as const).map((s) => ({
                value: s,
                label: s === "batch" ? `Batch ${profile.gradYear ?? ""}` : "College",
                href: href(s, metric),
              }))}
            />
            <MetricTabs metric={metric} href={(m) => href(scope, m)} />
          </CardHeader>
          <Leaderboard
            rows={rows}
            metric={metric}
            viewerId={user.id}
            empty={
              rows.length === 0
                ? "Nobody else is on this board yet. Share Upsolve with your batch."
                : "Nobody here has a contest rating yet."
            }
          />
        </Card>

        <div className="col-span-12 flex flex-col gap-3.5 xl:col-span-4">
          <Card>
            <CardHeader>
              <CardTitle icon={icon(Trophy)} tint="var(--signal-mark)">
                How it ranks
              </CardTitle>
            </CardHeader>
            <ScoreExplainer />
            <p className="mt-3 text-12 leading-relaxed text-ink-3">
              Weeks run Monday to Sunday, India time. Contest rating is your best current rating
              across connected platforms.
            </p>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle icon={icon(GraduationCap)} tint="var(--info)">
                On the boards
              </CardTitle>
              <CardSub>{boards?.collegeRows.length ?? 0} students</CardSub>
            </CardHeader>
            <p className="text-13 leading-relaxed text-ink-2">
              {boards?.batchRows.length ?? 0} from your batch, {boards?.collegeRows.length ?? 0}{" "}
              from {collegeName}. For a smaller circle, make a{" "}
              <Link href="/dashboard/groups" className="underline">
                friend group
              </Link>
              .
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}
