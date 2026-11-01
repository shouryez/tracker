import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, Link2, Radio, Send, Settings2, Timer, Trophy, UsersRound } from "lucide-react";
import {
  Card,
  CardHeader,
  CardSub,
  CardTitle,
  DifficultyTag,
  SkeletonCard,
  Tag,
} from "@upsolve/ui";
import { NudgeButton } from "@/components/daily/nudge-button";
import { Dot, PAGE_GLOW, PageHeader } from "@/components/page-header";
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
import { getGroupShares, getNudgedToday, getStudyHall } from "@/lib/daily-data";
import { StudyHall } from "@/components/study-hall";
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
const icon = (Icon: typeof Trophy) => <Icon size={13} strokeWidth={2} />;

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
  const [board, room, h, hall, shares, nudged] = await Promise.all([
    getGroupBoard(group.id, localWeekStart(BOARD_TZ, now)),
    getRoom(group.id, dayStart),
    headers(),
    getStudyHall(group.id),
    getGroupShares(group.id),
    getNudgedToday(user.id, group.id, localDate(profile?.timezone ?? BOARD_TZ, now)),
  ]);
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3005";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const inviteUrl = `${proto}://${host}/join/${group.inviteCode}`;
  const owner = group.role === "owner";
  const manager = owner || group.role === "admin";
  const liveCount = room.filter((m) => m.live && !m.live.solved).length;

  return (
    <>
      <AutoRefresh seconds={15} />
      <PageHeader
        eyebrow="Group"
        glow={PAGE_GLOW.groups}
        title={<em>{group.name}</em>}
        subtitle={
          <>
            <span>
              {group.members.length} member{group.members.length === 1 ? "" : "s"}
            </span>
            {liveCount > 0 && (
              <>
                <Dot />
                <span className="inline-flex items-center gap-1.5 text-signal-text">
                  <span className="pulse-ring size-2 rounded-full bg-signal text-signal" />
                  {liveCount} solving now
                </span>
              </>
            )}
          </>
        }
        actions={<LeaveGroupButton groupId={group.id} owner={owner} />}
      />

      <div className="stagger-in grid grid-cols-12 gap-3.5">
        <Card className="col-span-12 xl:col-span-7">
          <CardHeader className="flex-wrap">
            <CardTitle icon={icon(Trophy)} tint="var(--signal-mark)">
              This week
            </CardTitle>
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
          <Card
            glow={hall.some((m) => m.live && !m.live.pausedAt) ? "var(--signal-mark)" : undefined}
          >
            <CardHeader>
              <CardTitle icon={<Timer size={14} />} tint="var(--signal-mark)">
                Study hall
              </CardTitle>
              <CardSub>
                <span className="inline-flex items-center gap-1.5">
                  <span className="pulse-ring size-1.5 rounded-full bg-success text-success" />
                  {hall.filter((m) => m.live && !m.live.pausedAt).length} studying · live
                </span>
              </CardSub>
            </CardHeader>
            <StudyHall members={hall} viewerId={user.id} serverNow={now} />
          </Card>

          {shares.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle icon={<Send size={14} />} tint="var(--info)">
                  Solve this together
                </CardTitle>
                <CardSub>shared problems</CardSub>
              </CardHeader>
              <ul className="flex flex-col gap-3">
                {shares.map((sh) => (
                  <li key={sh.id} className="surface-inset rounded-[14px] p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/dashboard/problems/${sh.problemId}`}
                        className="text-[13.5px] font-[600] hover:underline"
                      >
                        {sh.title}
                      </Link>
                      {sh.difficulty && <DifficultyTag difficulty={sh.difficulty} />}
                    </div>
                    <p className="mt-0.5 text-11 text-ink-3">
                      from {sh.from}
                      {sh.note ? ` · “${sh.note}”` : ""}
                    </p>
                    {sh.members.length > 0 ? (
                      <ul className="mt-2 flex flex-wrap gap-1.5">
                        {sh.members.map((mm) => (
                          <li key={mm.userId}>
                            <Tag tone={mm.solved ? "success" : "neutral"} className="h-6 text-11">
                              {mm.name}
                              {mm.solved
                                ? mm.bestMs
                                  ? ` · ${formatDuration(mm.bestMs)}`
                                  : " · solved"
                                : ` · ${mm.attempts} tries`}
                            </Tag>
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

          <Card glow={liveCount > 0 ? "var(--signal-mark)" : undefined}>
            <CardHeader>
              <CardTitle icon={icon(Radio)} tint="var(--signal-mark)">
                Study room
              </CardTitle>
              <CardSub>live · updates every 20 s</CardSub>
            </CardHeader>
            <ul>
              {room.map((m) => {
                const me = m.userId === user.id;
                return (
                  <li
                    key={m.userId}
                    className="flex items-start gap-3 rounded-[12px] px-2 py-2.5 transition-colors hover:bg-surface-2/60"
                  >
                    <span className="mt-1.5">
                      <span
                        aria-label={
                          m.live && !m.live.solved
                            ? "Solving now"
                            : m.live?.solved
                              ? "Just solved"
                              : "Idle"
                        }
                        className={`block size-2.5 rounded-full ${
                          m.live && !m.live.solved
                            ? "pulse-ring bg-signal text-signal"
                            : m.live?.solved
                              ? "bg-success"
                              : "bg-line-3"
                        }`}
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-medium">
                        {m.name ?? m.handle ?? "Someone"}
                        {me && (
                          <span className="ml-1.5 font-mono text-[10.5px] text-ink-3">you</span>
                        )}
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
                          {!m.live.solved && (
                            <LiveClock
                              activeMs={m.live.activeMs}
                              ageSeconds={m.live.ageSeconds}
                              running
                            />
                          )}
                        </span>
                      ) : (
                        <span className="block font-mono text-[11px] text-ink-3">
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
                    <span className="flex flex-col items-end gap-1 text-right font-mono text-[11px] text-ink-3">
                      <span>
                        {m.solvedToday} today · {formatDuration(m.focusTodayMs)}
                      </span>
                      {!me && m.solvedToday === 0 && !(m.live && !m.live.solved) && (
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
              Open a problem with the extension and your group sees it here. You can turn this off
              in Settings.
            </p>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle icon={icon(Link2)} tint="var(--violet)">
                Invite
              </CardTitle>
            </CardHeader>
            <InviteLink groupId={group.id} url={inviteUrl} canReset={manager} />
          </Card>

          <Card>
            <CardHeader>
              <CardTitle icon={icon(UsersRound)}>Members</CardTitle>
              <CardSub>{group.members.length} of 50</CardSub>
            </CardHeader>
            <ul>
              {group.members.map((m) => (
                <li
                  key={m.userId}
                  className="flex items-center gap-2 rounded-[10px] px-2 py-2 hover:bg-surface-2/60"
                >
                  <span className="min-w-0 flex-1 truncate text-[13.5px]">
                    {m.name ?? m.handle ?? "Someone"}
                    {m.handle && (
                      <span className="ml-1.5 font-mono text-[11px] text-ink-3">@{m.handle}</span>
                    )}
                  </span>
                  {m.userId === user.id && <Tag className="h-5 px-1.5 text-11">you</Tag>}
                  {m.role === "owner" && <Tag tone="signal">owner</Tag>}
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
