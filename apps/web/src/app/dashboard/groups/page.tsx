import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Crown, Link2, Plus } from "lucide-react";
import { Card, CardHeader, CardSub, CardTitle, Pill, SkeletonCard, cn } from "@upsolve/ui";
import { CopyLinkButton } from "@/components/orbit/copy-link";
import { PageHeader } from "@/components/page-header";
import { CreateGroupForm, JoinGroupForm } from "@/components/social";
import { getCurrentUser, isDemoUser } from "@/lib/auth";
import { BOARD_TZ, getGroup, getGroupBoard, getMyGroups } from "@/lib/social-data";
import { getStudyHall } from "@/lib/daily-data";
import { HallOrbit } from "@/components/hall-orbit";
import { localWeekStart, requestNow } from "@/lib/time";
import { StudyBuddy } from "@/components/study-buddy";
import { PEOPLE_TABS, SectionTabs } from "@/components/orbit/section-tabs";

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
      <SectionTabs tabs={PEOPLE_TABS} />
      <PageHeader
        eyebrow="Groups · friends only"
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
            <span className="glass-control grid size-11 place-items-center rounded-[14px]">
              <Crown size={20} />
            </span>
          </span>
          <p className="font-display text-[clamp(24px,2.4vw,32px)] leading-[1.08]">
            Better with friends.
          </p>
          <p className="max-w-[54ch] text-14 text-ink-2">
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
  // The "New group" tile takes whatever is left of the last row, so the grid never has a hole.
  const tiles = details.length + 1;
  const xlLeft = 3 - ((tiles - 1) % 3); // columns left for the tile in its xl row
  const mdLeft = 2 - ((tiles - 1) % 2);

  return (
    <>
      <section aria-label="Your groups" className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">
        {details.map(({ g, hall, studying, rank, me }) => (
          <div
            key={g.id}
            className="surface-card card-sheen relative flex flex-col gap-4 rounded-[24px] p-[22px] transition-[transform,box-shadow] duration-[var(--dur-base)] hover:-translate-y-[3px] hover:shadow-e2"
          >
            <Link
              href={`/dashboard/groups/${g.id}`}
              aria-label={`Open ${g.name}`}
              className="absolute inset-0 rounded-[inherit]"
            />
            <div className="flex items-center gap-2.5">
              <h2 className="truncate text-[17px] font-[620] tracking-[-0.02em]">{g.name}</h2>
              <span className="ml-auto shrink-0">
                <Pill tone={studying > 0 ? "mint" : "neutral"}>
                  {studying > 0 ? `${studying} studying` : "Nobody live"}
                </Pill>
              </span>
            </div>
            <div className="flex items-center gap-4">
              <HallOrbit members={hall} label={g.name} size={120} />
              <span className="text-13 text-ink-3">
                {g.members} member{g.members === 1 ? "" : "s"}
                <br />
                {studying > 0 ? (
                  <span className="text-ink-2">
                    <span className="mr-1.5 inline-block size-1.5 rounded-full bg-primary align-middle" />
                    {studying} on the inner ring now
                  </span>
                ) : (
                  "Everyone's on the outer ring"
                )}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 text-13">
              <span className="text-ink-3">
                {rank ? `You're ${ordinal(rank)} this week` : "Not ranked yet"}
              </span>
              {me && (
                <span className="tnum text-ink-2">
                  {me.solved} solved · {(me.focusMs / 3_600_000).toFixed(1)} h
                </span>
              )}
            </div>
            <div className="relative z-10 mt-auto flex gap-2 border-t border-line pt-4">
              <CopyLinkButton url={`https://dsakaro.site/join/${g.inviteCode}`} />
            </div>
          </div>
        ))}
        <div
          className={cn(
            "surface-card flex flex-col gap-5 rounded-[24px] p-[22px]",
            mdLeft === 2 && "md:col-span-2",
            xlLeft === 3 ? "xl:col-span-3" : xlLeft === 2 ? "xl:col-span-2" : "xl:col-span-1",
          )}
        >
          <div
            className={cn(
              "grid gap-5",
              xlLeft >= 2 && "xl:grid-cols-2 xl:gap-8",
              mdLeft === 2 && "md:grid-cols-2 md:gap-8",
            )}
          >
            <div className="flex min-w-0 flex-col gap-3">
              <p className="flex items-center gap-2 text-15 font-[620]">
                <span className="glass-control grid size-8 place-items-center rounded-[10px]">
                  {icon(Plus)}
                </span>
                Start a group
              </p>
              <p className="text-13 text-ink-2">For your hostel wing, lab batch or coding club.</p>
              <CreateGroupForm />
            </div>
            <div className="flex min-w-0 flex-col gap-3">
              <p className="flex items-center gap-2 text-15 font-[620]">
                <span className="glass-control grid size-8 place-items-center rounded-[10px]">
                  {icon(Link2)}
                </span>
                Join with a code
              </p>
              <p className="text-13 text-ink-2">Paste the invite link or code a friend sent you.</p>
              <JoinGroupForm />
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-3.5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card className="min-w-0 p-[22px]">
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
                      mine && "bg-[color-mix(in_srgb,var(--ink)_6%,transparent)]",
                    )}
                  >
                    <span
                      className={cn(
                        "tnum text-13 font-[650]",
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
                    <span className="h-2 overflow-hidden rounded-full bg-line">
                      <span
                        className="block h-full rounded-full"
                        style={{
                          width: `${(r.solved / maxSolved) * 100}%`,
                          background:
                            i === 0 ? "var(--amber)" : mine ? "var(--signal)" : "var(--line-3)",
                        }}
                      />
                    </span>
                    <span className="tnum text-right font-display text-[18px]">{r.solved}</span>
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

        {invite && (
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle>Invite to {invite.name}</CardTitle>
            </CardHeader>
            <div className="flex items-center gap-2 rounded-[16px] bg-[color-mix(in_srgb,var(--ink)_5%,transparent)] px-3.5 py-3 shadow-[inset_0_0_0_1px_var(--line-2)]">
              <span className="font-mono text-[20px] font-[600] tracking-[.16em]">
                {invite.inviteCode}
              </span>
            </div>
            <p className="mt-2 text-12 text-ink-3">
              Share {`dsakaro.site/join/${invite.inviteCode}`}. Anyone with the link can join.
            </p>
            <CopyLinkButton
              url={`https://dsakaro.site/join/${invite.inviteCode}`}
              className="mt-3 self-start"
            />
          </Card>
        )}
      </div>
    </>
  );
}
