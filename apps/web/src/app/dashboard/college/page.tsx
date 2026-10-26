import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { GraduationCap, Trophy } from "lucide-react";
import { ButtonArrow, Card, CardHeader, CardSub, CardTitle, buttonClasses, cn } from "@upsolve/ui";
import { Leaderboard, MetricTabs, ScoreExplainer } from "@/components/leaderboard";
import { PrefSwitch } from "@/components/social";
import { getCurrentUser, isDemoUser } from "@/lib/auth";
import { getProfile } from "@/lib/data";
import { BOARD_METRICS, BOARD_TZ, getCollegeBoards, type BoardMetric } from "@/lib/social-data";
import { localWeekStart, requestNow } from "@/lib/time";

export const metadata: Metadata = { title: "Your college" };

const icon = (Icon: typeof Trophy) => <Icon size={13} strokeWidth={2} />;

export default function CollegePage({ searchParams }: PageProps<"/dashboard/college">) {
  return (
    <div className="flex flex-col gap-5">
      <Suspense fallback={<div className="h-[600px] skeleton rounded-lg" />}>
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

  const heading = (sub: string) => (
    <h1 className="text-[clamp(26px,3.4vw,38px)] leading-[1.02] font-[550] tracking-[-0.04em]">
      {profile?.college?.shortName ?? profile?.college?.name ?? "Your college"}
      <span className="block text-ink-3">{sub}</span>
    </h1>
  );

  if (!profile?.collegeId) {
    return (
      <>
        {heading("Leaderboards")}
        <Card className="flex flex-wrap items-center gap-4">
          <p className="min-w-0 flex-1 text-[15px]">
            <span className="text-ink-3">Add your college first.</span> College and batch
            leaderboards use the college on your profile.
          </p>
          <Link href="/onboarding" className={buttonClasses({ variant: "signal" })}>
            Edit profile <ButtonArrow />
          </Link>
        </Card>
      </>
    );
  }

  if (!profile.onLeaderboards) {
    return (
      <>
        {heading("Leaderboards")}
        <Card className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[17px] font-[550] tracking-[-0.02em]">
                Join your college&apos;s boards
              </p>
              <p className="mt-1 max-w-[60ch] text-[13.5px] leading-relaxed text-ink-2">
                Boards are opt-in: only students who switch this on appear, and only they can see
                the boards. Others see your name, handle and this week&apos;s numbers (active days,
                revisions, focus time, problems solved, best contest rating). Never your email,
                notes or sessions. Switch it off any time.
              </p>
            </div>
            <PrefSwitch pref="onLeaderboards" initial={false} label="Appear on college boards" />
          </div>
          <ScoreExplainer />
        </Card>
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
      <div className="flex flex-wrap items-end justify-between gap-4">
        {heading(
          scope === "batch"
            ? `Batch ${profile.gradYear ?? ""} · this week`
            : "Whole college · this week",
        )}
        <span className="flex items-center gap-3 text-[13px] text-ink-2">
          On the boards
          <PrefSwitch pref="onLeaderboards" initial label="Appear on college boards" />
        </span>
      </div>

      <div className="grid grid-cols-12 gap-3.5">
        <Card className="col-span-12 xl:col-span-8">
          <CardHeader className="flex-wrap">
            <nav aria-label="Board" className="flex rounded-full border border-line bg-surface p-1">
              {(["batch", "college"] as const).map((s) => (
                <Link
                  key={s}
                  href={href(s, metric)}
                  scroll={false}
                  aria-current={s === scope ? "page" : undefined}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-[12.5px] transition-colors duration-[240ms]",
                    s === scope ? "bg-ink text-bg" : "text-ink-2 hover:text-ink",
                  )}
                >
                  {s === "batch" ? `Batch ${profile.gradYear ?? ""}` : "College"}
                </Link>
              ))}
            </nav>
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
              <CardTitle icon={icon(Trophy)}>How it ranks</CardTitle>
            </CardHeader>
            <ScoreExplainer />
            <p className="mt-3 text-[12.5px] leading-relaxed text-ink-3">
              Weeks run Monday to Sunday, India time. Contest rating is your best current rating
              across connected platforms.
            </p>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle icon={icon(GraduationCap)}>On the boards</CardTitle>
              <CardSub>{boards?.collegeRows.length ?? 0} students</CardSub>
            </CardHeader>
            <p className="text-[13px] leading-relaxed text-ink-2">
              {boards?.batchRows.length ?? 0} from your batch, {boards?.collegeRows.length ?? 0}{" "}
              from {profile.college?.shortName ?? profile.college?.name}. For a smaller circle, make
              a{" "}
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
