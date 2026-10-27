import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { CircleCheck, Flame, Inbox, RotateCcw, Timer } from "lucide-react";
import {
  Aurora,
  Button,
  ButtonArrow,
  Card,
  CardHeader,
  CardSub,
  CardTitle,
  DifficultyTag,
  DotGrid,
  EmptyState,
  GlowOrb,
  Grain,
  Kbd,
  Skeleton,
  SkeletonCard,
  SpotlightTracker,
  Starfield,
  StatusBadge,
  Tag,
  ThemeToggle,
  Tooltip,
} from "@upsolve/ui";
import { ActivityHeatmap } from "@/components/dashboard/activity-heatmap";
import { HalfGauge, KpiCard, WeekCapsules } from "@/components/dashboard/widgets";
import { Tabs } from "@/components/tabs";
import { SwitchDemo, ToastDemo } from "./demos";

export const metadata: Metadata = { title: "Styleguide", robots: { index: false } };

// Dev-only review page: every token and component in every state. Sample data only.

// Literal class names so Tailwind generates them.
const SWATCH_GROUPS: [string, [string, string][]][] = [
  [
    "Surfaces",
    [
      ["bg", "bg-bg"],
      ["bg-2", "bg-bg-2"],
      ["surface", "bg-surface"],
      ["surface-2", "bg-surface-2"],
      ["surface-3", "bg-surface-3"],
      ["surface-4", "bg-surface-4"],
      ["inset", "bg-surface-inset"],
    ],
  ],
  [
    "Ink",
    [
      ["ink", "bg-ink"],
      ["ink-2", "bg-ink-2"],
      ["ink-3", "bg-ink-3"],
      ["ink-4", "bg-ink-4"],
    ],
  ],
  [
    "Brand roles",
    [
      ["signal · CTA", "bg-signal"],
      ["primary · data", "bg-primary"],
      ["violet · focus", "bg-violet"],
      ["ember · streak", "bg-ember"],
    ],
  ],
  [
    "Difficulty",
    [
      ["easy", "bg-easy"],
      ["medium", "bg-medium"],
      ["hard", "bg-hard"],
    ],
  ],
  [
    "Status",
    [
      ["solved", "bg-success"],
      ["revise", "bg-revise"],
      ["overdue", "bg-overdue"],
      ["attempted", "bg-attempted"],
      ["info", "bg-info"],
    ],
  ],
  [
    "Verdicts",
    [
      ["AC", "bg-v-ac"],
      ["WA", "bg-v-wa"],
      ["TLE", "bg-v-tle"],
      ["CE", "bg-v-ce"],
      ["MLE / RE", "bg-v-err"],
    ],
  ],
  [
    "Heatmap ramp",
    [
      ["0", "bg-heat-0"],
      ["1", "bg-heat-1"],
      ["2", "bg-heat-2"],
      ["3", "bg-heat-3"],
      ["4", "bg-heat-4"],
    ],
  ],
  [
    "Chart palette",
    [
      ["1", "bg-chart-1"],
      ["2", "bg-chart-2"],
      ["3", "bg-chart-3"],
      ["4", "bg-chart-4"],
      ["5", "bg-chart-5"],
      ["6", "bg-chart-6"],
      ["7", "bg-chart-7"],
      ["8", "bg-chart-8"],
    ],
  ],
];
const STEPS = ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"];
const SCALES: [string, string[]][] = [
  [
    "primary",
    [
      "bg-primary-50",
      "bg-primary-100",
      "bg-primary-200",
      "bg-primary-300",
      "bg-primary-400",
      "bg-primary-500",
      "bg-primary-600",
      "bg-primary-700",
      "bg-primary-800",
      "bg-primary-900",
      "bg-primary-950",
    ],
  ],
  [
    "violet",
    [
      "bg-violet-50",
      "bg-violet-100",
      "bg-violet-200",
      "bg-violet-300",
      "bg-violet-400",
      "bg-violet-500",
      "bg-violet-600",
      "bg-violet-700",
      "bg-violet-800",
      "bg-violet-900",
      "bg-violet-950",
    ],
  ],
  [
    "signal",
    [
      "bg-signal-50",
      "bg-signal-100",
      "bg-signal-200",
      "bg-signal-300",
      "bg-signal-400",
      "bg-signal-500",
      "bg-signal-600",
      "bg-signal-700",
      "bg-signal-800",
      "bg-signal-900",
      "bg-signal-950",
    ],
  ],
];
const TYPE_SCALE: [string, string][] = [
  ["88", "text-88"],
  ["64", "text-64"],
  ["48", "text-48"],
  ["36", "text-36"],
  ["30", "text-30"],
  ["24", "text-24"],
  ["20", "text-20"],
  ["18", "text-18"],
  ["16", "text-16"],
  ["14", "text-14"],
  ["13", "text-13"],
  ["12", "text-12"],
  ["11", "text-11"],
];
const ELEVATION: [string, string][] = [
  ["e0", "shadow-e0"],
  ["e1 card", "shadow-e1"],
  ["e2 hover", "shadow-e2"],
  ["e3 popover", "shadow-e3"],
  ["e4 modal", "shadow-e4"],
];

