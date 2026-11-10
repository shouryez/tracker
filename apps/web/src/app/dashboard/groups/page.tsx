import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Crown, Link2, Plus } from "lucide-react";
import { Card, CardHeader, CardSub, CardTitle, SkeletonCard, Tag, cn } from "@upsolve/ui";
import { PAGE_GLOW, PageHeader } from "@/components/page-header";
import { CreateGroupForm, JoinGroupForm } from "@/components/social";
import { getCurrentUser, isDemoUser } from "@/lib/auth";
import { BOARD_TZ, getGroup, getGroupBoard, getMyGroups } from "@/lib/social-data";
import { getStudyHall } from "@/lib/daily-data";
import { localWeekStart, requestNow } from "@/lib/time";
import { StudyBuddy } from "@/components/study-buddy";

function ordinal(n: number) {
  const t = n % 100;
  if (t >= 11 && t <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
}

export const metadata: Metadata = { title: "Groups" };

const icon = (Icon: typeof Plus) => <Icon size={14} strokeWidth={2} />;
const AVATAR_TINTS = ["var(--sky)", "var(--lime)", "var(--amber)", "var(--rose)"];

export default function GroupsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Groups · friends only"
        glow={PAGE_GLOW.groups}
        title="Groups"
        subtitle="A weekly leaderboard and a live study room for your circle."
      />
      <Suspense
        fallback={
          <div className="grid gap-3.5 md:grid-cols-2">
            <SkeletonCard lines={3} className="h-[220px]" />
            <SkeletonCard lines={3} className="h-[220px]" />
          </div>
        }
      >
        <GroupsContent />
      </Suspense>
    </div>
  );
}

