import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Crown, Link2, Plus, UsersRound } from "lucide-react";
import { ButtonArrow, Card, CardHeader, CardTitle, SkeletonCard, Tag } from "@upsolve/ui";
import { PAGE_GLOW, PageHeader } from "@/components/page-header";
import { CreateGroupForm, JoinGroupForm } from "@/components/social";
import { getCurrentUser, isDemoUser } from "@/lib/auth";
import { getMyGroups } from "@/lib/social-data";

export const metadata: Metadata = { title: "Groups" };

const icon = (Icon: typeof Plus) => <Icon size={14} strokeWidth={2} />;
const AVATAR_TINTS = ["var(--violet)", "var(--easy)", "var(--medium)", "var(--primary)", "#ff6bb5"];

export default function GroupsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Groups · friends only"
        glow={PAGE_GLOW.groups}
        title={
          <>
            Groups, <em>practise together.</em>
          </>
        }
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

/** A small stack of placeholder avatars sized to the member count (names aren't loaded here). */
function AvatarStack({ n }: { n: number }) {
  const shown = Math.min(n, 5);
  return (
    <span className="flex items-center">
      {Array.from({ length: shown }, (_, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="-ml-2 size-7 rounded-full border-2 border-surface first:ml-0"
          style={{
            background: `linear-gradient(135deg, ${AVATAR_TINTS[i % AVATAR_TINTS.length]}, color-mix(in srgb, ${AVATAR_TINTS[i % AVATAR_TINTS.length]} 40%, #000))`,
          }}
        />
      ))}
      {n > shown && <span className="tnum ml-1.5 text-12 text-ink-3">+{n - shown}</span>}
    </span>
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

  return (
    <>
      <div className="stagger-in grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">
        {groups.map((g) => (
          <Card key={g.id} interactive spotlight className="flex flex-col gap-4">
            <Link
              href={`/dashboard/groups/${g.id}`}
              aria-label={`Open ${g.name}`}
              className="absolute inset-0 z-[2] rounded-[inherit]"
            />
            <div className="flex items-start justify-between gap-3">
              <span className="grid size-10 place-items-center rounded-[12px] border border-line bg-surface-2 text-ink-2">
                <UsersRound size={18} aria-hidden="true" />
              </span>
              {g.role === "owner" && <Tag tone="signal">owner</Tag>}
            </div>
            <div>
              <p className="truncate text-17 font-[600] tracking-[-0.02em]">{g.name}</p>
              <p className="tnum text-12 text-ink-3">
                {g.members} member{g.members === 1 ? "" : "s"}
              </p>
            </div>
            <div className="mt-auto flex items-center justify-between">
              <AvatarStack n={g.members} />
              <span className="inline-flex items-center gap-1.5 text-13 font-[600] text-signal-text">
                Open <ButtonArrow />
              </span>
            </div>
          </Card>
        ))}
      </div>
      {forms}
    </>
  );
}
