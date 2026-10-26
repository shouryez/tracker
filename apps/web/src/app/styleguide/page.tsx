import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { CircleCheck, Flame, Inbox, RotateCcw, Timer } from "lucide-react";
import {
  Button,
  ButtonArrow,
  Card,
  CardHeader,
  CardSub,
  CardTitle,
  DifficultyTag,
  EmptyState,
  Kbd,
  Skeleton,
  SkeletonCard,
  SpotlightTracker,
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

const SWATCHES = [
  ["bg", "bg-bg"],
  ["bg-2", "bg-bg-2"],
  ["surface", "bg-surface"],
  ["surface-2", "bg-surface-2"],
  ["surface-3", "bg-surface-3"],
  ["ink", "bg-ink"],
  ["ink-2", "bg-ink-2"],
  ["ink-3", "bg-ink-3"],
  ["primary", "bg-primary"],
  ["primary-2", "bg-primary-2"],
  ["signal", "bg-signal"],
  ["ember", "bg-ember"],
  ["easy", "bg-easy"],
  ["medium", "bg-medium"],
  ["hard", "bg-hard"],
  ["ok", "bg-ok"],
  ["warn", "bg-warn"],
  ["bad", "bg-bad"],
  ["info", "bg-info"],
] as const;
const SCALE = ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900"] as const;
const PRIMARY_SCALE: Record<(typeof SCALE)[number], string> = {
  "50": "bg-primary-50",
  "100": "bg-primary-100",
  "200": "bg-primary-200",
  "300": "bg-primary-300",
  "400": "bg-primary-400",
  "500": "bg-primary-500",
  "600": "bg-primary-600",
  "700": "bg-primary-700",
  "800": "bg-primary-800",
  "900": "bg-primary-900",
};

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
        <Section title="Colour">
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6 lg:grid-cols-10">
            {SWATCHES.map(([name, cls]) => (
              <div key={name} className="text-[12px]">
                <div className={`h-12 rounded-[10px] border border-line ${cls}`} />
                <span className="mt-1 block font-mono text-ink-3">{name}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 flex overflow-hidden rounded-[12px] border border-line">
            {SCALE.map((s) => (
              <div key={s} className={`h-10 flex-1 ${PRIMARY_SCALE[s]}`} title={`primary-${s}`} />
            ))}
          </div>
        </Section>

        <Section title="Type">
          <div className="flex flex-col gap-2">
            <p className="font-display text-[60px] leading-none tracking-[-0.02em]">
              <span className="text-ink-3">Display serif,</span> <em>italic.</em>
            </p>
            <p className="text-[38px] font-[550] tracking-[-0.04em]">Page title 38</p>
            <p className="text-[20px] font-[550] tracking-[-0.02em]">Section 20</p>
            <p className="text-[14px] font-[550]">Card title 14</p>
            <p className="text-15 text-ink-2">Body 15: the quick brown fox solves Two Sum.</p>
            <p className="font-mono text-2xs tracking-[.08em] text-ink-3 uppercase">
              Label · mono 11
            </p>
            <p className="num text-[48px]">1,234.5</p>
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

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-4 font-mono text-[11px] tracking-[.1em] text-ink-3 uppercase">{title}</h2>
      {children}
    </section>
  );
}

function Row({ children }: { children: ReactNode }) {
  return <div className="mb-3 flex flex-wrap items-center gap-2.5">{children}</div>;
}
