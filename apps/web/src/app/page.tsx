import Link from "next/link";
import type { ReactNode } from "react";
import { Check, LayoutDashboard, Lock, Puzzle, Timer, Trophy, UsersRound } from "lucide-react";
import {
  Aurora,
  ButtonArrow,
  Eyebrow,
  LiveDot,
  Logo,
  LogoMark,
  PixelHeatmap,
  SpotlightTracker,
  Tag,
  ThemeToggle,
  buttonClasses,
  cardClasses,
  cn,
} from "@upsolve/ui";
import { AnimatedBeam, Marquee as Ticker } from "@/components/fx/decor";
import { CursorGlow } from "@/components/fx/pointer";
import { Hero } from "@/components/landing/hero/hero";
import { ForgettingCurve } from "@/components/landing/forgetting-curve";
import { LandingNavLinks, SheetDemo, SmoothScroll } from "@/components/landing/landing-fx";
import { LiveTimer } from "@/components/landing/live-timer";
import {
  BackToTop,
  Magnetic,
  NavAutoHide,
  Reveal,
  ScrollProgress,
} from "@/components/landing/motion-bits";
import {
  PlayOnView,
  PauseOffscreen,
  StackCards,
  TimerDemo,
  VelocityMarquee,
  WordmarkFill,
} from "@/components/landing/scene-bits";
import { CONTACT_EMAIL, Founders } from "@/components/landing/founders";
import { SheetCover } from "@/components/sheet-identity";
import { PlatformMark } from "@/components/site-icons";

// Marketing site (DESIGN.md §9.1). Static: every number here is illustrative and
// labelled as such in the frame; claims match what the product does today.

const WRAP = "mx-auto w-[min(1200px,100%-32px)]";

/** Deterministic "random" activity so the mock heatmaps look lived-in. */
function demoLevels(days: number, seed: number): number[] {
  let x = seed;
  return Array.from({ length: days }, (_, i) => {
    x = (x * 1103515245 + 12345) % 2147483648;
    const r = x / 2147483648;
    const recent = i / days; // busier towards today
    const p = 0.35 + recent * 0.45;
    return r > p ? 0 : Math.min(4, 1 + Math.floor((r / p) * 4 * (0.6 + recent)));
  });
}

export default function Home() {
  return (
    <div className="relative overflow-x-clip">
      <Nav />
      <ScrollProgress />
      <main id="main">
        <Hero />
        <Marquee />
        <Reveal>
          <Features />
        </Reveal>
        <ForgettingCurve />
        <HowItWorks />
        <Reveal>
          <SheetShowcase />
        </Reveal>
        <Reveal>
          <Friends />
        </Reveal>
        <Reveal>
          <ForColleges />
        </Reveal>
        <Reveal>
          <Pricing />
        </Reveal>
        <Reveal>
          <Faq />
        </Reveal>
        <Founders />
      </main>
      <Footer />
      <BackToTop />
      <SpotlightTracker />
      <SmoothScroll />
      <PauseOffscreen selector="main > *, footer" />
    </div>
  );
}

// ---------------------------------------------------------------- nav

function Nav() {
  return (
    <NavAutoHide className="sticky top-3 z-50 px-4">
      <nav
        aria-label="Main"
        className="glass mx-auto flex h-[56px] w-[min(1100px,100%)] items-center justify-between gap-3 rounded-full border border-line-2 pr-2 pl-5 shadow-e3"
      >
        <Link href="/" aria-label="DsaKaro home">
          <Logo />
        </Link>
        <LandingNavLinks
          links={[
            { href: "#features", label: "Features" },
            { href: "#how", label: "How it works" },
            { href: "#colleges", label: "Colleges" },
            { href: "#faq", label: "FAQ" },
          ]}
        />
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <Link href="/login" className={buttonClasses({ variant: "ghost", size: "sm" })}>
            Sign in
          </Link>
          {/* cn() doesn't merge classes, so hide a wrapper rather than the button. */}
          <span className="hidden sm:contents">
            {/* Ink, not lime: the hero's CTA is the one lime element up here. */}
            <Link href="/signup" className={buttonClasses({ variant: "primary", size: "sm" })}>
              Get started
            </Link>
          </span>
        </div>
      </nav>
    </NavAutoHide>
  );
}

// ---------------------------------------------------------------- marquee

