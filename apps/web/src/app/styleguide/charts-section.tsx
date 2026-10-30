import type { ReactNode } from "react";
import type { TopicMastery } from "@upsolve/core";
import { Card, CardHeader, CardSub, CardTitle } from "@upsolve/ui";
import { DifficultyTime, HourBars, VerdictMix } from "@/components/analytics-charts";
import { SolvedSplit, Sparkline, TopicBar } from "@/components/charts";
import { FocusWeek, HowSolved, TopicRadar } from "@/components/charts/insights";
import { ActivityHeatmap } from "@/components/dashboard/activity-heatmap";
import { HalfGauge, WeekCapsules } from "@/components/dashboard/widgets";
import { MasteryBars, UpcomingStrip } from "@/components/learning";
import { SegmentedProgress } from "@/components/progress";
import { CF_BANDS, RatingChart } from "@/components/rating-chart";

// Sample data only (dev styleguide). Deterministic so server and client agree.

const NOW = Date.UTC(2026, 9, 28, 12);
const DAY = 86_400_000;

function sampleDays() {
  let x = 7;
  return Array.from({ length: 26 * 7 }, (_, i) => {
    x = (x * 1103515245 + 12345) % 2147483648;
    const r = x / 2147483648;
    return {
      date: new Date(NOW - (26 * 7 - 1 - i) * DAY).toISOString().slice(0, 10),
      count: r > 0.55 ? 0 : Math.floor(r * 22),
    };
  });
}

const WEEK = ["M", "T", "W", "T", "F", "S", "S"].map((label, i) => ({
  label,
  count: [3, 0, 5, 7, 0, 0, 0][i]!,
  future: i > 3,
}));
const EMPTY_WEEK = WEEK.map((d) => ({ ...d, count: 0 }));

const MASTERY: TopicMastery[] = [
  ["arrays", "Arrays", 82],
  ["dp", "Dynamic programming", 34],
  ["graphs", "Graphs", 18],
  ["trees", "Trees", 61],
  ["sliding", "Sliding window", 47],
  ["binary-search", "Binary search", 70],
].map(([topic, label, score]) => ({
  topic: topic as TopicMastery["topic"],
  label: label as string,
  score: score as number,
  solved: Math.round((score as number) / 4),
  soloRate: 0.6,
  medianMs: 1_380_000,
  points: score as number,
  target: 100,
}));

const RATING = [1180, 1214, 1198, 1262, 1301, 1288, 1347, 1402, 1385, 1441, 1468].map(
  (rating, i) => ({ at: NOW - (10 - i) * 21 * DAY, rating, name: `Codeforces Round #${940 + i}` }),
);

