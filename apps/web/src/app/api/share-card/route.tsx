import { frozenDays } from "@upsolve/core";
import { getCurrentUser, isDemoUser } from "@/lib/auth";
import { buildStats, getAccounts, getProfile, getPublicProfile } from "@/lib/data";
import { shareCard, type ShareCardData } from "@/lib/share-card";
import { getStreakFreezes } from "@/lib/social-data";

/**
 * Share card PNG (1200×630).
 *   /api/share-card?handle=asha  → a public profile's card (link previews)
 *   /api/share-card              → your own card; add ?download=1 to save it
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const handle = params.get("handle");
  let data: ShareCardData;

  if (handle) {
    if (!/^[a-z0-9_]{3,20}$/.test(handle)) return new Response("Not found", { status: 404 });
    const profile = await getPublicProfile(handle);
    if (!profile) return new Response("Not found", { status: 404 });
    const stats = buildStats(profile.accounts, new Date(), new Set(profile.frozenDays));
    data = toCard(
      profile.name ?? profile.handle,
      profile.college,
      profile.gradYear,
      profile.handle,
      stats,
    );
  } else {
    const user = await getCurrentUser();
    if (isDemoUser(user)) return new Response("Sign in first.", { status: 401 });
    const [profile, accounts, freezes] = await Promise.all([
      getProfile(user.id),
      getAccounts(user.id),
      getStreakFreezes(user.id),
    ]);
    const stats = buildStats(accounts, new Date(), frozenDays(freezes));
    data = toCard(
      profile?.name ?? user.name ?? "Me",
      profile?.college?.shortName ?? profile?.college?.name ?? null,
      profile?.gradYear ?? null,
      profile?.isPublic ? profile.handle : null,
      stats,
    );
  }
  // A milestone headline, worked out here from the real numbers (never text from the URL).
  const kind = params.get("milestone");
  if (kind === "streak" || kind === "solved") data.milestone = milestoneLabel(kind, data);
  return shareCard(data, {
    download: params.get("download") ? "dsakaro-card.png" : undefined,
  });
}

function toCard(
  name: string,
  college: string | null,
  gradYear: number | null,
  handle: string | null,
  stats: ReturnType<typeof buildStats>,
): ShareCardData {
  return {
    name,
    subtitle: [college, gradYear ? `Batch ${gradYear}` : null].filter(Boolean).join(" · ") || null,
    handle,
    solved: stats.solved.total,
    streak: stats.streak,
    third: stats.bestRating
      ? { value: String(stats.bestRating.rating), label: "best rating" }
      : { value: String(stats.activeDays), label: "active days" },
    heatmap: stats.heatmap26,
  };
}

const STREAK_MILESTONES = [7, 14, 30, 50, 75, 100, 150, 200, 365];
const SOLVED_MILESTONES = [10, 25, 50, 100, 150, 200, 300, 500, 750, 1000];

function milestoneLabel(kind: "streak" | "solved", d: ShareCardData): string | null {
  if (kind === "streak") {
    const hit = [...STREAK_MILESTONES].reverse().find((m) => d.streak >= m);
    return hit ? `${hit}-day streak` : null;
  }
  const hit = [...SOLVED_MILESTONES].reverse().find((m) => d.solved >= m);
  return hit ? `${hit} problems solved` : null;
}
