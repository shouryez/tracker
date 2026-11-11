import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card, CardHeader, CardTitle } from "@upsolve/ui";
import { BadgeShelf } from "@/components/badges";
import { SessionReceipt } from "@/components/daily/session-receipt";
import { HoloCard } from "@/components/holo-card";
import { deriveBadges } from "@/lib/badges";
import { SplitFlapCountdown } from "@/components/fx/split-flap";
import { CurveHover } from "@/components/memory-curve";
import { RatingChart } from "@/components/rating-chart";
import { SheetConstellation } from "@/components/sheet-progress";
import { BookCover } from "@/components/sheet-identity";

export const metadata: Metadata = { title: "Effects lab", robots: { index: false } };

const DAY = 86_400_000;

/**
 * Dev-only bench for the FRONTEND-PLAN effects that live on signed-in pages, with fake data,
 * so they can be screenshot without an account. Production builds 404 unless DSAKARO_LAB=1
 * is set at build time.
 */
export default function FxLab() {
  if (process.env.NODE_ENV === "production" && process.env.DSAKARO_LAB !== "1") notFound();
  // Fixed, so the page can prerender; the countdown below targets a date ahead of it.
  const now = Date.UTC(2026, 10, 11, 12);
  const steps = [
    { name: "Step 1: Basics", done: 31, total: 31 },
    { name: "Step 2: Sorting", done: 7, total: 7 },
    { name: "Step 3: Arrays", done: 24, total: 40 },
    { name: "Step 4: Binary search", done: 9, total: 32 },
    { name: "Step 5: Strings", done: 3, total: 15 },
    { name: "Step 6: Linked list", done: 0, total: 31 },
    { name: "Step 7: Recursion", done: 0, total: 25 },
    { name: "Step 8: Bit manipulation", done: 0, total: 18 },
  ];
  const points = Array.from({ length: 14 }, (_, i) => ({
    at: now - (14 - i) * 9 * DAY,
    rating: Math.round(1180 + i * 38 + Math.sin(i * 1.7) * 70),
    name: `Codeforces Round ${880 + i * 3} (Div. 2)`,
  }));
  return (
    <main id="main" className="mx-auto flex w-[min(1100px,100%-32px)] flex-col gap-6 py-10">
      <h1 className="font-display text-[40px]">Effects lab</h1>
      <Card>
        <CardHeader>
          <CardTitle>Split-flap countdown</CardTitle>
        </CardHeader>
        <SplitFlapCountdown to={Date.UTC(2027, 0, 1, 5, 17, 9)} />
      </Card>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sheet map</CardTitle>
          </CardHeader>
          <SheetConstellation steps={steps} />
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Rating scrubber</CardTitle>
          </CardHeader>
          <RatingChart points={points} stroke="#9db5e8" />
        </Card>
      </div>
      <div className="grid gap-6 md:grid-cols-[200px_1fr]">
        <div className="group/book">
          <BookCover
            slug="striver-a2z"
            name="Striver A2Z DSA"
            author="Striver"
            done={142}
            total={455}
          />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Memory curve (hover the row)</CardTitle>
          </CardHeader>
          <ul>
            <CurveHover
              as="li"
              curve={{ lastAt: now - 6 * DAY, dueAt: now + DAY, now }}
              className="surface-inset rounded-[16px] p-4 text-14"
            >
              Koko Eating Bananas · ring 3 · due tomorrow
            </CurveHover>
          </ul>
        </Card>
      </div>
      <div className="grid gap-6 md:grid-cols-[300px_minmax(0,1fr)]">
        <HoloCard
          name="Shourya Chouhan"
          handle="shourya"
          streak={46}
          solved={{ total: 412, easy: 160, medium: 208, hard: 44 }}
          topics={["Arrays", "Binary search", "Graphs"]}
          levels={Array.from({ length: 364 }, (_, i) => ((i * 7) % 11 > 4 ? (i * 3) % 5 : 0))}
        />
        <Card>
          <CardHeader>
            <CardTitle>Badges</CardTitle>
          </CardHeader>
          <BadgeShelf
            className="lg:grid-cols-4"
            badges={deriveBadges({
              days: Array.from({ length: 364 }, (_, i) => (i > 300 ? 1 : i % 3)),
              solved: 412,
              platformsSolved: ["leetcode", "codeforces"],
              retired: 12,
              sheetsFinished: 0,
              topicsMastered: ["Arrays"],
              contests: 6,
              nightSolves: 14,
              earlySolves: 2,
              bestRecallRun: 5,
            })}
          />
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Session receipt</CardTitle>
        </CardHeader>
        <SessionReceipt
          label="Striver A2Z · Binary search"
          at={now}
          wall={84 * 60_000}
          focusMs={71 * 60_000}
          awayMs={9 * 60_000}
          switches={14}
          contents={{
            problems: [
              {
                title: "Koko Eating Bananas",
                url: "a",
                platform: "leetcode",
                difficulty: "medium",
                outcome: "solved",
                activeMs: 18 * 60_000,
                independence: "solo",
                at: now,
              },
              {
                title: "Search in Rotated Sorted Array",
                url: "b",
                platform: "leetcode",
                difficulty: "medium",
                outcome: "solved",
                activeMs: 22 * 60_000,
                independence: "hint",
                at: now,
              },
              {
                title: "Median of Two Sorted Arrays",
                url: "c",
                platform: "leetcode",
                difficulty: "hard",
                outcome: "open",
                activeMs: 25 * 60_000,
                independence: null,
                at: now,
              },
            ],
            videos: [{ title: "BS-1", url: "v", sheet: null, watchedMs: 600_000, at: now }],
            ticks: [],
          }}
        />
      </Card>
    </main>
  );
}
