import { getCurrentUser, isDemoUser } from "@/lib/auth";
import { getStudyHall } from "@/lib/daily-data";
import { getMyGroups } from "@/lib/social-data";

/**
 * The viewer's groups and one group's live study hall (for the pop-out timer). `group`
 * picks it; otherwise the first group. Only groups the viewer is in.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (isDemoUser(user)) return Response.json({ groups: [], group: null, members: [] });
  const groups = (await getMyGroups(user.id)).map((g) => ({ id: g.id, name: g.name }));
  const wanted = new URL(request.url).searchParams.get("group");
  const group = groups.find((g) => g.id === wanted) ?? groups[0] ?? null;
  const members = group ? await getStudyHall(group.id) : [];
  return Response.json(
    { groups, group, members, serverNow: Date.now(), viewerId: user.id },
    { headers: { "Cache-Control": "no-store" } },
  );
}