function Marquee() {
  const items: { label: string; site?: "leetcode" | "codeforces" | "gfg" | "tuf" | "neetcode" }[] =
    [
      { label: "LeetCode", site: "leetcode" },
      { label: "Codeforces", site: "codeforces" },
      { label: "GeeksforGeeks", site: "gfg" },
      { label: "Striver A2Z", site: "tuf" },
      { label: "NeetCode 150", site: "neetcode" },
      { label: "Blind 75" },
      { label: "Grind 75" },
      { label: "Striver SDE", site: "tuf" },
    ];
  return (
    <div aria-label="Supported platforms and sheets" className="border-y border-line py-5">
      <VelocityMarquee>
        <Ticker speed={40}>
          {items.map((t) => (
            <span
              key={t.label}
              className="group inline-flex items-center gap-2.5 text-[20px] font-semibold tracking-[-0.03em] whitespace-nowrap text-ink-3 transition-colors hover:text-ink"
            >
              {t.site && <PlatformMark site={t.site} size={20} />}
              {t.label}
            </span>
          ))}
        </Ticker>
      </VelocityMarquee>
    </div>
  );
}

// ---------------------------------------------------------------- features

function SectionHead({
  eyebrow,
  soft,
  em,
  children,
}: {
  eyebrow: string;
  soft: string;
  em: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-10 flex flex-col items-start gap-4 sm:mb-12">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="max-w-[18ch] font-display text-[clamp(36px,5.4vw,64px)] leading-[1] tracking-[-0.02em]">
        <span className="text-ink">{soft}</span> <em>{em}</em>
      </h2>
      <p className="max-w-[56ch] text-[15.5px] leading-relaxed text-ink-2">{children}</p>
    </div>
  );
}

function Bento({
  className,
  title,
  children,
  visual,
}: {
  className?: string;
  title: string;
  children: ReactNode;
  visual: ReactNode;
}) {
  return (
    <article
      data-spotlight
      className={cn(
        cardClasses({ interactive: true, spotlight: true }),
        "flex min-h-[300px] flex-col",
        className,
      )}
    >
      <PlayOnView className="flex-1">{visual}</PlayOnView>
      <h3 className="mt-5 text-[17px] font-semibold tracking-[-0.02em]">{title}</h3>
      <p className="mt-1.5 max-w-[46ch] text-[14px] leading-relaxed text-ink-2">{children}</p>
    </article>
  );
}