function sampleDays() {
  let x = 7;
  return Array.from({ length: 26 * 7 }, (_, i) => {
    x = (x * 1103515245 + 12345) % 2147483648;
    const r = x / 2147483648;
    return {
      date: `2026-${String(1 + Math.floor(i / 28)).padStart(2, "0")}-${String((i % 28) + 1).padStart(2, "0")}`,
      count: r > 0.55 ? 0 : Math.floor(r * 14),
    };
  });
}

export default function Styleguide() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <div className="min-h-dvh bg-bg-2">
      <SpotlightTracker />
      <header className="glass sticky top-0 z-40 flex items-center justify-between border-b border-line px-6 py-3">
        <span className="font-mono text-[12px] tracking-[.08em] text-ink-3 uppercase">
          Upsolve · styleguide (dev only)
        </span>
        <ThemeToggle />
      </header>
      <main id="main" className="mx-auto flex max-w-[1200px] flex-col gap-10 px-4 py-10 sm:px-6">
        <Section title="Colour roles">
          <div className="grid gap-6 md:grid-cols-2">
            {SWATCH_GROUPS.map(([group, items]) => (
              <div key={group}>
                <p className="mb-2 label-mono">{group}</p>
                <div className="flex flex-wrap gap-2">
                  {items.map(([name, cls]) => (
                    <div key={name} className="w-[76px] text-12">
                      <div className={`h-11 rounded-[10px] border border-line ${cls}`} />
                      <span className="mt-1 block truncate font-mono text-ink-3">{name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-col gap-2">
            {SCALES.map(([name, classes]) => (
              <div key={name} className="flex items-center gap-3">
                <span className="w-14 label-mono">{name}</span>
                <div className="flex flex-1 overflow-hidden rounded-[10px] border border-line">
                  {classes.map((cls, i) => (
                    <div key={cls} className={`h-9 flex-1 ${cls}`} title={`${name}-${STEPS[i]}`} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Surfaces and elevation">
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {ELEVATION.map(([name, cls]) => (
              <div
                key={name}
                className={`grid h-24 place-items-center rounded-[20px] border border-line bg-surface font-mono text-12 text-ink-2 ${cls}`}
              >
                {name}
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="surface-hero relative overflow-hidden rounded-[20px] p-5">
              <Grain />
              <p className="relative label-mono text-white/70">Hero tier</p>
              <p className="relative mt-3 num text-48">412</p>
            </div>
            <div className="surface-card rounded-[20px] p-5">
              <p className="label-mono">Standard tier</p>
              <p className="mt-3 num text-48">47</p>
            </div>
            <div className="surface-inset rounded-[20px] p-5">
              <p className="label-mono">Inset tier</p>
              <p className="mt-3 num text-48">5</p>
            </div>
          </div>
        </Section>

        <Section title="Textures">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <TextureTile label="Grain">
              <Grain />
            </TextureTile>
            <TextureTile label="Dot grid">
              <DotGrid />
            </TextureTile>
            <TextureTile label="Aurora" dark>
              <Aurora />
            </TextureTile>
            <TextureTile label="Starfield + glow orb" dark>
              <Starfield />
              <GlowOrb size={160} className="-right-10 -bottom-16" />
            </TextureTile>
          </div>
        </Section>

        <Section title="Type">
          <div className="flex flex-col gap-1">
            {TYPE_SCALE.map(([size, cls]) => (
              <div key={size} className="flex items-baseline gap-4">
                <span className="w-8 shrink-0 label-mono">{size}</span>
                <span className={`${cls} truncate font-[550]`}>
                  Revision, <em className="font-display font-normal">five today.</em>
                </span>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap items-end gap-8">
            <p className="num text-64">
              1,034
              <span className="ml-1 font-display text-30 font-normal text-ink-3 italic">
                solved
              </span>
            </p>
            <p className="label-mono">Label · mono 11 · +0.06em</p>
            <p className="tnum text-14 text-ink-2">tabular 0 1 2 3 4 5 6 7 8 9 · slashed 0</p>
          </div>
        </Section>

        <Section title="Buttons">
          <Row>
            {(
              [
                "signal",
                "primary",
                "indigo",
                "secondary",
                "outline",
                "ghost",
                "danger",
                "link",
              ] as const
            ).map((v) => (
              <Button key={v} variant={v}>
                {v} <ButtonArrow />
              </Button>
            ))}
          </Row>
          <Row>
            <Button size="sm">Small</Button>
            <Button>Medium</Button>
            <Button size="lg" variant="signal">
              Large
            </Button>
            <Button size="icon" variant="secondary" aria-label="Icon">
              <Flame size={16} />
            </Button>
            <Button disabled>Disabled</Button>
            <Button loading>Saving</Button>
            <Button variant="secondary" loading>
              Loading secondary
            </Button>
          </Row>
        </Section>

        <Section title="Badges">
          <Row>
            <DifficultyTag difficulty="easy" />
            <DifficultyTag difficulty="medium" />
            <DifficultyTag difficulty="hard" />
            <StatusBadge status="solved" />
            <StatusBadge status="attempted" />
            <StatusBadge status="todo" />
            <StatusBadge status="revise" />
            {(["neutral", "ac", "wa", "tle", "info", "primary", "signal"] as const).map((t) => (
              <Tag key={t} tone={t} mono>
                {t}
              </Tag>
            ))}
            <Kbd>Ctrl K</Kbd>
            <Tooltip content="Tooltips wait 300 ms">
              <Button variant="outline" size="sm">
                Hover me
              </Button>
            </Tooltip>
          </Row>
        </Section>

        <Section title="Controls">
          <Row>
            <SwitchDemo />
            <ToastDemo />
          </Row>
          <Tabs
            items={[
              {
                id: "a",
                label: "Attempts",
                count: 5,
                content: <p className="text-ink-2">Attempts panel</p>,
              },
              { id: "b", label: "Notes", content: <p className="text-ink-2">Notes panel</p> },
              {
                id: "c",
                label: "Similar",
                count: 3,
                content: <p className="text-ink-2">Similar panel</p>,
              },
            ]}
          />
        </Section>

        <Section title="Cards">
          <div className="grid gap-3.5 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle icon={<Inbox size={14} />}>Static card</CardTitle>
                <CardSub>meta</CardSub>
              </CardHeader>
              <p className="text-[13.5px] text-ink-2">Border, inner highlight, soft shadow.</p>
            </Card>
            <Card interactive>
              <CardTitle>Interactive</CardTitle>
              <p className="mt-2 text-[13.5px] text-ink-2">Lifts and brightens on hover.</p>
            </Card>
            <Card interactive spotlight>
              <CardTitle>Spotlight</CardTitle>
              <p className="mt-2 text-[13.5px] text-ink-2">A soft light follows the cursor.</p>
            </Card>
          </div>
          <div className="mt-3.5 grid grid-cols-12 gap-3.5">
            <KpiCard
              feature
              className="col-span-12 sm:col-span-6 xl:col-span-3"
              title="Solved"
              icon={<CircleCheck size={14} />}
              value={412}
              unit="problems"
              href="/dashboard"
              spark={[1, 0, 3, 2, 5, 0, 1, 4, 2, 6, 3, 0, 2, 5]}
              foot="↑ 12 new this week (sample)"
            />
            <KpiCard
              className="col-span-12 sm:col-span-6 xl:col-span-3"
              title="Streak"
              icon={<Flame size={14} className="text-ember" />}
              value={47}
              unit="days"
              href="/dashboard"
              foot="sample"
            />
            <KpiCard
              className="col-span-12 sm:col-span-6 xl:col-span-3"
              title="To revise"
              icon={<RotateCcw size={14} />}
              value={5}
              unit="today"
              href="/dashboard"
              foot="sample"
            />
            <KpiCard
              className="col-span-12 sm:col-span-6 xl:col-span-3"
              title="Focus"
              icon={<Timer size={14} />}
              value={14.2}
              decimals={1}
              unit="h this week"
              href="/dashboard"
              foot="sample"
            />
            <Card className="col-span-12 xl:col-span-5">
              <CardTitle>Week capsules</CardTitle>
              <div className="mt-4">
                <WeekCapsules
                  todayIndex={3}
                  days={["M", "T", "W", "T", "F", "S", "S"].map((label, i) => ({
                    label,
                    count: [3, 0, 5, 7, 0, 0, 0][i]!,
                    future: i > 3,
                  }))}
                />
              </div>
            </Card>
            <Card className="col-span-12 xl:col-span-3">
              <CardTitle>Gauge</CardTitle>
              <div className="mt-4">
                <HalfGauge done={212} total={495} label="of Striver A2Z (sample)" />
              </div>
            </Card>
            <Card className="col-span-12 xl:col-span-4">
              <CardTitle>Heatmap</CardTitle>
              <div className="mt-4">
                <ActivityHeatmap days={sampleDays()} />
              </div>
            </Card>
          </div>
        </Section>

        <Section title="Feedback states">
          <div className="grid gap-3.5 md:grid-cols-3">
            <SkeletonCard lines={3} />
            <Card>
              <EmptyState
                icon={<Inbox size={18} />}
                title="No problems solved yet"
                action={
                  <Button variant="signal" size="sm">
                    Start with Two Sum <ButtonArrow />
                  </Button>
                }
              >
                Connect a platform or follow a sheet to get going.
              </EmptyState>
            </Card>
            <Card className="flex flex-col gap-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-3 w-3/4" />
            </Card>
          </div>
        </Section>
      </main>
    </div>
  );
}

function TextureTile({
  label,
  dark,
  children,
}: {
  label: string;
  dark?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={`relative h-36 overflow-hidden rounded-[20px] border border-line ${dark ? "bg-[#08080b]" : "bg-surface"}`}
    >
      {children}
      <span className={`absolute bottom-3 left-3 label-mono ${dark ? "text-white/70" : ""}`}>
        {label}
      </span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-4 label-mono">{title}</h2>
      {children}
    </section>
  );
}

function Row({ children }: { children: ReactNode }) {
  return <div className="mb-3 flex flex-wrap items-center gap-2.5">{children}</div>;
}