async function GroupsContent() {
  const user = await getCurrentUser();
  if (isDemoUser(user)) return <p className="text-ink-2">Sign in to use groups.</p>;
  const groups = await getMyGroups(user.id);

  const forms = (
    <div className="grid gap-3.5 md:grid-cols-2">
      <Card spotlight glow="var(--signal-mark)">
        <CardHeader>
          <CardTitle icon={icon(Plus)} tint="var(--signal-mark)">
            Create a group
          </CardTitle>
        </CardHeader>
        <p className="mb-3 text-13 text-ink-2">
          For your hostel wing, lab batch or coding club. You get an invite link to share.
        </p>
        <CreateGroupForm />
      </Card>
      <Card spotlight glow="var(--violet)">
        <CardHeader>
          <CardTitle icon={icon(Link2)} tint="var(--violet)">
            Join with an invite
          </CardTitle>
        </CardHeader>
        <p className="mb-3 text-13 text-ink-2">
          Paste the link a friend sent you, or just the code.
        </p>
        <JoinGroupForm />
      </Card>
    </div>
  );

  if (groups.length === 0) {
    return (
      <>
        <Card tier="hero" className="flex flex-col items-center gap-4 py-10 text-center">
          <span aria-hidden="true" className="relative grid size-28 place-items-center">
            {[0, 1, 2, 3, 4].map((i) => {
              const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
              return (
                <span
                  key={i}
                  className="absolute size-8 rounded-full border-2 border-white/20"
                  style={{
                    left: `calc(50% + ${Math.cos(a) * 44}px - 16px)`,
                    top: `calc(50% + ${Math.sin(a) * 44}px - 16px)`,
                    background: AVATAR_TINTS[i],
                  }}
                />
              );
            })}
            <span className="grid size-11 place-items-center rounded-[13px] bg-white/15">
              <Crown size={20} />
            </span>
          </span>
          <p className="text-24 font-[600]">
            Better with <em className="font-display font-normal">friends.</em>
          </p>
          <p className="max-w-[54ch] text-14 text-white/75">
            A group gets its own weekly leaderboard and a study room where you can see who&apos;s
            solving what right now.
          </p>
        </Card>
        {forms}
      </>
    );
  }

  // Each group's live room and this week's board, for the cards and the leaderboard.
  const now = requestNow();
  const weekStart = localWeekStart(BOARD_TZ, now);
  const details = await Promise.all(
    groups.map(async (g) => {
      const [hall, board] = await Promise.all([getStudyHall(g.id), getGroupBoard(g.id, weekStart)]);
      const studying = hall.filter((m) => m.live && !m.live.pausedAt).length;
      const rank = board.findIndex((r) => r.userId === user.id) + 1;
      const me = board.find((r) => r.userId === user.id);
      return { g, hall, board, studying, rank, me };
    }),
  );
  const first = details[0]!;
  const invite = await getGroup(user.id, first.g.id);
  const maxSolved = Math.max(1, ...first.board.map((r) => r.solved));

  return (
    <>
      <section aria-label="Your groups" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {details.map(({ g, hall, studying, rank, me }, i) => (
          <Link
            key={g.id}
            href={`/dashboard/groups/${g.id}`}
            className={cn(
              "surface-card flex flex-col gap-4 rounded-lg p-[18px] transition-[border-color,transform] duration-[var(--dur-base)] hover:-translate-y-1 hover:border-line-2",
              i === 0 && "lamp",
            )}
          >
            <div className="flex items-center gap-2.5">
              <h2 className="truncate text-17 font-[620] tracking-[-0.02em]">{g.name}</h2>
              <span className="ml-auto shrink-0">
                {studying > 0 ? (
                  <span className="flex items-center gap-1.5 rounded-full bg-signal-soft px-2.5 py-0.5 text-12 font-[600] text-signal-text">
                    <span className="size-1.5 rounded-full bg-signal" /> {studying} studying
                  </span>
                ) : (
                  <Tag>nobody live</Tag>
                )}
              </span>
            </div>
            <div className="flex items-center">
              {hall.slice(0, 5).map((m, k) => (
                <span key={m.userId} className={k ? "-ml-2" : ""}>
                  <StudyBuddy
                    buddy={m.avatar}
                    level={m.live ? (m.live.pausedAt ? "paused" : 1) : "idle"}
                    size={38}
                  />
                </span>
              ))}
              <span className="ml-4 text-12 text-ink-3">
                {g.members} member{g.members === 1 ? "" : "s"}
              </span>
            </div>
            <div className="mt-auto flex items-center justify-between gap-2 text-12">
              <span className="text-ink-3">
                {rank ? `You're ${ordinal(rank)} this week` : "Not ranked yet"}
              </span>
              {me && (
                <span className="font-mono text-ink-2">
                  {me.solved} solved · {(me.focusMs / 3_600_000).toFixed(1)} h
                </span>
              )}
            </div>
          </Link>
        ))}
      </section>

      <div className="flex flex-wrap items-start gap-4">
        <Card className="min-w-0 flex-[2_1_560px] p-[22px]">
          <CardHeader>
            <CardTitle>{first.g.name} · this week</CardTitle>
            <CardSub>resets Monday</CardSub>
          </CardHeader>
          {first.board.length === 0 ? (
            <p className="text-13 text-ink-2">Nobody has solved anything this week yet.</p>
          ) : (
            <ol className="flex flex-col">
              {first.board.slice(0, 10).map((r, i) => {
                const mine = r.userId === user.id;
                const m = first.hall.find((h) => h.userId === r.userId);
                return (
                  <li
                    key={r.userId}
                    className={cn(
                      "grid grid-cols-[28px_40px_minmax(0,160px)_minmax(0,1fr)_56px] items-center gap-3 rounded-[12px] px-2 py-2.5",
                      mine && "bg-surface-3",
                    )}
                  >
                    <span
                      className={cn(
                        "font-mono text-13 font-[600]",
                        i === 0 ? "text-[var(--amber)]" : "text-ink-3",
                      )}
                    >
                      {i + 1}
                    </span>
                    <StudyBuddy buddy={m?.avatar ?? null} level="idle" size={34} />
                    <span className="min-w-0">
                      <span className="block truncate font-[560]">
                        {mine ? "You" : (r.name ?? r.handle ?? "Someone")}
                      </span>
                      <span className="block truncate text-12 text-ink-3">
                        {r.activeDays} active day{r.activeDays === 1 ? "" : "s"} ·{" "}
                        {(r.focusMs / 3_600_000).toFixed(1)} h
                      </span>
                    </span>
                    <span className="h-2 overflow-hidden rounded-full bg-surface-4">
                      <span
                        className="block h-full rounded-full"
                        style={{
                          width: `${(r.solved / maxSolved) * 100}%`,
                          background:
                            i === 0 ? "var(--amber)" : mine ? "var(--signal)" : "var(--line-3)",
                        }}
                      />
                    </span>
                    <span className="tnum text-right font-mono text-14 font-[600]">{r.solved}</span>
                  </li>
                );
              })}
            </ol>
          )}
          <Link
            href={`/dashboard/groups/${first.g.id}`}
            className="mt-3 inline-block text-12 text-ink-2 hover:text-ink"
          >
            Full leaderboard and study hall →
          </Link>
        </Card>

        <aside className="flex min-w-0 flex-[1_1_300px] flex-col gap-4">
          {invite && (
            <Card>
              <CardHeader>
                <CardTitle>Invite to {invite.name}</CardTitle>
              </CardHeader>
              <div className="flex items-center gap-2 rounded-[12px] bg-surface-2 px-3.5 py-3 shadow-[inset_0_0_0_1px_var(--line-2)]">
                <span className="font-mono text-[20px] font-[600] tracking-[.16em]">
                  {invite.inviteCode}
                </span>
              </div>
              <p className="mt-2 text-12 text-ink-3">
                Share {`dsakaro.site/join/${invite.inviteCode}`}. Anyone with the link can join.
              </p>
            </Card>
          )}
          <Card>
            <CardHeader>
              <CardTitle>Start a group</CardTitle>
            </CardHeader>
            <p className="mb-3 text-13 text-ink-2">
              For your hostel wing, lab batch or coding club.
            </p>
            <CreateGroupForm />
          </Card>
          <Card tier="inset">
            <CardHeader>
              <CardTitle>Join with a code</CardTitle>
            </CardHeader>
            <JoinGroupForm />
          </Card>
        </aside>
      </div>
    </>
  );
}
