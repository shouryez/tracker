import { Award } from "lucide-react";
import { Card, CardHeader, CardSub, CardTitle } from "@upsolve/ui";
import { BadgeShelf } from "@/components/badges";
import { loadBadges, nextBadge } from "@/lib/badges";

/** Your badge shelf on Insights (FRONTEND-PLAN §9.1, FINAL-FEATURES A6). Streams in on its own. */
export async function BadgesCard({ userId, tz, now }: { userId: string; tz: string; now: number }) {
  const badges = await loadBadges(userId, tz, now);
  const earned = badges.filter((b) => b.earned).length;
  const next = nextBadge(badges);
  return (
    <Card id="badges" className="col-span-12 scroll-mt-24">
      <CardHeader>
        <CardTitle icon={<Award size={15} />} tint="var(--amber)">
          Badges
        </CardTitle>
        <CardSub>
          {earned} of {badges.length}
          {next?.progress
            ? ` · next: ${next.name}, ${next.progress.goal - next.progress.value} to go`
            : ""}
          {" · tap one for details"}
        </CardSub>
      </CardHeader>
      <BadgeShelf badges={badges} />
    </Card>
  );
}
