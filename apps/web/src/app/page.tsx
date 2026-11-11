import Link from "next/link";
import type { ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";
import {
  ButtonArrow,
  Logo,
  LogoMark,
  SpotlightTracker,
  ThemeToggle,
  buttonClasses,
  cn,
} from "@upsolve/ui";
import { Marquee as Ticker } from "@/components/fx/decor";
import { NumberTicker } from "@/components/fx/number-ticker";
import { DayDial, Rekha } from "@/components/dashboard/lamplight";
import { ForgettingCurve } from "@/components/landing/forgetting-curve";
import { CONTACT_EMAIL, Founders } from "@/components/landing/founders";
import { Drift, HeroCopyDrift, TiltFrame } from "@/components/landing/lamp-scroll";
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
  PauseOffscreen,
  PlayOnView,
  VelocityMarquee,
  WordmarkFill,
} from "@/components/landing/scene-bits";
import { SCENE_SCRIPT } from "@/components/landing/hero/scene-script";
import { BookCover } from "@/components/sheet-identity";
import { PlatformMark } from "@/components/site-icons";
import { StudyBuddy } from "@/components/study-buddy";

// Marketing site, Lamplight. Static: every number in a mock is illustrative and labelled
// as an example; claims match what the product does today.

const WRAP = "mx-auto w-[min(1200px,100%-32px)]";

/** Deterministic "random" activity so the mock heatmap looks lived-in. */
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
    <div className="desk relative overflow-x-clip">
      <Nav />
      <ScrollProgress />
      <main id="main">
        <Hero />
        <Platforms />
        <HowItWorks />
        <ForgettingCurve />
        <Sheets />
        <Friends />
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
        className="glass mx-auto flex h-[56px] w-[min(1160px,100%)] items-center justify-between gap-3 rounded-[16px] border border-line-2 pr-2 pl-5 shadow-e3"
      >
        <Link href="/" aria-label="DsaKaro home">
          <Logo />
        </Link>
        <LandingNavLinks
          links={[
            { href: "#how", label: "How it works" },
            { href: "#revision", label: "Revision" },
            { href: "#sheets", label: "Sheets" },
            { href: "#friends", label: "Friends" },
            { href: "#pricing", label: "Pricing" },
          ]}
        />
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <Link href="/login" className={buttonClasses({ variant: "ghost", size: "sm" })}>
            Sign in
          </Link>
          <span className="hidden sm:contents">
            <Link href="/signup" className={buttonClasses({ variant: "secondary", size: "sm" })}>
              Get started
            </Link>
          </span>
        </div>
      </nav>
    </NavAutoHide>
  );
}

// ---------------------------------------------------------------- hero

