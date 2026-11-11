import { Award } from "lucide-react";
import { Card, CardHeader, CardSub, CardTitle } from "@upsolve/ui";
import { BadgeShelf } from "@/components/badges";
import { loadBadges } from "@/lib/badges";

/** Your badge shelf on Insights (FRONTEND-PLAN §9.1). Streams in on its own. */
export async function BadgesCard({ userId, tz, now }: { userId: string; tz: string; now: number }) {
  const badges = await loadBadges(userId, tz, now);
  const earned = badges.filter((b) => b.earned).length;
  return (
    <Card id="badges" className="col-span-12 scroll-mt-24">
      <CardHeader>
        <CardTitle icon={<Award size={15} />} tint="var(--amber)">
          Badges
        </CardTitle>
        <CardSub>
          {earned} of {badges.length} · shown on your public profile
        </CardSub>
      </CardHeader>
      <BadgeShelf badges={badges} />
    </Card>
  );
}
