import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, Clock3, Radio, Send, Settings2, Trophy, UsersRound } from "lucide-react";
import {
  Card,
  CardHeader,
  CardSub,
  CardTitle,
  DifficultyTag,
  Pill,
  SkeletonCard,
  Tag,
} from "@upsolve/ui";
import { CopyLinkButton } from "@/components/orbit/copy-link";
import { PEOPLE_TABS, SectionTabs } from "@/components/orbit/section-tabs";
import { NudgeButton } from "@/components/daily/nudge-button";
import { Dot, PageHeader } from "@/components/page-header";
import { Leaderboard, MetricTabs, ScoreExplainer } from "@/components/leaderboard";
import {
  AutoRefresh,
  InviteLink,
  GroupSettings,
  LeaveGroupButton,
  MemberMenu,
  LiveClock,
} from "@/components/social";
import { TimeAgo } from "@/components/time-ago";
import { getCurrentUser, isDemoUser } from "@/lib/auth";
import {
  getActiveFocus,
  getGroupLanes,
  getGroupShares,
  getNudgedToday,
  getStudyHall,
} from "@/lib/daily-data";
import { DayLanes } from "@/components/dashboard/lamplight";
import { StudyHallCard } from "@/components/study-hall";
import { getProfile } from "@/lib/data";
import { formatDuration } from "@/lib/format";
import {
  BOARD_METRICS,
  BOARD_TZ,
  getGroup,
  getGroupBoard,
  getRoom,
  type BoardMetric,
} from "@/lib/social-data";
import { localDate, localWeekStart, requestNow, studyDay } from "@/lib/time";

