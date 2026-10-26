import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, Link2, Radio, Trophy, UsersRound } from "lucide-react";
import { Card, CardHeader, CardSub, CardTitle, LiveDot, Tag } from "@upsolve/ui";
import { Leaderboard, MetricTabs, ScoreExplainer } from "@/components/leaderboard";
import {
  AutoRefresh,
  InviteLink,
  LeaveGroupButton,
  LiveClock,
  RemoveMemberButton,
} from "@/components/social";
import { TimeAgo } from "@/components/time-ago";
import { getCurrentUser, isDemoUser } from "@/lib/auth";
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
import { localDay, localWeekStart, requestNow } from "@/lib/time";

export const metadata: Metadata = { title: "Group" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const icon = (Icon: typeof Trophy) => <Icon size={13} strokeWidth={2} />;

export default function GroupPage({ params, searchParams }: PageProps<"/dashboard/groups/[id]">) {
  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/dashboard/groups"
        className="inline-flex items-center gap-1.5 self-start font-mono text-[11.5px] text-ink-3 hover:text-ink"
      >
        <ArrowLeft size={13} aria-hidden="true" /> Groups
      </Link>
      <Suspense fallback={<div className="h-[600px] skeleton rounded-lg" />}>
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
  const [board, room, h] = await Promise.all([
    getGroupBoard(group.id, localWeekStart(BOARD_TZ, now)),
    getRoom(group.id, localDay(profile?.timezone ?? BOARD_TZ, now).start),
    headers(),
  ]);
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3005";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const inviteUrl = `${proto}://${host}/join/${group.inviteCode}`;
  const owner = group.role === "owner";
  const liveCount = room.filter((m) => m.live && !m.live.solved).length;

  return (
    <>
      <AutoRefresh seconds={20} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-[clamp(26px,3.4vw,38px)] leading-[1.02] font-[550] tracking-[-0.04em]">
          {group.name}
          <span className="block text-ink-3">
            {group.members.length} member{group.members.length === 1 ? "" : "s"}
            {liveCount > 0 ? ` · ${liveCount} solving now` : ""}
          </span>
        </h1>
        <LeaveGroupButton groupId={group.id} owner={owner} />
      </div>

      <div className="grid grid-cols-12 gap-3.5">
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
          <div className="mt-4 border-t border-dashed border-line-2 pt-3">
            <ScoreExplainer />
          </div>
        </Card>

        <div className="col-span-12 flex flex-col gap-3.5 xl:col-span-5">
          <Card>
            <CardHeader>
              <CardTitle icon={icon(Radio)}>Study room</CardTitle>
              <CardSub>live · updates every 20 s</CardSub>
            </CardHeader>
            <ul>
              {room.map((m) => {
                const me = m.userId === user.id;
                return (
                  <li
                    key={m.userId}
                    className="flex items-start gap-3 border-t border-dashed border-line-2 py-2.5 first:border-t-0 first:pt-0"
                  >
                    <span className="mt-1.5">
                      {m.live && !m.live.solved ? (
                        <LiveDot />
                      ) : (
                        <span
                          aria-hidden="true"
                          className={`block size-2 rounded-full ${m.live?.solved ? "bg-ok" : "bg-line-2"}`}
                        />
                      )}
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
                    <span className="text-right font-mono text-[11px] text-ink-3">
                      {m.solvedToday} today
                      <span className="block">{formatDuration(m.focusTodayMs)}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 border-t border-dashed border-line-2 pt-3 text-[12px] leading-relaxed text-ink-3">
              Open a problem with the extension and your group sees it here. You can turn this off
              in Settings.
            </p>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle icon={icon(Link2)}>Invite</CardTitle>
            </CardHeader>
            <InviteLink groupId={group.id} url={inviteUrl} canReset={owner} />
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
                  className="flex items-center gap-2 border-t border-dashed border-line-2 py-2 first:border-t-0 first:pt-0"
                >
                  <span className="min-w-0 flex-1 truncate text-[13.5px]">
                    {m.name ?? m.handle ?? "Someone"}
                    {m.handle && (
                      <span className="ml-1.5 font-mono text-[11px] text-ink-3">@{m.handle}</span>
                    )}
                  </span>
                  {m.role === "owner" && <Tag mono>owner</Tag>}
                  {owner && m.userId !== user.id && (
                    <RemoveMemberButton groupId={group.id} memberId={m.userId} />
                  )}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