export function ChartsSection({
  Section,
}: {
  Section: (p: { title: string; children: ReactNode }) => ReactNode;
}) {
  return (
    <Section title="Charts">
      <div className="grid grid-cols-12 gap-3.5">
        <Card className="col-span-12 xl:col-span-7">
          <CardHeader>
            <CardTitle>This week</CardTitle>
            <CardSub>15 solved</CardSub>
          </CardHeader>
          <WeekCapsules days={WEEK} todayIndex={3} />
        </Card>
        <Card className="col-span-12 xl:col-span-5">
          <CardHeader>
            <CardTitle>This week · empty</CardTitle>
          </CardHeader>
          <WeekCapsules days={EMPTY_WEEK} todayIndex={3} />
        </Card>
        <Card className="col-span-12 xl:col-span-8">
          <CardHeader>
            <CardTitle>Activity</CardTitle>
            <CardSub>last 26 weeks</CardSub>
          </CardHeader>
          <ActivityHeatmap days={sampleDays()} />
        </Card>
        <Card className="col-span-12 xl:col-span-4">
          <CardHeader>
            <CardTitle>Sheet progress</CardTitle>
          </CardHeader>
          <HalfGauge done={212} total={495} label="of Striver A2Z" />
          <SegmentedProgress className="mt-5" done={212} total={495} segments={24} />
          <SolvedSplit
            className="mt-5"
            solved={{ easy: 120, medium: 210, hard: 64, unknown: 4, total: 398 }}
          />
        </Card>
        <Card className="col-span-12 md:col-span-6 xl:col-span-4">
          <CardHeader>
            <CardTitle>Best hours</CardTitle>
          </CardHeader>
          <HourBars
            byHour={[2, 1, 0, 0, 0, 0, 0, 1, 2, 3, 4, 5, 3, 2, 6, 7, 5, 4, 8, 9, 11, 7, 5, 3]}
          />
        </Card>
        <Card className="col-span-12 md:col-span-6 xl:col-span-4">
          <CardHeader>
            <CardTitle>Verdict mix</CardTitle>
          </CardHeader>
          <VerdictMix
            verdicts={[
              { verdict: "AC", n: 62 },
              { verdict: "WA", n: 24 },
              { verdict: "TLE", n: 9 },
              { verdict: "CE", n: 3 },
              { verdict: "RE", n: 2 },
            ]}
          />
        </Card>
        <Card className="col-span-12 md:col-span-6 xl:col-span-4">
          <CardHeader>
            <CardTitle>Time per difficulty</CardTitle>
          </CardHeader>
          <DifficultyTime
            rows={[
              { difficulty: "easy", activeMs: 9_200_000, solved: 41, medianMs: 780_000 },
              { difficulty: "medium", activeMs: 21_600_000, solved: 37, medianMs: 1_740_000 },
              { difficulty: "hard", activeMs: 7_100_000, solved: 6, medianMs: 3_300_000 },
            ]}
          />
        </Card>
        <Card className="col-span-12 md:col-span-6 xl:col-span-5">
          <CardHeader>
            <CardTitle>Topic mastery</CardTitle>
          </CardHeader>
          <TopicRadar topics={MASTERY} />
        </Card>
        <Card className="col-span-12 md:col-span-6 xl:col-span-3">
          <CardHeader>
            <CardTitle>Mastery list</CardTitle>
          </CardHeader>
          <MasteryBars topics={MASTERY} showInputs={false} />
        </Card>
        <Card className="col-span-12 xl:col-span-4">
          <CardHeader>
            <CardTitle>Time per topic</CardTitle>
          </CardHeader>
          {[
            ["Arrays", 41],
            ["Dynamic programming", 33],
            ["Graphs", 19],
            ["Trees", 12],
          ].map(([n, v], i) => (
            <TopicBar key={n} name={n as string} value={v as number} max={41} top={i === 0} />
          ))}
        </Card>
        <Card className="col-span-12 xl:col-span-7">
          <CardHeader>
            <CardTitle>Coming up</CardTitle>
            <CardSub>next 14 days</CardSub>
          </CardHeader>
          <UpcomingStrip upcoming={[3, 1, 0, 5, 2, 0, 8, 1, 0, 2, 4, 0, 1, 3]} now={NOW} />
        </Card>
        <Card className="col-span-12 xl:col-span-5">
          <CardHeader>
            <CardTitle>Focus this week</CardTitle>
          </CardHeader>
          <FocusWeek
            goalMin={60}
            days={[30, 75, 0, 52, 90, 20, 41].map((m, i) => ({
              day: new Date(NOW - (6 - i) * DAY).toISOString().slice(0, 10),
              activeMs: m * 60_000,
            }))}
          />
        </Card>
        <Card className="col-span-12 md:col-span-6 xl:col-span-4">
          <CardHeader>
            <CardTitle>How you solved</CardTitle>
          </CardHeader>
          <HowSolved honest={{ solo: 31, hint: 12, solution: 6 }} />
        </Card>
        <Card className="col-span-12 md:col-span-6 xl:col-span-4">
          <CardHeader>
            <CardTitle>How you solved · empty</CardTitle>
          </CardHeader>
          <HowSolved honest={{ solo: 0, hint: 0, solution: 0 }} />
        </Card>
        <Card className="col-span-12 xl:col-span-4">
          <CardHeader>
            <CardTitle>Sparkline</CardTitle>
          </CardHeader>
          <Sparkline
            values={RATING.map((r) => r.rating)}
            width={220}
            height={60}
            stroke="var(--chart-6)"
          />
        </Card>
        <Card className="col-span-12">
          <CardHeader>
            <CardTitle>Codeforces rating</CardTitle>
            <CardSub>rank bands</CardSub>
          </CardHeader>
          <RatingChart points={RATING} stroke="var(--sky)" bands={CF_BANDS} />
        </Card>
      </div>
    </Section>
  );
}

// DsaKaro