export const metadata: Metadata = { title: "Group" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const icon = (Icon: typeof Trophy) => <Icon size={14} strokeWidth={2} />;

export default function GroupPage({ params, searchParams }: PageProps<"/dashboard/groups/[id]">) {
  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/dashboard/groups"
        className="group/back inline-flex items-center gap-1.5 self-start text-13 text-ink-3 hover:text-ink"
      >
        <ArrowLeft
          size={14}
          aria-hidden="true"
          className="transition-transform group-hover/back:-translate-x-0.5"
        />{" "}
        Groups
      </Link>
      <Suspense
        fallback={
          <div className="grid grid-cols-12 gap-3.5">
            <SkeletonCard lines={8} className="col-span-12 h-[480px] xl:col-span-7" />
            <SkeletonCard lines={5} className="col-span-12 h-[480px] xl:col-span-5" />
          </div>
        }
      >
        <GroupContent params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function GroupContent({
  params,
  searchParams,
}: {
  params: PageProps<"/dashboard/groups/[id]">["params"];
  searchParams: PageProps<"/dashboard/groups/[id]">["searchParams"];
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!UUID.test(id)) notFound();
  const metric: BoardMetric = BOARD_METRICS.find((m) => m.value === sp.by)?.value ?? "consistency";
  const user = await getCurrentUser();
  if (isDemoUser(user)) return <p className="text-ink-2">Sign in to see groups.</p>;

  const group = await getGroup(user.id, id);
  if (!group) notFound();
  const now = requestNow();
  const profile = await getProfile(user.id);
  const dayStart = studyDay(profile?.timezone ?? BOARD_TZ, now, profile?.dayResetHour ?? 0).start;
  const [board, room, h, hall, shares, nudged, active] = await Promise.all([
    getGroupBoard(group.id, localWeekStart(BOARD_TZ, now)),
    getRoom(group.id, dayStart),
    headers(),
    getStudyHall(group.id),
    getGroupShares(group.id),
    getNudgedToday(user.id, group.id, localDate(profile?.timezone ?? BOARD_TZ, now)),
    getActiveFocus(user.id),
  ]);
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3005";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const inviteUrl = `${proto}://${host}/join/${group.inviteCode}`;
  const owner = group.role === "owner";
  const manager = owner || group.role === "admin";
  const lanes = await getGroupLanes(group.id);
  const liveCount = room.filter((m) => m.live && !m.live.solved).length;

  return (
    <>
      <AutoRefresh seconds={15} />
      <SectionTabs tabs={PEOPLE_TABS} />
      <PageHeader
        eyebrow="Group · study hall"
        title={group.name}
        subtitle={
          <>
            <span>
              {group.members.length} member{group.members.length === 1 ? "" : "s"}
            </span>
            {liveCount > 0 && (
              <>
                <Dot />
                <span className="inline-flex items-center gap-2 text-ink">
                  <span className="live-dot" aria-hidden="true" />
                  {liveCount} solving now
                </span>
              </>
            )}
          </>
        }
        actions={
          <>
            <CopyLinkButton url={inviteUrl} />
            <LeaveGroupButton groupId={group.id} owner={owner} />
          </>
        }
      />

      {/* The study hall comes first, across the page. */}
      <StudyHallCard
        groupName={group.name}
        members={hall}
        viewerId={user.id}
        serverNow={now}
        active={active}
        buddy={profile?.avatar ?? null}
      />

      <div className="stagger-in grid grid-cols-12 gap-3.5">
        {/* Today: who's on, then the day by hour. */}
        <Card className="col-span-12 xl:col-span-5">
          <CardHeader>
            <CardTitle icon={icon(Radio)}>Study room</CardTitle>
            <Pill tone={liveCount > 0 ? "ember" : "neutral"}>
              {liveCount > 0 && <span className="live-dot" aria-hidden="true" />}
              {liveCount > 0 ? `${liveCount} live` : "updates every 20 s"}
            </Pill>
          </CardHeader>
          <ul className="flex flex-col">
            {room.map((m) => {
              const me = m.userId === user.id;
              const solving = !!m.live && !m.live.solved;
              return (
                <li
                  key={m.userId}
                  className="flex items-start gap-3 rounded-[14px] px-2 py-2.5 transition-colors hover:bg-[color-mix(in_srgb,var(--ink)_4%,transparent)]"
                >
                  <span className="mt-1.5 grid size-2.5 place-items-center">
                    <span
                      aria-label={solving ? "Solving now" : m.live?.solved ? "Just solved" : "Idle"}
                      className={
                        solving
                          ? "live-dot"
                          : m.live?.solved
                            ? "block size-2.5 rounded-full bg-signal"
                            : "block size-2.5 rounded-full bg-line-3"
                      }
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-[550]">
                      {m.name ?? m.handle ?? "Someone"}
                      {me && <span className="ml-1.5 text-11 font-normal text-ink-3">you</span>}
                    </span>
                    {m.live ? (
                      <span className="flex items-center gap-2 text-[12.5px] text-ink-2">
                        <a
                          href={m.live.url}
                          target="_blank"
                          rel="noreferrer"
                          className="min-w-0 truncate hover:underline"
                        >
                          {m.live.solved ? "Just solved " : ""}
                          {m.live.title}
                        </a>
                        {solving && (
                          <LiveClock
                            activeMs={m.live.activeMs}
                            ageSeconds={m.live.ageSeconds}
                            running
                          />
                        )}
                      </span>
                    ) : (
                      <span className="block text-12 text-ink-3">
                        {m.lastActiveAt ? (
                          <>
                            active <TimeAgo date={m.lastActiveAt} />
                          </>
                        ) : (
                          "no activity yet"
                        )}
                      </span>
                    )}
                  </span>
                  <span className="tnum flex flex-col items-end gap-1 text-right text-12 text-ink-3">
                    <span>
                      {m.solvedToday} today · {formatDuration(m.focusTodayMs)}
                    </span>
                    {!me && m.solvedToday === 0 && !solving && (
                      <NudgeButton
                        groupId={group.id}
                        toUser={m.userId}
                        name={m.name ?? m.handle ?? "them"}
                        already={nudged.includes(m.userId)}
                      />
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 border-t border-line pt-3 text-12 leading-relaxed text-ink-3">
            Open a problem with the extension and your group sees it here. You can turn this off in
            Settings.
          </p>
        </Card>

        <Card className="col-span-12 flex flex-col xl:col-span-7">
          <CardHeader>
            <CardTitle icon={icon(Clock3)}>Today, by hour</CardTitle>
            <CardSub>one row per person · last 12 hours</CardSub>
          </CardHeader>
          <DayLanes
            lanes={lanes}
            from={now - 12 * 3_600_000}
            now={now}
            timeZone={profile?.timezone ?? "Asia/Kolkata"}
            viewerId={user.id}
          />
          {/* The group's day in three numbers; sits at the bottom so the card has no gap. */}
          <dl className="mt-auto grid grid-cols-3 gap-2.5 pt-5">
            {[
              { label: "Studying now", value: String(liveCount) },
              {
                label: "Solved today",
                value: String(room.reduce((n, m) => n + m.solvedToday, 0)),
              },
              {
                label: "Focus today",
                value: formatDuration(room.reduce((n, m) => n + m.focusTodayMs, 0)),
              },
            ].map((x) => (
              <div
                key={x.label}
                className="surface-inset flex flex-col gap-1 rounded-[16px] px-3.5 py-3"
              >
                <dt className="text-12 text-ink-3">{x.label}</dt>
                <dd className="num font-display text-[22px] leading-none">{x.value}</dd>
              </div>
            ))}
          </dl>
        </Card>

        {/* This week: the board, then the people. */}
        <Card className="col-span-12 xl:col-span-7">
          <CardHeader className="flex-wrap">
            <CardTitle icon={icon(Trophy)}>This week</CardTitle>
            <MetricTabs
              metric={metric}
              href={(m) =>
                m === "consistency"
                  ? `/dashboard/groups/${group.id}`
                  : `/dashboard/groups/${group.id}?by=${m}`
              }
            />
          </CardHeader>
          <Leaderboard
            rows={board}
            metric={metric}
            viewerId={user.id}
            empty={
              metric === "rating"
                ? "Nobody here has a contest rating yet."
                : "Nobody has practised this week yet."
            }
          />
          <div className="mt-5 border-t border-line pt-4">
            <ScoreExplainer />
          </div>
        </Card>

        <div className="col-span-12 flex flex-col gap-3.5 xl:col-span-5">
          {shares.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle icon={icon(Send)}>Solve this together</CardTitle>
                <CardSub>shared problems</CardSub>
              </CardHeader>
              <ul className="flex flex-col gap-2.5">
                {shares.map((sh) => (
                  <li key={sh.id} className="surface-inset rounded-[16px] p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/dashboard/problems/${sh.problemId}`}
                        className="text-[13.5px] font-[600] hover:underline"
                      >
                        {sh.title}
                      </Link>
                      {sh.difficulty && <DifficultyTag difficulty={sh.difficulty} />}
                    </div>
                    <p className="mt-0.5 text-12 text-ink-3">
                      from {sh.from}
                      {sh.note ? ` · “${sh.note}”` : ""}
                    </p>
                    {sh.members.length > 0 ? (
                      <ul className="mt-2 flex flex-wrap gap-1.5">
                        {sh.members.map((mm) => (
                          <li key={mm.userId}>
                            <Pill tone={mm.solved ? "mint" : "neutral"} className="h-6 text-11">
                              {mm.name}
                              {mm.solved
                                ? mm.bestMs
                                  ? ` · ${formatDuration(mm.bestMs)}`
                                  : " · solved"
                                : ` · ${mm.attempts} tries`}
                            </Pill>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-12 text-ink-3">Nobody has tried it yet.</p>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card className="flex-1">
            <CardHeader>
              <CardTitle icon={icon(UsersRound)}>Members</CardTitle>
              <CardSub>{group.members.length} of 50</CardSub>
            </CardHeader>
            <ul>
              {group.members.map((m) => (
                <li
                  key={m.userId}
                  className="flex items-center gap-2 rounded-[12px] px-2 py-2 transition-colors hover:bg-[color-mix(in_srgb,var(--ink)_4%,transparent)]"
                >
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[color-mix(in_srgb,var(--ink)_8%,transparent)] text-11 font-[650] text-ink-2">
                    {(m.name ?? m.handle ?? "?")[0]?.toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[13.5px]">
                    {m.name ?? m.handle ?? "Someone"}
                    {m.handle && <span className="ml-1.5 text-11 text-ink-3">@{m.handle}</span>}
                  </span>
                  {m.userId === user.id && <Pill className="h-5 px-2 text-11">you</Pill>}
                  {m.role === "owner" && (
                    <Pill tone="mint" className="h-5 px-2 text-11">
                      owner
                    </Pill>
                  )}
                  {m.role === "admin" && <Tag tone="info">admin</Tag>}
                  <MemberMenu
                    groupId={group.id}
                    member={{ userId: m.userId, name: m.name ?? m.handle ?? "them", role: m.role }}
                    viewerRole={group.role}
                    self={m.userId === user.id}
                  />
                </li>
              ))}
            </ul>
            <div className="mt-4 border-t border-line pt-4">
              <p className="mb-2.5 text-13 font-[600] text-ink-2">Invite</p>
              <InviteLink groupId={group.id} url={inviteUrl} canReset={manager} />
            </div>
          </Card>

          {manager && (
            <Card>
              <CardHeader>
                <CardTitle icon={icon(Settings2)}>Group settings</CardTitle>
                <CardSub>{owner ? "you own this group" : "you're an admin"}</CardSub>
              </CardHeader>
              <GroupSettings groupId={group.id} name={group.name} />
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
