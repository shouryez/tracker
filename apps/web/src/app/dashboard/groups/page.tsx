import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Link2, Plus, UsersRound } from "lucide-react";
import { ButtonArrow, Card, CardHeader, CardSub, CardTitle } from "@upsolve/ui";
import { CreateGroupForm, JoinGroupForm } from "@/components/social";
import { getCurrentUser, isDemoUser } from "@/lib/auth";
import { getMyGroups } from "@/lib/social-data";

export const metadata: Metadata = { title: "Groups" };

const icon = (Icon: typeof Plus) => <Icon size={13} strokeWidth={2} />;

export default function GroupsPage() {
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-[clamp(26px,3.4vw,38px)] leading-[1.02] font-[550] tracking-[-0.04em]">
        Groups<span className="block text-ink-3">Practise with your friends</span>
      </h1>
      <Suspense fallback={<div className="h-72 skeleton rounded-lg" />}>
        <GroupsContent />
      </Suspense>
    </div>
  );
}

async function GroupsContent() {
  const user = await getCurrentUser();
  if (isDemoUser(user)) return <p className="text-ink-2">Sign in to use groups.</p>;
  const groups = await getMyGroups(user.id);

  return (
    <div className="grid grid-cols-12 gap-3.5">
      <Card className="col-span-12 xl:col-span-7">
        <CardHeader>
          <CardTitle icon={icon(UsersRound)}>Your groups</CardTitle>
          <CardSub>{groups.length}</CardSub>
        </CardHeader>
        {groups.length === 0 ? (
          <p className="text-[13.5px] leading-relaxed text-ink-2">
            A group gets its own weekly leaderboard and a study room where you can see who&apos;s
            solving what right now. Create one for your hostel wing, lab batch or coding club, and
            share the invite link.
          </p>
        ) : (
          <ul>
            {groups.map((g) => (
              <li key={g.id} className="border-t border-dashed border-line-2 first:border-t-0">
                <Link
                  href={`/dashboard/groups/${g.id}`}
                  className="group/row flex items-center gap-3 py-3"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14.5px] font-[550] group-hover/row:underline">
                      {g.name}
                    </span>
                    <span className="font-mono text-[11px] text-ink-3">
                      {g.members} member{g.members === 1 ? "" : "s"}
                      {g.role === "owner" ? " · you own it" : ""}
                    </span>
                  </span>
                  <ButtonArrow />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <div className="col-span-12 flex flex-col gap-3.5 xl:col-span-5">
        <Card>
          <CardHeader>
            <CardTitle icon={icon(Plus)}>New group</CardTitle>
          </CardHeader>
          <CreateGroupForm />
        </Card>
        <Card>
          <CardHeader>
            <CardTitle icon={icon(Link2)}>Join with an invite</CardTitle>
          </CardHeader>
          <JoinGroupForm />
        </Card>
      </div>
    </div>
  );
}