function Features() {
  return (
    <section id="features" className={cn(WRAP, "scroll-mt-24 pt-28")}>
      <SectionHead eyebrow="Features" soft="Not another counter." em="A coach.">
        Everything other trackers miss: real time per problem, an honest solved count, sheets that
        tick themselves, and revision that proves you still remember.
      </SectionHead>

      <div className="grid gap-3.5 md:grid-cols-2 lg:grid-cols-3">
        <Bento
          className="lg:col-span-2"
          title="A timer that runs itself"
          visual={
            <div className="grid gap-3 sm:grid-cols-[1.4fr_1fr]">
              <div className="overflow-hidden rounded-[14px] border border-line bg-bg-2">
                <div className="flex items-center gap-2 border-b border-line px-3 py-2 font-mono text-[11px] text-ink-3">
                  <span className="size-2 rounded-full bg-line-3" /> …/problems/koko-eating-bananas
                </div>
                <TimerDemo />
              </div>
              <dl className="flex flex-col justify-center gap-2 font-mono text-[12px]">
                {[
                  ["active", "18m 42s"],
                  ["idle (paused)", "4m 10s"],
                  ["submits", "3"],
                  ["how you solved it", "solo"],
                ].map(([k, v]) => (
                  <div
                    key={k}
                    className="flex justify-between border-b border-dashed border-line-2 pb-2"
                  >
                    <dt className="text-ink-3">{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          }
        >
          The Chrome extension starts timing when you open a LeetCode or GFG problem, pauses when
          you switch tabs or go idle, catches every verdict and asks one honest question after
          Accepted.
        </Bento>

        <Bento
          title="All your history, deduplicated"
          visual={
            <div>
              <span className="mb-3 block font-mono text-[10.5px] tracking-[.08em] text-ink-3 uppercase">
                One heatmap · every platform
              </span>
              <div className="mb-3 flex items-center gap-3 rounded-[12px] border border-line bg-bg-2 px-3 py-2.5">
                <span className="text-[12.5px] font-medium">1. Two Sum</span>
                <span aria-hidden="true" className="relative ml-auto h-4 w-[84px]">
                  <i className="demo-t absolute top-0 left-0 size-4 translate-x-[34px] rounded-[4px] bg-heat-3 armed:translate-x-0" />
                  <i className="demo-t absolute top-0 left-0 size-4 translate-x-[34px] rounded-[4px] bg-heat-3 opacity-0 armed:translate-x-[68px] armed:opacity-100" />
                </span>
                <Swap
                  className="w-[78px] text-right font-mono text-[10.5px] text-ink-3"
                  from="LC + GFG"
                  to="counts once"
                />
              </div>
              <PixelHeatmap levels={demoLevels(18 * 7, 3)} weeks={18} label="Example heatmap" />
            </div>
          }
        >
          LeetCode, Codeforces and GFG in one place. Two Sum solved on two sites counts once.
        </Bento>

        <Bento
          title="Solo, hint, or solution?"
          visual={
            <div>
              <span className="font-mono text-[10.5px] tracking-[.08em] text-ink-3 uppercase">
                Honest solved count
              </span>
              <span className="num mt-2 block text-[48px]">
                412<small className="ml-1 text-[.42em] font-normal text-ink-3">solved</small>
              </span>
              <div className="mt-2 flex h-2.5 gap-[3px] overflow-hidden rounded-full">
                {(
                  [
                    [281, "bg-ink", 0],
                    [86, "bg-ink-3", 250],
                    [45, "hatch bg-surface-3", 500],
                  ] as const
                ).map(([n, tone, delay]) => (
                  <i
                    key={n}
                    className={cn("demo-t origin-left rounded-[3px] armed:scale-x-0", tone)}
                    style={{ flex: n, transitionDelay: `${delay}ms` }}
                  />
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-3 font-mono text-[11px] text-ink-3">
                <span>281 solo</span>
                <span>86 hint</span>
                <span>45 saw solution</span>
              </div>
            </div>
          }
        >
          One tap after Accepted. Your stats, topic mastery and revision schedule stop lying to you.
        </Bento>

        <Bento
          title="Revision you have to prove"
          visual={
            <div className="flex flex-col gap-2">
              <span className="mb-1 font-mono text-[10.5px] tracking-[.08em] text-ink-3 uppercase">
                Due today · 5
              </span>
              <div className="rounded-[12px] border border-line bg-bg-2 p-3">
                <span className="mb-2.5 flex items-center justify-between gap-2">
                  <b className="truncate text-[13px] font-medium">Coin Change</b>
                  <span
                    className="demo-t rounded-full bg-ok-soft px-2 py-0.5 font-mono text-[10.5px] text-ok armed:opacity-0"
                    style={{ transitionDelay: "500ms" }}
                  >
                    remembered ✓
                  </span>
                </span>
                <div aria-hidden="true" className="relative grid grid-cols-6 gap-1">
                  {[1, 3, 7, 16, 35, 90].map((d) => (
                    <span
                      key={d}
                      className="grid h-7 place-items-center rounded-[7px] border border-line font-mono text-[10.5px] text-ink-3"
                    >
                      {d}d
                    </span>
                  ))}
                  <span className="demo-t absolute inset-y-0 left-0 w-[calc((100%-20px)/6)] translate-x-[calc(300%+12px)] rounded-[7px] bg-primary-soft ring-1 ring-primary/60 armed:translate-x-[calc(200%+8px)]" />
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 rounded-[10px] border border-line bg-bg-2 px-3 py-2">
                <b className="truncate text-[13px] font-medium">Course Schedule II</b>
                <Tag tone="wa" mono>
                  2d overdue
                </Tag>
              </div>
            </div>
          }
        >
          Spaced repetition (1 → 3 → 7 → 16 → 35 → 90 days). A re-solve the extension sees moves a
          problem further out; needing a hint brings it back.
        </Bento>

        <Bento
          title="Your sheets, ticked for you"
          visual={
            <div className="flex flex-col gap-4">
              <span className="flex items-center justify-between gap-2 font-mono text-[10.5px] tracking-[.08em] text-ink-3 uppercase">
                Solved · Koko Eating Bananas
                <span className="demo-t text-ok normal-case armed:opacity-0">2 sheets ticked</span>
              </span>
              {(
                [
                  ["Striver A2Z", 212, 495, 0],
                  ["NeetCode 150", 98, 150, 250],
                ] as const
              ).map(([name, done, total, delay]) => (
                <div key={name}>
                  <div className="mb-1.5 flex justify-between text-[13px]">
                    <b className="font-medium">{name}</b>
                    <span className="font-mono text-ink-3">
                      <Swap from={String(done)} to={String(done + 1)} delay={delay} />/{total}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-3">
                    <div
                      className="h-full rounded-full bg-ink"
                      style={{ width: `${((done + 1) / total) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          }
        >
          Solve on LeetCode or GFG and every sheet with that problem ticks itself.
        </Bento>

        <Bento
          className="md:col-span-2 lg:col-span-3 lg:min-h-0"
          title="Contests, then upsolve"
          visual={
            <div className="grid gap-4 sm:grid-cols-[1.2fr_auto_auto] sm:items-end">
              <div className="flex flex-col gap-2">
                <span className="font-mono text-[10.5px] tracking-[.08em] text-ink-3 uppercase">
                  Weekly Contest 421
                </span>
                <div className="flex gap-1.5">
                  <Tag tone="ac" mono>
                    <Check size={10} /> Q1
                  </Tag>
                  <Tag tone="ac" mono>
                    <Check size={10} /> Q2
                  </Tag>
                  <span className="relative inline-grid">
                    <Tag mono className="demo-t [grid-area:1/1] opacity-0 armed:opacity-100">
                      Q3
                    </Tag>
                    <Tag tone="ac" mono className="demo-t [grid-area:1/1] armed:opacity-0">
                      <Check size={10} /> Q3
                    </Tag>
                  </span>
                  <Tag mono>Q4</Tag>
                </div>
              </div>
              <span className="num text-[28px] text-ok">+38</span>
              <span className="font-mono text-[12px] text-ink-3">
                <Swap from="2" to="1" /> left to upsolve
              </span>
            </div>
          }
        >
          Rating charts for Codeforces and LeetCode, and an upsolve list of every contest problem
          you haven&apos;t finished yet.
        </Bento>
      </div>
    </section>
  );
}

/** A value that rolls from `from` to `to` when its demo plays (see PlayOnView). */
function Swap({
  from,
  to,
  delay = 0,
  className,
}: {
  from: string;
  to: string;
  delay?: number;
  className?: string;
}) {
  return (
    <span className={cn("relative inline-grid overflow-hidden align-bottom", className)}>
      <span
        aria-hidden="true"
        className="demo-t [grid-area:1/1] -translate-y-full opacity-0 armed:translate-y-0 armed:opacity-100"
        style={{ transitionDelay: `${delay}ms` }}
      >
        {from}
      </span>
      <span
        className="demo-t [grid-area:1/1] armed:translate-y-full armed:opacity-0"
        style={{ transitionDelay: `${delay}ms` }}
      >
        {to}
      </span>
    </span>
  );
}

// ---------------------------------------------------------------- how it works

function HowItWorks() {
  const steps = [
    {
      icon: <UsersRound size={18} />,
      title: "Sign in and connect",
      body: "Google sign-in, then your LeetCode, Codeforces and GFG usernames. Your history syncs in seconds; nothing to install yet.",
    },
    {
      icon: <Puzzle size={18} />,
      title: "Add the extension",
      body: "It times each problem, catches verdicts and imports your full LeetCode history from your own browser. No code or passwords ever leave it.",
    },
    {
      icon: <Timer size={18} />,
      title: "Just solve",
      body: "Follow a sheet, open Revision once a day, and let the dashboard tell you what to do next.",
    },
  ];
  return (
    <section id="how" className={cn(WRAP, "scroll-mt-24 pt-28")}>
      <SectionHead eyebrow="How it works" soft="Three minutes to set up." em="Then it's automatic.">
        No spreadsheets, no ticking boxes by hand, no remembering what you solved last month.
      </SectionHead>
      <div className="surface-card mb-3.5 rounded-[22px] px-4 py-6 sm:px-10">
        <AnimatedBeam
          height={200}
          nodes={[
            {
              id: "lc",
              label: "LeetCode",
              icon: <PlatformMark site="leetcode" size={20} brand />,
              x: 8,
              y: 22,
            },
            {
              id: "gfg",
              label: "GFG",
              icon: <PlatformMark site="gfg" size={20} brand />,
              x: 8,
              y: 78,
            },
            {
              id: "cf",
              label: "Codeforces",
              icon: <PlatformMark site="codeforces" size={20} brand />,
              x: 30,
              y: 82,
            },
            { id: "ext", label: "Extension", icon: <Puzzle size={20} />, x: 38, y: 34 },
            { id: "up", label: "DsaKaro", icon: <LogoMark size={22} />, x: 66, y: 50 },
            {
              id: "dash",
              label: "Your dashboard",
              icon: <LayoutDashboard size={20} />,
              x: 92,
              y: 50,
            },
          ]}
          edges={[
            ["lc", "ext"],
            ["gfg", "ext"],
            ["ext", "up"],
            ["cf", "up"],
            ["up", "dash"],
          ]}
        />
      </div>
      {/* Sticky stacked cards: each step slides over the last, which settles back. */}
      <StackCards className="flex flex-col gap-4">
        {steps.map((s, i) => (
          <li
            key={s.title}
            data-spotlight
            className={cn(
              cardClasses({ spotlight: true }),
              "sticky origin-top p-[22px] will-change-transform sm:p-7",
            )}
            style={{ top: `${96 + i * 18}px` }}
          >
            <div className="flex items-start gap-5">
              <span className="tnum font-mono text-[44px] leading-none font-[600] text-ink-4">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0 flex-1">
                <span className="mb-4 grid size-10 place-items-center rounded-[12px] border border-line bg-surface-2 text-ink-2">
                  {s.icon}
                </span>
                <h3 className="text-[19px] font-semibold tracking-[-0.02em]">{s.title}</h3>
                <p className="mt-1.5 max-w-[60ch] text-[14.5px] leading-relaxed text-ink-2">
                  {s.body}
                </p>
              </div>
            </div>
          </li>
        ))}
      </StackCards>
    </section>
  );
}

// ---------------------------------------------------------------- sheet showcase

const SHEETS = [
  { slug: "striver-a2z", name: "Striver's A2Z DSA Sheet", by: "Striver (takeUforward)", n: 495 },
  { slug: "striver-sde", name: "SDE Sheet", by: "Striver (takeUforward)", n: 156 },
  { slug: "neetcode-150", name: "NeetCode 150", by: "NeetCode", n: 150 },
  { slug: "blind-75", name: "Blind 75", by: "NeetCode", n: 75 },
  { slug: "grind-75", name: "Grind 75", by: "Yangshun Tay", n: 75 },
];

function SheetShowcase() {
  return (
    <section className={cn(WRAP, "pt-28")}>
      <SectionHead eyebrow="Sheets" soft="Striver's sheet," em="with superpowers.">
        Every problem with its video (playing right inside the sheet, at the right minute), the
        article, and a button for LeetCode, GFG or takeUforward. Notes, stars and revision badges on
        every row. We only link: the videos and articles stay with their creators.
      </SectionHead>
      <ul
        aria-label="Supported sheets"
        className="-mx-4 mb-3.5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {SHEETS.map((s) => (
          <li
            key={s.slug}
            className="surface-card w-[250px] shrink-0 snap-start overflow-hidden rounded-[20px] sm:w-[270px]"
          >
            <SheetCover slug={s.slug} name={s.name} className="h-[104px]" />
            <div className="px-4 pt-1 pb-4">
              <span className="block truncate text-[15px] font-semibold tracking-[-0.01em]">
                {s.name}
              </span>
              <span className="mt-0.5 flex justify-between gap-2 text-[12.5px] text-ink-3">
                <span className="truncate">by {s.by}</span>
                <span className="tnum shrink-0 font-mono">{s.n}</span>
              </span>
            </div>
          </li>
        ))}
      </ul>
      <SheetDemo />
    </section>
  );
}

// ---------------------------------------------------------------- friends

function Friends() {
  const room = [
    ["Asha", "Word Ladder", 24 * 60 + 10, "Hard"],
    ["Rohan", "Rotting Oranges", 8 * 60 + 55, "Medium"],
    ["Meera", "Top K Frequent Elements", 3 * 60 + 2, "Medium"],
  ] as const;
  // Before and after the week's last solves: You overtake Asha.
  const board = [
    { name: "You", from: 104, to: 121, was: 1, now: 0, you: true },
    { name: "Asha", from: 118, to: 119, was: 0, now: 1, you: false },
    { name: "Rohan", from: 87, to: 90, was: 2, now: 2, you: false },
  ];
  const rowY = ["translate-y-0", "translate-y-[52px]", "translate-y-[104px]"];
  const armedY = ["armed:translate-y-0", "armed:translate-y-[52px]", "armed:translate-y-[104px]"];
  return (
    <section id="friends" className={cn(WRAP, "scroll-mt-24 pt-28")}>
      <SectionHead eyebrow="Friends" soft="Grind together." em="Not alone at 1 a.m.">
        Friend groups with a weekly leaderboard that rewards showing up, not one-night grinds, and a
        study room that shows who&apos;s solving what right now. College and batch boards are
        opt-in. Names below are an example.
      </SectionHead>
      <div className="grid gap-3.5 lg:grid-cols-2">
        <div className="surface-card rounded-[22px] p-5">
          <span className="mb-3 flex items-center gap-2 font-mono text-[10.5px] tracking-[.08em] text-ink-3 uppercase">
            <LiveDot /> Study room · 3 solving now
          </span>
          <ul className="flex flex-col">
            {room.map(([name, problem, start, diff]) => (
              <li
                key={name}
                className="flex items-center gap-3 border-t border-dashed border-line-2 py-3 first:border-t-0"
              >
                <span className="relative grid size-9 shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,#34343a,#18181b)] text-[12px] font-semibold text-white">
                  {name.slice(0, 1)}
                  <i className="absolute right-0 bottom-0 size-2.5 rounded-full bg-ok ring-2 ring-[var(--surface)]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-medium">{name}</span>
                  <span className="block truncate text-[12.5px] text-ink-2">
                    {problem} · {diff}
                  </span>
                </span>
                <LiveTimer startSeconds={start} className="num font-mono text-[15px] text-ink-2" />
              </li>
            ))}
          </ul>
        </div>
        <PlayOnView className="surface-card rounded-[22px] p-5">
          <span className="mb-3 flex items-center gap-2 font-mono text-[10.5px] tracking-[.08em] text-ink-3 uppercase">
            <Trophy size={12} /> This week · honest solved count
          </span>
          {/* Rows sit at their rank; when the demo plays they slide into the new order. */}
          <ol className="relative h-[156px]">
            {board.map((r) => (
              <li
                key={r.name}
                className={cn(
                  "demo-t absolute inset-x-0 top-0 flex h-[52px] items-center gap-3 rounded-[12px] px-3",
                  r.you && "bg-surface-2 ring-1 ring-line-2",
                  rowY[r.now],
                  armedY[r.was],
                )}
              >
                <span className="num grid size-7 place-items-center rounded-[8px] bg-surface-3 text-[13px]">
                  <Swap from={String(r.was + 1)} to={String(r.now + 1)} />
                </span>
                <span className="flex-1 text-[14px] font-medium">{r.name}</span>
                <span className="num text-[16px]">
                  <Swap from={String(r.from)} to={String(r.to)} />
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-3 font-mono text-[11.5px] text-ink-3">
            Weekly board · example names and numbers.
          </p>
        </PlayOnView>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- colleges

function ForColleges() {
  const batches = [
    ["Topic: Graphs", 34],
    ["Topic: DP", 22],
    ["Topic: Trees", 58],
    ["Topic: Arrays", 81],
  ] as const;
  return (
    <section id="colleges" className={cn(WRAP, "scroll-mt-24 pt-28")}>
      <div className="surface-card grid items-center gap-8 rounded-[28px] p-6 sm:p-10 lg:grid-cols-2">
        <div className="flex flex-col items-start gap-4">
          <span className="flex items-center gap-2">
            <Eyebrow>For placement cells</Eyebrow>
            <span className="sheen rounded-full border border-violet-line bg-violet-soft px-2.5 py-0.5 text-11 font-[600] text-violet">
              Coming soon
            </span>
          </span>
          <h2 className="font-display text-[clamp(32px,4.6vw,54px)] leading-[1] tracking-[-0.02em]">
            <span className="text-ink">See where your batch</span> <em>actually stands.</em>
          </h2>
          <p className="text-[15px] leading-relaxed text-ink-2">
            Topic gaps across a batch, who&apos;s gone quiet before placement season, and readiness
            for the companies that visit your campus. Built from the same honest data students see,
            only for students who opt in.
          </p>
          <a
            href="mailto:cutubuildlabs@gmail.com?subject=DsaKaro%20for%20our%20college"
            className={buttonClasses({ variant: "secondary" })}
          >
            Pilot it at your college <ButtonArrow />
          </a>
        </div>
        <PlayOnView className="surface-inset rounded-[20px] p-5">
          <span className="mb-4 block label-mono">Batch 2027 · topic mastery (example)</span>
          {batches.map(([t, v], i) => (
            <div key={t} className="mb-3 last:mb-0">
              <div className="mb-1.5 flex justify-between text-[13px]">
                <span>{t.replace("Topic: ", "")}</span>
                <span
                  className="tnum font-mono"
                  style={{
                    color: v < 25 ? "var(--hard)" : v < 60 ? "var(--medium)" : "var(--easy)",
                  }}
                >
                  {v}
                </span>
              </div>
              <div className="relative h-2 overflow-hidden rounded-full bg-surface-3">
                <span
                  className="demo-t absolute inset-y-0 left-0 origin-left rounded-full armed:scale-x-0"
                  style={{
                    transitionDelay: `${i * 120}ms`,
                    width: `${v}%`,
                    background: `linear-gradient(90deg, transparent, ${v < 25 ? "var(--hard)" : v < 60 ? "var(--medium)" : "var(--easy)"})`,
                  }}
                />
              </div>
            </div>
          ))}
        </PlayOnView>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- pricing

function Pricing() {
  const plans = [
    {
      name: "Students",
      price: "Free",
      note: "during the beta, and the core stays free",
      cta: { label: "Start free", href: "/signup" },
      items: [
        "LeetCode, Codeforces and GFG sync",
        "Extension timer and verdicts",
        "All five sheets, auto-ticked",
        "Revision queue and topic mastery",
        "Groups, leaderboards, study rooms",
      ],
      featured: true,
    },
    {
      name: "Pro",
      price: "Later",
      note: "for the extras, never the basics",
      items: ["AI weekly review", "Interview mode", "Deeper analytics", "Unlimited revision cap"],
    },
    {
      name: "Colleges",
      price: "Talk to us",
      note: "free pilot for the first placement cells",
      cta: {
        label: "Get in touch",
        href: "mailto:cutubuildlabs@gmail.com?subject=DsaKaro%20for%20our%20college",
      },
      items: ["Batch dashboards", "Topic gaps by section", "Inactive-student alerts", "CSV export"],
    },
  ];
  return (
    <section className={cn(WRAP, "pt-24")}>
      <SectionHead eyebrow="Pricing" soft="Free for students." em="Really.">
        The things that help you practise are free. If we ever charge, it&apos;s for extras, and
        we&apos;ll say so up front.
      </SectionHead>
      <div className="grid gap-3.5 lg:grid-cols-3">
        {plans.map((p) => (
          <div
            key={p.name}
            className={cn(
              "relative isolate flex flex-col overflow-hidden rounded-[22px] p-[22px]",
              p.featured
                ? "surface-card border-beam shadow-[var(--e2),0_0_60px_-20px_var(--signal)]"
                : "surface-card",
            )}
          >
            {p.price === "Later" && (
              <span
                aria-hidden="true"
                className="hatch pointer-events-none absolute inset-0 -z-10 opacity-60"
              />
            )}
            {p.featured && (
              <span className="absolute top-4 right-4 rounded-full bg-signal px-2.5 py-1 text-11 font-[700] text-signal-ink">
                Free forever for students
              </span>
            )}
            <span className="label-mono">{p.name}</span>
            <span className="num mt-3 text-[40px]">{p.price}</span>
            <span className="text-[13px] text-ink-3">{p.note}</span>
            <ul className="mt-5 mb-6 flex flex-col gap-2 text-[14px]">
              {p.items.map((i) => (
                <li key={i} className="flex gap-2">
                  <Check size={15} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />
                  {i}
                </li>
              ))}
            </ul>
            {p.cta && (
              <Link
                href={p.cta.href}
                className={buttonClasses({
                  variant: p.featured ? "signal" : "secondary",
                  className: "mt-auto",
                })}
              >
                {p.cta.label} <ButtonArrow />
              </Link>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- FAQ

function Faq() {
  const qa: [string, ReactNode][] = [
    [
      "Do you see my code or my passwords?",
      "No. The extension never uploads your code, and your LeetCode or GFG login never leaves your browser. We store problem names, verdicts, times and how you solved it, and that's all.",
    ],
    [
      "What does the extension read?",
      "Only LeetCode and GFG problem pages: the problem you're on, your submissions' verdicts, and (if you ask) your LeetCode submission history. It doesn't read other sites, tabs or your browsing history.",
    ],
    [
      "Who can see my progress?",
      "Only you, by default. A public profile, college leaderboards and showing what you're solving to friend groups are all separate switches you turn on yourself.",
    ],
    [
      "Do I need the extension?",
      "No. Connect your usernames and your solves, sheets, revision and contests work without it. The extension adds the timer, every verdict, and honest solo/hint answers.",
    ],
    [
      "Which platforms and sheets are supported?",
      "LeetCode, Codeforces and GeeksforGeeks today; CodeChef and AtCoder next. Sheets: Striver A2Z, Striver SDE, NeetCode 150, Blind 75 and Grind 75.",
    ],
    [
      "Is it really free?",
      "Yes. Students get everything listed above for free. We may add paid extras later, but the core stays free.",
    ],
  ];
  return (
    <section id="faq" className={cn(WRAP, "scroll-mt-24 pt-24")}>
      <SectionHead eyebrow="FAQ" soft="Privacy first," em="always.">
        The questions people ask before installing anything that touches their coding accounts.
      </SectionHead>
      <div className="flex flex-col gap-2.5">
        {qa.map(([q, a], i) => (
          <details
            key={q}
            open={i === 0}
            className="group surface-card relative overflow-hidden rounded-[16px] px-5 transition-shadow open:shadow-e2 before:absolute before:top-4 before:bottom-4 before:left-0 before:w-[3px] before:scale-y-0 before:rounded-r-full before:bg-signal before:transition-transform open:before:scale-y-100"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[15px] font-medium [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-2.5">
                {i < 3 && <Lock size={14} className="shrink-0 text-ink-3" aria-hidden="true" />}
                {q}
              </span>
              <span
                aria-hidden="true"
                className="grid size-7 shrink-0 place-items-center rounded-full border border-line-2 text-ink-3 transition-[transform,background-color,color] duration-[var(--dur-base)] group-open:rotate-45 group-open:bg-signal group-open:text-signal-ink"
              >
                +
              </span>
            </summary>
            <p className="max-w-[70ch] pb-5 text-[14.5px] leading-relaxed text-ink-2">{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- footer

function Footer() {
  return (
    <footer className="relative mt-32 overflow-hidden">
      <div className={cn(WRAP, "flex flex-col gap-6 pb-10")}>
        <div className="relative isolate overflow-hidden rounded-[32px] bg-[#08080d] px-6 py-16 text-center text-white ring-1 ring-white/10 sm:py-24">
          <Aurora />
          <span aria-hidden="true" className="starfield absolute inset-0 opacity-60" />
          <CursorGlow />
          <h2 className="relative mx-auto max-w-[16ch] font-display text-[clamp(40px,6vw,80px)] leading-[1] tracking-[-0.02em]">
            Stop counting. <em>Start upsolving.</em>
          </h2>
          <p className="relative mx-auto mt-4 max-w-[46ch] text-15 text-white/70">
            Free for students. Sign in with Google and your history is here in seconds.
          </p>
          <div className="relative mt-8 flex justify-center">
            <Magnetic>
              <Link href="/signup" className={buttonClasses({ variant: "signal", size: "lg" })}>
                <span data-magnetic-label className="inline-flex items-center gap-2">
                  Start free with Google <ButtonArrow />
                </span>
              </Link>
            </Magnetic>
          </div>
        </div>
        <div className="mt-6 flex w-full flex-wrap items-center justify-between gap-4 border-t border-line pt-6 text-[13px] text-ink-3">
          <span className="flex items-center gap-2">
            <PixelHeart /> Built by students, for students.
          </span>
          <nav aria-label="Footer" className="flex flex-wrap gap-5">
            <a href="#features" className="hover:text-ink">
              Features
            </a>
            <a href="#team" className="hover:text-ink">
              Team
            </a>
            <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-ink">
              Contact
            </a>
            <Link href="/privacy" className="hover:text-ink">
              Privacy
            </Link>
            <a href="https://github.com/shouryez/upsolve" className="hover:text-ink">
              GitHub
            </a>
            <Link href="/login" className="hover:text-ink">
              Sign in
            </Link>
          </nav>
        </div>
      </div>
      {/* DSA करो across the full width; its headline bar fills with lime as you reach the end,
          and the letters fade toward the bottom of the page. */}
      <WordmarkFill className="mx-auto mt-6 w-[min(1180px,100%-32px)] pb-10 [mask-image:linear-gradient(180deg,#000_12%,rgba(0,0,0,.45)_42%,rgba(0,0,0,.1)_75%,transparent)] select-none" />
    </footer>
  );
}

/** A tiny heart drawn in pixels, like the heatmap. */
function PixelHeart() {
  const rows = ["0110110", "1111111", "1111111", "0111110", "0011100", "0001000"];
  return (
    <span aria-hidden="true" className="grid grid-cols-7 gap-px">
      {rows.flatMap((r, y) =>
        [...r].map((c, x) => (
          <i key={`${x}-${y}`} className={c === "1" ? "size-[2px] bg-hard" : "size-[2px]"} />
        )),
      )}
    </span>
  );
}

// DsaKaro