function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative isolate pt-16 sm:pt-24">
      {/* Before paint: turns on the pinned scroll scenes (revision curve) where they can run. */}
      <script dangerouslySetInnerHTML={{ __html: SCENE_SCRIPT }} />
      {/* The lamp, and a dot field that fades out around the headline. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-24 -z-10 h-[900px] bg-[radial-gradient(900px_520px_at_50%_18%,rgba(240,136,79,.12),transparent_65%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-20 -z-10 h-[720px] bg-[radial-gradient(var(--dots)_1px,transparent_1.4px)] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_30%,#000,transparent)] bg-[length:22px_22px]"
      />

      <HeroCopyDrift className={cn(WRAP, "flex flex-col items-center gap-6 text-center")}>
        <span className="flex animate-[rise-in_700ms_var(--ease-out)_backwards] items-center gap-2 rounded-full bg-surface-2 px-3 py-1.5 label-mono shadow-[inset_0_0_0_1px_var(--line-2)]">
          <span className="size-1.5 rounded-full bg-signal shadow-[0_0_0_3px_var(--color-signal-soft)]" />
          LeetCode · Codeforces · GFG · free for students
        </span>
        <h1
          id="hero-title"
          className="max-w-[14ch] text-[clamp(44px,7.4vw,96px)] leading-[.96] font-[640] tracking-[-0.055em] text-balance"
        >
          Every problem you solve,{" "}
          <span className="relative whitespace-nowrap">
            remembered.
            <span
              aria-hidden="true"
              className="absolute right-[3%] -bottom-[.03em] left-0 h-[.07em] origin-left animate-[grow-x_1100ms_var(--ease-out)_350ms_backwards] rounded-full bg-signal shadow-[0_0_30px_color-mix(in_srgb,var(--signal)_55%,transparent)]"
            />
          </span>
        </h1>
        <p className="max-w-[600px] animate-[rise-in_700ms_var(--ease-out)_150ms_backwards] text-[clamp(15px,1.6vw,18px)] leading-relaxed text-ink-2">
          DsaKaro times every problem you open, catches every verdict, ticks your Striver and
          NeetCode sheets for you, and tells you exactly what to revise before you forget it.
        </p>
        <div className="flex animate-[rise-in_700ms_var(--ease-out)_250ms_backwards] flex-wrap justify-center gap-3">
          <Magnetic>
            <Link href="/signup" className={buttonClasses({ variant: "signal", size: "lg" })}>
              <span data-magnetic-label className="inline-flex items-center gap-2">
                Start free with Google <ButtonArrow />
              </span>
            </Link>
          </Magnetic>
          <a href="#how" className={buttonClasses({ variant: "secondary", size: "lg" })}>
            See how it works
          </a>
        </div>
      </HeroCopyDrift>

      <TiltFrame className={cn(WRAP, "mt-16 max-w-[1120px]")}>
        <ProductFrame />
      </TiltFrame>
      <a
        href="#how"
        aria-label="Scroll to how it works"
        className="mx-auto mt-10 flex w-fit flex-col items-center gap-1 label-mono text-ink-3 hover:text-ink"
      >
        Scroll
        <ChevronDown
          size={14}
          aria-hidden="true"
          className="animate-bounce motion-reduce:animate-none"
        />
      </a>
    </section>
  );
}

/** A small, honest picture of the dashboard (example data) inside a device frame. */
function ProductFrame() {
  const levels = demoLevels(40 * 7, 7);
  const START = Date.UTC(2026, 0, 1, 22, 30);
  const H = 3_600_000;
  const nav = ["Overview", "Today", "Revision", "Sheets", "Sessions", "Groups"];
  return (
    <div className="rounded-[22px_22px_0_0] bg-[linear-gradient(180deg,var(--surface-3),var(--surface))] p-3 pb-0 shadow-[inset_0_0_0_1px_var(--line-2),0_60px_120px_-40px_rgba(0,0,0,.9)]">
      <div className="flex items-center gap-1.5 px-2 pb-2.5" aria-hidden="true">
        <i className="size-2.5 rounded-full bg-line-3" />
        <i className="size-2.5 rounded-full bg-line-3" />
        <i className="size-2.5 rounded-full bg-line-3" />
        <span className="mx-auto rounded-[6px] bg-surface-2 px-3 py-0.5 font-mono text-[10.5px] text-ink-3">
          dsakaro.com/dashboard
        </span>
        <span className="font-mono text-[10px] text-ink-4">example</span>
      </div>
      <div className="grid min-h-[440px] overflow-hidden rounded-[14px_14px_0_0] bg-bg text-left shadow-[inset_0_0_0_1px_var(--line)] md:grid-cols-[176px_minmax(0,1fr)]">
        <div className="hidden flex-col gap-1 border-r border-line p-3 md:flex" aria-hidden="true">
          <span className="flex items-center gap-2 px-2 pb-3">
            <LogoMark size={18} />
            <span className="text-[12.5px] font-[650]">DSA करो</span>
          </span>
          {nav.map((n, i) => (
            <span
              key={n}
              className={cn(
                "flex h-7 items-center rounded-[8px] px-2.5 text-12",
                i === 0 ? "bg-surface-3 text-ink" : "text-ink-3",
              )}
            >
              {n}
            </span>
          ))}
        </div>
        <div className="grid content-start gap-3 p-4 sm:grid-cols-3 sm:p-5">
          <div className="surface-card flex flex-col items-center gap-4 rounded-[14px] p-4 sm:col-span-2 sm:flex-row">
            <DayDial
              dayStart={START}
              now={START + 18.6 * H}
              resetHour={4}
              sessions={[
                { start: START + 15 * H, ms: 57 * 60_000 },
                { start: START + 17.3 * H, ms: 52 * 60_000 },
              ]}
              solves={[START + 15.8 * H, START + 17.9 * H]}
              focusMs={112 * 60_000}
              goalMs={60 * 60_000}
              solvedToday={2}
              className="w-[150px] shrink-0 [&_figcaption_.label-mono]:hidden [&_figcaption_.num]:text-[20px] [&_figcaption>span:last-child]:hidden"
            />
            <div className="flex w-full min-w-0 flex-col gap-2">
              <span className="flex justify-between text-[12.5px] font-[600]">
                Today&apos;s list <span className="font-mono font-normal text-ink-3">2 of 4</span>
              </span>
              <Rekha value={0.5} />
              {[
                ["Find Peak Element", true],
                ["Koko Eating Bananas", true],
                ["Search in Rotated Sorted Array II", false],
              ].map(([t, done]) => (
                <span key={t as string} className="flex items-center gap-2 text-12">
                  <span
                    className={cn(
                      "grid size-5 shrink-0 place-items-center rounded-[6px] text-[10px]",
                      done ? "bg-signal/15 text-signal-text" : "bg-surface-3 text-ink-3",
                    )}
                  >
                    {done ? <Check size={11} aria-hidden="true" /> : "03"}
                  </span>
                  <span className={cn("truncate", !done && "text-ink-2")}>{t}</span>
                </span>
              ))}
            </div>
          </div>
          <div className="surface-card flex flex-col gap-1 rounded-[14px] p-4">
            <span className="text-12 text-ink-2">Solved</span>
            <span className="num text-[40px]">
              <NumberTicker value={412} />
            </span>
            <span className="font-mono text-11 text-signal-text">+1 just now</span>
            <svg
              viewBox="0 0 120 28"
              preserveAspectRatio="none"
              className="mt-auto h-7 w-full"
              aria-hidden="true"
            >
              <polyline
                points="0,24 20,22 40,20 60,15 80,14 100,8 120,4"
                fill="none"
                stroke="var(--signal)"
                strokeWidth={1.6}
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </div>
          <div className="surface-card flex flex-col gap-2.5 rounded-[14px] p-4 sm:col-span-3">
            <span className="flex justify-between text-[12.5px] font-[600]">
              Activity <span className="font-normal text-ink-3">streak 47 days</span>
            </span>
            <div
              className="grid grid-flow-col grid-rows-7 gap-[3px] max-sm:[&>i:nth-child(-n+140)]:hidden"
              aria-hidden="true"
            >
              {levels.map((l, i) => (
                <i
                  key={i}
                  className="aspect-square animate-[pop-in_500ms_var(--ease-out)_backwards] rounded-[3px]"
                  style={{
                    background: `var(--heat-${l})`,
                    animationDelay: `${300 + Math.floor(i / 7) * 22}ms`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- platforms

function Platforms() {
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
    <div
      aria-label="Supported platforms and sheets"
      className="mt-20 border-y border-line bg-surface/60 py-5"
    >
      <VelocityMarquee>
        <Ticker speed={40}>
          {items.map((t) => (
            <span
              key={t.label}
              className="inline-flex items-center gap-2.5 text-[18px] font-semibold tracking-[-0.03em] whitespace-nowrap text-ink-3 transition-colors hover:text-ink"
            >
              {t.site && <PlatformMark site={t.site} size={18} />}
              {t.label}
            </span>
          ))}
        </Ticker>
      </VelocityMarquee>
    </div>
  );
}

// ---------------------------------------------------------------- how it works

function SectionHead({
  eyebrow,
  title,
  soft,
  children,
  id,
  center,
  dot = "var(--signal)",
}: {
  eyebrow: string;
  title: ReactNode;
  soft?: ReactNode;
  children?: ReactNode;
  id: string;
  center?: boolean;
  dot?: string;
}) {
  return (
    <div
      className={cn(
        "mb-10 flex flex-col gap-4 sm:mb-12",
        center ? "items-center text-center" : "items-start",
      )}
    >
      <span className="flex items-center gap-2 label-mono">
        <span
          className="size-1.5 rounded-full"
          style={{
            background: dot,
            boxShadow: `0 0 0 3px color-mix(in srgb, ${dot} 18%, transparent)`,
          }}
        />
        {eyebrow}
      </span>
      <h2
        id={id}
        className="max-w-[20ch] text-[clamp(32px,4.6vw,56px)] leading-[1] font-[630] tracking-[-0.045em] text-balance"
      >
        {title} {soft && <span className="text-ink-3">{soft}</span>}
      </h2>
      {children && (
        <p className="max-w-[56ch] text-[15.5px] leading-relaxed text-ink-2">{children}</p>
      )}
    </div>
  );
}

const STEP =
  "surface-card flex flex-col gap-4 rounded-lg p-[22px] transition-[transform,border-color] duration-[var(--dur-base)] hover:-translate-y-1 hover:border-line-2";
const STAGE =
  "relative h-[124px] overflow-hidden rounded-[12px] bg-surface-2 shadow-[inset_0_0_0_1px_var(--line)]";

function HowItWorks() {
  return (
    <section id="how" aria-labelledby="how-title" className={cn(WRAP, "scroll-mt-24 pt-28")}>
      <SectionHead
        id="how-title"
        eyebrow="How it works"
        title="Open a problem."
        soft="The rest happens on its own."
      />
      <Reveal stagger>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <li className={STEP}>
            <span className="font-mono text-12 text-ink-3">01</span>
            <PlayOnView className={cn(STAGE, "grid place-items-center")}>
              <span className="demo-t flex h-9 items-center gap-2 rounded-full bg-primary-soft px-3.5 text-13 font-[600] text-primary armed:translate-y-3 armed:opacity-0">
                <span className="size-2 animate-pulse rounded-full bg-primary" />
                <LiveTimer startSeconds={760} className="font-mono" /> · Koko Eating Bananas
              </span>
            </PlayOnView>
            <h3 className="text-17 font-[620] tracking-[-0.02em]">A timer that runs itself</h3>
            <p className="text-14 text-ink-2">
              The extension starts the clock when you open a problem. Nothing to press.
            </p>
          </li>
          <li className={STEP}>
            <span className="font-mono text-12 text-ink-3">02</span>
            <PlayOnView className={cn(STAGE, "flex items-center gap-2.5 px-4")}>
              <span className="demo-t h-2.5 flex-[3] origin-left rounded-full bg-signal armed:scale-x-0" />
              <span
                className="demo-t h-2.5 flex-1 origin-left rounded-full bg-[repeating-linear-gradient(135deg,var(--surface-4)_0_3px,var(--line-3)_3px_5px)] armed:scale-x-0"
                style={{ transitionDelay: "450ms" }}
              />
              <span
                className="demo-t h-2.5 flex-[4] origin-left rounded-full bg-signal armed:scale-x-0"
                style={{ transitionDelay: "800ms" }}
              />
            </PlayOnView>
            <h3 className="text-17 font-[620] tracking-[-0.02em]">Switch tabs, it pauses</h3>
            <p className="text-14 text-ink-2">
              Instagram doesn&apos;t count as study time. Striver&apos;s channel does.
            </p>
          </li>
          <li className={STEP}>
            <span className="font-mono text-12 text-ink-3">03</span>
            <PlayOnView className={cn(STAGE, "flex flex-col items-center justify-center gap-2.5")}>
              <span className="demo-t rounded-full bg-signal/15 px-3 py-1 text-13 font-[600] text-signal-text armed:scale-50 armed:opacity-0">
                Accepted
              </span>
              <span
                className="demo-t flex gap-1 rounded-[10px] bg-surface p-1 text-12 armed:translate-y-2 armed:opacity-0"
                style={{ transitionDelay: "350ms" }}
              >
                <span className="rounded-[7px] bg-surface-4 px-2.5 py-1 font-[600]">Solo</span>
                <span className="px-2.5 py-1 text-ink-3">Hint</span>
                <span className="px-2.5 py-1 text-ink-3">Saw solution</span>
              </span>
            </PlayOnView>
            <h3 className="text-17 font-[620] tracking-[-0.02em]">Solo, hint, or solution?</h3>
            <p className="text-14 text-ink-2">
              One honest tap after every accepted. Your solved count means something.
            </p>
          </li>
          <li className={STEP}>
            <span className="font-mono text-12 text-ink-3">04</span>
            <PlayOnView className={cn(STAGE, "flex items-end gap-1.5 px-5 pb-6")}>
              {[30, 44, 58, 72, 86, 100].map((h, i) => (
                <span
                  key={h}
                  className="demo-t flex-1 origin-bottom rounded-[5px_5px_2px_2px] armed:scale-y-0"
                  style={{
                    height: `${h}%`,
                    background: i < 3 ? "var(--signal)" : "var(--surface-4)",
                    transitionDelay: `${i * 110}ms`,
                  }}
                />
              ))}
            </PlayOnView>
            <h3 className="text-17 font-[620] tracking-[-0.02em]">Back right before you forget</h3>
            <p className="text-14 text-ink-2">
              Solved problems climb a revision ladder: 1, 3, 7, 16, 35, 90 days.
            </p>
          </li>
        </ol>
      </Reveal>
    </section>
  );
}

// ---------------------------------------------------------------- sheets

const SHEETS = [
  { slug: "striver-a2z", name: "Striver A2Z DSA", by: "takeUforward", n: 495, done: 49 },
  { slug: "striver-sde", name: "Striver SDE Sheet", by: "takeUforward", n: 156, done: 18 },
  { slug: "neetcode-150", name: "NeetCode 150", by: "NeetCode", n: 150, done: 21 },
  { slug: "blind-75", name: "Blind 75", by: "NeetCode", n: 75, done: 14 },
  { slug: "grind-75", name: "Grind 75", by: "Yangshun Tay", n: 75, done: 16 },
];

function Sheets() {
  return (
    <section id="sheets" aria-labelledby="sheets-title" className="scroll-mt-24 pt-28">
      <div className={WRAP}>
        <SectionHead id="sheets-title" eyebrow="Sheets" title="Your sheets," soft="ticked for you.">
          Solve on LeetCode or GFG and every sheet that has the problem ticks itself. Each problem
          keeps its video at the right minute, plus notes, stars and revision badges. We only link:
          the videos and articles stay with their creators.
        </SectionHead>
      </div>
      {/* The shelf drifts sideways under the lamp as you scroll past. */}
      <Drift distance={120} className="relative">
        <Reveal stagger>
          <ul
            aria-label="Supported sheets"
            className={cn(WRAP, "grid grid-cols-2 items-end gap-5 sm:grid-cols-3 lg:grid-cols-5")}
          >
            {SHEETS.map((s, i) => (
              <li key={s.slug} className="group/book flex flex-col gap-3">
                <BookCover
                  slug={s.slug}
                  name={s.name}
                  author={s.by}
                  done={s.done}
                  total={s.n}
                  main={i === 0}
                />
                <span className="flex justify-between px-0.5 text-12 text-ink-3">
                  <span className="truncate">{s.name}</span>
                  <span className="tnum font-mono">{s.n}</span>
                </span>
              </li>
            ))}
          </ul>
        </Reveal>
      </Drift>
      <div className={cn(WRAP, "mt-12")}>
        <SheetDemo />
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- friends

function Friends() {
  const desks = [
    { buddy: "b-scout", t: 8048, s: "Solving", level: 3 as const },
    { buddy: "g-bun", t: 6760, s: "Watching a lecture", level: 2 as const },
    { buddy: "b-cap", t: 2790, s: "On a break", level: "paused" as const },
  ];
  return (
    <section
      id="friends"
      aria-labelledby="friends-title"
      className={cn(WRAP, "scroll-mt-24 pt-28")}
    >
      <div className="grid items-center gap-10 lg:grid-cols-[1.25fr_1fr]">
        <Reveal stagger>
          <div className="grid grid-cols-3 gap-3 rounded-[22px] bg-[radial-gradient(520px_220px_at_50%_0%,rgba(240,136,79,.14),transparent_70%),var(--surface)] p-4 shadow-[inset_0_0_0_1px_var(--line)] sm:p-6">
            {desks.map((d) => (
              <div
                key={d.buddy}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-[16px] px-2 py-4 text-center shadow-[inset_0_0_0_1px_var(--line)]",
                  d.level === "paused"
                    ? "bg-surface-2"
                    : "bg-[radial-gradient(160px_100px_at_50%_0%,color-mix(in_srgb,var(--primary)_16%,transparent),transparent_70%),var(--surface-2)]",
                )}
              >
                <StudyBuddy buddy={d.buddy} level={d.level} size={84} />
                {d.level === "paused" ? (
                  <span className="font-mono text-[20px] font-[550] text-ink-3">paused</span>
                ) : (
                  <LiveTimer startSeconds={d.t} className="font-mono text-[20px] font-[550]" />
                )}
                <span className="text-12 text-ink-3">{d.s}</span>
              </div>
            ))}
          </div>
        </Reveal>
        <div>
          <SectionHead
            id="friends-title"
            eyebrow="Friends"
            title="Study together,"
            soft="from different hostels."
          >
            A live study hall with everyone&apos;s timer and buddy at their desk, a weekly
            leaderboard, and college boards if you opt in.
          </SectionHead>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- colleges

function ForColleges() {
  const batches = [
    ["Graphs", 34],
    ["DP", 22],
    ["Trees", 58],
    ["Arrays", 81],
  ] as const;
  const tone = (v: number) => (v < 25 ? "var(--hard)" : v < 60 ? "var(--medium)" : "var(--easy)");
  return (
    <section id="colleges" className={cn(WRAP, "scroll-mt-24 pt-28")}>
      <div className="surface-card lamp grid items-center gap-8 rounded-[24px] p-6 sm:p-10 lg:grid-cols-2">
        <div className="flex flex-col items-start gap-4">
          <span className="flex items-center gap-2">
            <span className="label-mono">For placement cells</span>
            <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-11 font-[600] text-primary">
              Coming soon
            </span>
          </span>
          <h2 className="text-[clamp(30px,4vw,48px)] leading-[1] font-[630] tracking-[-0.045em]">
            See where your batch <span className="text-ink-3">actually stands.</span>
          </h2>
          <p className="text-[15px] leading-relaxed text-ink-2">
            Topic gaps across a batch, who&apos;s gone quiet before placement season, and readiness
            for the companies that visit your campus. Built from the same honest data students see,
            only for students who opt in.
          </p>
          <a
            href={`mailto:${CONTACT_EMAIL}?subject=DsaKaro%20for%20our%20college`}
            className={buttonClasses({ variant: "secondary" })}
          >
            Pilot it at your college <ButtonArrow />
          </a>
        </div>
        <PlayOnView className="surface-inset rounded-[18px] p-5">
          <span className="mb-4 block label-mono">Batch 2027 · topic mastery (example)</span>
          {batches.map(([t, v], i) => (
            <div key={t} className="mb-3 last:mb-0">
              <div className="mb-1.5 flex justify-between text-[13px]">
                <span>{t}</span>
                <span className="tnum font-mono" style={{ color: tone(v) }}>
                  {v}
                </span>
              </div>
              <div className="relative h-2 overflow-hidden rounded-full bg-surface-3">
                <span
                  className="demo-t absolute inset-y-0 left-0 origin-left rounded-full armed:scale-x-0"
                  style={{ transitionDelay: `${i * 120}ms`, width: `${v}%`, background: tone(v) }}
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
      who: "Students",
      price: "Free",
      sub: "during the beta, and the core stays free",
      f: [
        "LeetCode, Codeforces and GFG sync",
        "Extension timer and verdicts",
        "All five sheets, auto-ticked",
        "Revision queue and topic mastery",
        "Groups, leaderboards, study rooms",
      ],
      cta: "Start free",
      href: "/signup",
      main: true,
    },
    {
      who: "Pro",
      price: "Later",
      sub: "for the extras, never the basics",
      f: ["AI weekly review", "Interview mode", "Deeper analytics", "Unlimited revision cap"],
      cta: "Coming later",
      href: null,
      main: false,
    },
    {
      who: "Colleges",
      price: "Talk to us",
      sub: "free pilot for the first placement cells",
      f: ["Batch dashboards", "Topic gaps by section", "Inactive-student alerts", "CSV export"],
      cta: "Get in touch",
      href: `mailto:${CONTACT_EMAIL}?subject=DsaKaro%20for%20our%20college`,
      main: false,
    },
  ];
  return (
    <section
      id="pricing"
      aria-labelledby="pricing-title"
      className={cn(WRAP, "scroll-mt-24 pt-28")}
    >
      <SectionHead
        id="pricing-title"
        eyebrow="Pricing"
        title="Free for students."
        soft="Really."
        center
      />
      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((p) => (
          <div
            key={p.who}
            className={cn(
              "surface-card flex flex-col gap-5 rounded-lg p-6",
              p.main && "shadow-[inset_0_0_0_1px_var(--signal),var(--e2)]",
            )}
          >
            <span className="label-mono">{p.who}</span>
            <div>
              <p className="num text-[40px]">{p.price}</p>
              <p className="mt-1 text-13 text-ink-3">{p.sub}</p>
            </div>
            <ul className="flex flex-1 flex-col gap-2.5 text-14">
              {p.f.map((f) => (
                <li key={f} className="flex items-start gap-2.5">
                  <Check
                    size={16}
                    aria-hidden="true"
                    className={cn("mt-0.5 shrink-0", p.main ? "text-signal-text" : "text-ink-3")}
                  />
                  {f}
                </li>
              ))}
            </ul>
            {p.href ? (
              <Link
                href={p.href}
                className={buttonClasses({
                  variant: p.main ? "signal" : "secondary",
                  className: "w-full",
                })}
              >
                {p.cta}
              </Link>
            ) : (
              <span
                className={buttonClasses({ variant: "secondary", className: "w-full opacity-60" })}
              >
                {p.cta}
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- faq

const FAQ = [
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
] as const;

function Faq() {
  return (
    <section id="faq" aria-labelledby="faq-title" className={cn(WRAP, "scroll-mt-24 pt-28")}>
      <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
        <SectionHead id="faq-title" eyebrow="FAQ" title="Questions," soft="answered plainly." />
        <div className="flex flex-col">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group border-t border-line py-4 last:border-b">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15.5px] font-[600] [&::-webkit-details-marker]:hidden">
                {q}
                <span
                  aria-hidden="true"
                  className="grid size-7 shrink-0 place-items-center rounded-full border border-line-2 text-ink-3 transition-transform duration-[var(--dur-base)] group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-3 max-w-[60ch] text-14 leading-relaxed text-ink-2">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- footer

function Footer() {
  return (
    <footer className="relative mt-32 overflow-hidden">
      <div className={cn(WRAP, "flex flex-col gap-6 pb-10")}>
        <div className="relative isolate overflow-hidden rounded-[24px] bg-[radial-gradient(700px_320px_at_50%_0%,rgba(240,136,79,.18),transparent_70%),#0b0b0c] px-6 py-16 text-center text-[#eceef2] ring-1 ring-white/10 sm:py-24">
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-[radial-gradient(rgba(255,255,255,.05)_1px,transparent_1.4px)] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_40%,#000,transparent)] bg-[length:22px_22px]"
          />
          <h2 className="mx-auto max-w-[16ch] text-[clamp(36px,5.4vw,72px)] leading-[1] font-[640] tracking-[-0.05em]">
            Stop counting. <span className="text-white/50">Start upsolving.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-[46ch] text-15 text-white/70">
            Free for students. Sign in with Google and your history is here in seconds.
          </p>
          <div className="mt-8 flex justify-center">
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
          <span>Built by students, for students.</span>
          <nav aria-label="Footer" className="flex flex-wrap gap-5">
            <a href="#how" className="hover:text-ink">
              How it works
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
            <a
              href="https://chromewebstore.google.com/detail/dsakaro-leetcode-tracker/mifliocgkeleaehbakobolfjmnfkikce"
              className="hover:text-ink"
            >
              Chrome extension
            </a>
            <Link href="/login" className="hover:text-ink">
              Sign in
            </Link>
          </nav>
        </div>
      </div>
      {/* DSA करो across the full width; its headline bar fills with lime as you reach the end. */}
      <WordmarkFill className="mx-auto mt-6 w-[min(1180px,100%-32px)] pb-10 [mask-image:linear-gradient(180deg,#000_12%,rgba(0,0,0,.45)_42%,rgba(0,0,0,.1)_75%,transparent)] select-none" />
    </footer>
  );
}
