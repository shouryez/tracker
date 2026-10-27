import Link from "next/link";
import type { ReactNode } from "react";
import {
  Check,
  Flame,
  LayoutDashboard,
  Lock,
  Puzzle,
  Timer,
  Trophy,
  UsersRound,
} from "lucide-react";
import {
  Aurora,
  ButtonArrow,
  DifficultyTag,
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
import { AnimatedBeam, Marquee as Ticker, Meteors } from "@/components/fx/decor";
import { CursorGlow, TiltCard } from "@/components/fx/pointer";
import { TextReveal } from "@/components/fx/text";
import { LandingNavLinks, SheetDemo, SmoothScroll } from "@/components/landing/landing-fx";
import { LiveTimer } from "@/components/landing/live-timer";
import {
  BackToTop,
  Magnetic,
  Parallax,
  Reveal,
  ScrollProgress,
} from "@/components/landing/motion-bits";
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
      <Hero />
      <Marquee />
      <DashboardPreview />
      <Reveal>
        <Features />
      </Reveal>
      <Reveal>
        <HowItWorks />
      </Reveal>
      <Reveal>
        <SheetShowcase />
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
      <Footer />
      <BackToTop />
      <SpotlightTracker />
      <SmoothScroll />
    </div>
  );
}

// ---------------------------------------------------------------- nav

function Nav() {
  return (
    <div className="sticky top-3 z-50 px-4">
      <nav
        aria-label="Main"
        className="glass mx-auto flex h-[56px] w-[min(1100px,100%)] items-center justify-between gap-3 rounded-full border border-line-2 pr-2 pl-5 shadow-e3"
      >
        <Link href="/" aria-label="Upsolve home">
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
            <Link href="/login" className={buttonClasses({ variant: "signal", size: "sm" })}>
              Get started
            </Link>
          </span>
        </div>
      </nav>
    </div>
  );
}

// ---------------------------------------------------------------- hero

function Hero() {
  return (
    // The stage stays dark in both themes, like a lit product shot.
    <header className="relative -mt-[68px] px-3 pt-[80px] sm:px-4">
      <Parallax className="relative mx-auto w-[min(1280px,100%)] overflow-hidden rounded-[28px] bg-[#08080d] text-[#f4f4f6] shadow-xl ring-1 ring-white/10 sm:rounded-[36px]">
        {/* Starfield + soft colour wash. */}
        <div
          aria-hidden="true"
          className="starfield pointer-events-none absolute inset-0 opacity-70"
        />
        <Aurora className="opacity-70" />
        <Meteors count={5} />
        <CursorGlow />

        <div className="relative z-10 flex flex-col items-center px-5 pt-16 text-center sm:pt-24">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-3 py-1.5 font-mono text-[11px] tracking-[.08em] text-white/75 uppercase backdrop-blur">
            <LiveDot /> LeetCode · Codeforces · GFG · free for students
          </span>
          <TextReveal
            text="Every problem you solve,"
            accent="remembered."
            className="mt-6 mb-5 max-w-[14ch] font-display text-[clamp(44px,8vw,100px)] leading-[.98] tracking-[-0.02em] text-balance text-white"
            accentClassName="bg-[linear-gradient(100deg,#fff_20%,#d7ff3a_110%)] bg-clip-text text-transparent"
          />
          <p className="mb-8 max-w-[560px] text-[clamp(15px,1.6vw,17px)] leading-relaxed text-white/75">
            Upsolve times every problem you open, catches every verdict, ticks your Striver and
            NeetCode sheets for you, and tells you exactly what to revise before you forget it.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Magnetic>
              <Link href="/login" className={buttonClasses({ variant: "signal", size: "lg" })}>
                <span data-magnetic-label className="inline-flex items-center gap-2">
                  Start free with Google <ButtonArrow />
                </span>
              </Link>
            </Magnetic>
            <a
              href="#how"
              className="inline-flex h-[50px] items-center rounded-full border border-white/15 bg-white/5 px-6 text-[15px] font-[550] text-white backdrop-blur transition-[background-color,border-color,transform] duration-[var(--dur-base)] hover:-translate-y-px hover:border-white/30 hover:bg-white/10 active:scale-[.97]"
            >
              See how it works
            </a>
          </div>
          <Ticker speed={30} className="mt-6 w-[min(520px,90vw)]">
            {["Striver A2Z", "Striver SDE", "NeetCode 150", "Blind 75", "Grind 75"].map((t) => (
              <span key={t} className="font-mono text-12 whitespace-nowrap text-white/55">
                {t}
              </span>
            ))}
          </Ticker>
        </div>

        {/* The scene: a glossy orb rising from the bottom, glass cards floating around it. */}
        <div className="relative mt-10 h-[340px] sm:mt-14 sm:h-[420px]" aria-hidden="true">
          <div data-depth="14" className="absolute bottom-[-46%] left-1/2 -translate-x-1/2">
            <div className="orb size-[min(560px,92vw)] animate-[blob_14s_var(--ease-in-out)_infinite_alternate] motion-reduce:animate-none" />
          </div>
          <div
            data-depth="34"
            className="absolute top-[8%] left-[4%] hidden md:block lg:left-[10%]"
          >
            <TiltCard className="rounded-[18px]">
              <GlassCard className="animate-float">
                <span className="flex items-center justify-between gap-6 text-[12px] text-white/55">
                  Striver A2Z <ArrowCircle />
                </span>
                <span className="mt-2 block text-[15px] leading-snug font-medium">
                  495 problems,
                  <br /> ticked for you
                </span>
                <span className="mt-3 block h-1 overflow-hidden rounded-full bg-white/10">
                  <span className="block h-full w-[43%] origin-left animate-[fill-loop_6s_var(--ease-out)_infinite] rounded-full bg-signal shadow-[0_0_8px_var(--signal)]" />
                </span>
              </GlassCard>
            </TiltCard>
          </div>
          <div
            data-depth="26"
            className="absolute top-[34%] right-[4%] hidden sm:block lg:right-[12%]"
          >
            <TiltCard className="rounded-[18px]">
              <GlassCard className="animate-float [animation-delay:-3s]">
                <span className="flex items-center justify-between gap-6 text-[12px] text-white/55">
                  Revision ladder <ArrowCircle />
                </span>
                <span className="num mt-2 block text-[30px]">90 days</span>
                <span className="mt-2 flex items-end gap-1">
                  {[1, 3, 7, 16, 35, 90].map((d, i) => (
                    <span key={d} className="flex flex-col items-center gap-1">
                      <i
                        className="block w-3 animate-[ladder-step_6s_ease-in-out_infinite] rounded-[3px] bg-white/15"
                        style={{ height: 8 + i * 3, animationDelay: `${i * 0.5}s` }}
                      />
                      <span className="font-mono text-[9px] text-white/45">{d}</span>
                    </span>
                  ))}
                </span>
              </GlassCard>
            </TiltCard>
          </div>
          <div data-depth="40" className="absolute bottom-[12%] left-[14%] hidden lg:block">
            <TiltCard className="rounded-[18px]">
              <GlassCard className="animate-float [animation-delay:-5s]">
                <span className="flex items-center gap-2 text-[12px] text-white/55">
                  <LiveDot /> Now solving
                </span>
                <span className="mt-1.5 block text-[14px] font-medium">
                  875. Koko Eating Bananas
                </span>
                <LiveTimer
                  startSeconds={18 * 60 + 42}
                  className="num mt-1 block font-mono text-[26px]"
                />
              </GlassCard>
            </TiltCard>
          </div>
        </div>
      </Parallax>
    </header>
  );
}

function GlassCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "w-[236px] rounded-[18px] border border-white/12 bg-white/[.06] p-4 text-left text-white shadow-[0_30px_60px_-20px_rgba(0,0,0,.7)] backdrop-blur-xl",
        className,
      )}
    >
      {children}
    </div>
  );
}

function ArrowCircle() {
  return (
    <span className="grid size-6 place-items-center rounded-full bg-white text-[#08080d]">
      <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M5 11 11 5M6 5h5v5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

/** The real dashboard, as a frame (example numbers, labelled). */
function DashboardPreview() {
  return (
    <section className={cn(WRAP, "pt-24")}>
      <Reveal>
        <SectionHead eyebrow="The dashboard" soft="Your prep," em="at a glance.">
          Everything on one screen: what you solved, what you&apos;re about to forget, and what to
          do next. The numbers below are an example.
        </SectionHead>
      </Reveal>
      <Reveal>
        <ProductFrame />
      </Reveal>
    </section>
  );
}

function ProductFrame() {
  return (
    <div className="relative mx-auto w-full max-w-[1040px]">
      <div
        aria-hidden="true"
        className="absolute -inset-x-10 -top-10 bottom-0 rounded-[40px] bg-[radial-gradient(ellipse_at_top,var(--glow-a),transparent_70%)] opacity-60 blur-2xl"
      />
      <div className="relative overflow-hidden rounded-[28px] border border-line bg-surface text-left shadow-frame">
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <i className="size-2.5 rounded-full bg-line-2" />
          <i className="size-2.5 rounded-full bg-line-2" />
          <i className="size-2.5 rounded-full bg-line-2" />
          <span className="mx-auto rounded-full bg-surface-2 px-4 py-1 font-mono text-[11px] text-ink-3">
            upsolve · your dashboard
          </span>
          <span className="font-mono text-[10px] tracking-[.08em] text-ink-3 uppercase">
            example
          </span>
        </div>
        <div className="grid gap-3 bg-bg-2 p-3 sm:grid-cols-12 sm:p-4">
          <MiniKpi
            className="sm:col-span-4"
            label="Solved · all platforms"
            value="412"
            unit="problems"
            feature
          />
          <MiniKpi
            className="sm:col-span-4"
            label="Streak"
            value="47"
            unit="days"
            icon={<Flame size={13} className="text-ember" />}
          />
          <MiniKpi className="sm:col-span-4" label="Due for revision" value="5" unit="today" />
          <div className="rounded-[18px] border border-line bg-surface p-4 sm:col-span-8">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[13px] font-[550]">Activity</span>
              <span className="font-mono text-[10.5px] text-ink-3">
                last 26 weeks · all platforms
              </span>
            </div>
            <PixelHeatmap
              levels={demoLevels(26 * 7, 7)}
              weeks={26}
              label="Example activity heatmap"
            />
          </div>
          <div className="flex flex-col justify-between gap-3 rounded-[18px] border border-line bg-surface p-4 sm:col-span-4">
            <span className="flex items-center gap-2 font-mono text-[10.5px] tracking-[.08em] text-ink-3 uppercase">
              <LiveDot /> Now solving · LeetCode
            </span>
            <span className="text-[14px] font-[550]">875. Koko Eating Bananas</span>
            <span>
              <DifficultyTag difficulty="medium" />
            </span>
            <LiveTimer
              startSeconds={18 * 60 + 42}
              className="num font-mono text-[44px] leading-none tracking-[-0.05em]"
            />
            <span className="font-mono text-[11px] text-ink-3">auto-paused 2× · 3 submits</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniKpi({
  label,
  value,
  unit,
  icon,
  feature,
  className,
}: {
  label: string;
  value: string;
  unit: string;
  icon?: ReactNode;
  feature?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[18px] border p-4",
        feature
          ? "border-transparent bg-[linear-gradient(155deg,color-mix(in_srgb,var(--primary)_92%,#000),var(--primary-2))] text-white"
          : "border-line bg-surface",
        className,
      )}
    >
      <span
        className={cn(
          "flex items-center gap-1.5 font-mono text-[10.5px] tracking-[.08em] uppercase",
          feature ? "text-white/70" : "text-ink-3",
        )}
      >
        {label} {icon}
      </span>
      <span className="num mt-2 block text-[34px]">
        {value}
        <small
          className={cn("ml-1 text-[.42em] font-normal", feature ? "text-white/60" : "text-ink-3")}
        >
          {unit}
        </small>
      </span>
    </div>
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
    <div aria-label="Supported platforms and sheets" className="mt-20 border-y border-line py-5">
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
        <span className="text-ink">{soft}</span>{" "}
        <em className="bg-[linear-gradient(100deg,var(--ink)_10%,var(--violet)_120%)] bg-clip-text text-transparent">
          {em}
        </em>
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
      <div className="flex-1">{visual}</div>
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
                  <span className="size-2 rounded-full bg-bad" />{" "}
                  leetcode.com/problems/koko-eating-bananas
                </div>
                <div className="p-4">
                  <span className="font-mono text-[10.5px] tracking-[.08em] text-ink-3 uppercase">
                    Session · auto-started
                  </span>
                  <LiveTimer
                    startSeconds={18 * 60 + 42}
                    className="num mt-1 block font-mono text-[46px] leading-none tracking-[-0.05em]"
                  />
                  <div className="mt-3 flex gap-1.5">
                    <Tag tone="wa" mono>
                      WA
                    </Tag>
                    <Tag tone="tle" mono>
                      TLE
                    </Tag>
                    <Tag tone="ac" mono>
                      AC
                    </Tag>
                  </div>
                </div>
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
                <i className="rounded-[3px] bg-ink" style={{ flex: 281 }} />
                <i className="rounded-[3px] bg-ink-3" style={{ flex: 86 }} />
                <i className="rounded-[3px] bg-violet/60" style={{ flex: 45 }} />
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
              {[
                ["Course Schedule II", "2d overdue", "wa"],
                ["Coin Change", "today", "neutral"],
                ["Longest Substring Without Repeating", "today", "neutral"],
              ].map(([t, due, tone]) => (
                <div
                  key={t}
                  className="flex items-center justify-between gap-2 rounded-[10px] border border-line bg-bg-2 px-3 py-2"
                >
                  <b className="truncate text-[13px] font-medium">{t}</b>
                  <Tag tone={tone as "wa" | "neutral"} mono>
                    {due}
                  </Tag>
                </div>
              ))}
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
              <span className="font-mono text-[10.5px] tracking-[.08em] text-ink-3 uppercase">
                Sheets · auto-ticked
              </span>
              {[
                ["Striver A2Z", 212, 495],
                ["NeetCode 150", 98, 150],
              ].map(([name, done, total]) => (
                <div key={name}>
                  <div className="mb-1.5 flex justify-between text-[13px]">
                    <b className="font-medium">{name}</b>
                    <span className="font-mono text-ink-3">
                      {done}/{total}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-3">
                    <div
                      className="h-full rounded-full bg-ink"
                      style={{ width: `${(Number(done) / Number(total)) * 100}%` }}
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
          className="lg:col-span-2"
          title="Practise with your friends"
          visual={
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[14px] border border-line bg-bg-2 p-3">
                <span className="mb-2 flex items-center gap-2 font-mono text-[10.5px] tracking-[.08em] text-ink-3 uppercase">
                  <Trophy size={12} /> This week
                </span>
                {[
                  ["Asha", 118, true],
                  ["You", 104, false],
                  ["Rohan", 87, false],
                ].map(([n, s, first], i) => (
                  <div
                    key={String(n)}
                    className="flex items-center gap-2.5 border-t border-dashed border-line-2 py-2 first:border-t-0"
                  >
                    <span
                      className={cn(
                        "num grid size-6 place-items-center rounded-[6px] text-[13px]",
                        first ? "bg-signal text-signal-ink" : "text-ink-3",
                      )}
                    >
                      {i + 1}
                    </span>
                    <span className="flex-1 text-[13px]">{n}</span>
                    <span className="num text-[15px]">{s}</span>
                  </div>
                ))}
              </div>
              <div className="rounded-[14px] border border-line bg-bg-2 p-3">
                <span className="mb-2 flex items-center gap-2 font-mono text-[10.5px] tracking-[.08em] text-ink-3 uppercase">
                  <LiveDot /> Study room
                </span>
                {[
                  ["Asha", "Word Ladder", "24:10"],
                  ["Rohan", "Rotting Oranges", "08:55"],
                ].map(([n, p, t]) => (
                  <div
                    key={n}
                    className="border-t border-dashed border-line-2 py-2 first:border-t-0"
                  >
                    <span className="block text-[13px] font-medium">{n}</span>
                    <span className="flex justify-between text-[12px] text-ink-2">
                      {p} <span className="font-mono">{t}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          }
        >
          Friend groups with a weekly leaderboard that rewards showing up, not one-night grinds, and
          a study room that shows who&apos;s solving what right now. College and batch boards are
          opt-in.
        </Bento>

        <Bento
          title="Contests, then upsolve"
          visual={
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
                <Tag tone="signal" mono>
                  <Check size={10} /> Q3
                </Tag>
                <Tag mono>Q4</Tag>
              </div>
              <span className="num mt-2 text-[28px] text-ok">+38</span>
              <span className="font-mono text-[11px] text-ink-3">1 left to upsolve</span>
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
            { id: "up", label: "Upsolve", icon: <LogoMark size={22} />, x: 66, y: 50 },
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
      <ol className="grid gap-3.5 md:grid-cols-3">
        {steps.map((s, i) => (
          <li
            key={s.title}
            data-spotlight
            className={cn(cardClasses({ interactive: true, spotlight: true }), "p-[22px]")}
          >
            <div className="mb-8 flex items-center justify-between">
              <span className="grid size-10 place-items-center rounded-[12px] border border-line bg-surface-2 text-ink-2">
                {s.icon}
              </span>
              <span className="tnum font-mono text-[40px] leading-none font-[600] text-ink-4">
                {String(i + 1).padStart(2, "0")}
              </span>
            </div>
            <h3 className="text-[17px] font-semibold tracking-[-0.02em]">{s.title}</h3>
            <p className="mt-1.5 text-[14px] leading-relaxed text-ink-2">{s.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

// ---------------------------------------------------------------- sheet showcase

function SheetShowcase() {
  return (
    <section className={cn(WRAP, "pt-28")}>
      <SectionHead eyebrow="Sheets" soft="Striver's sheet," em="with superpowers.">
        Every problem with its video (playing right inside the sheet, at the right minute), the
        article, and a button for LeetCode, GFG or takeUforward. Notes, stars and revision badges on
        every row. We only link: the videos and articles stay with their creators.
      </SectionHead>
      <SheetDemo />
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
            href="mailto:shouryapratap6081@gmail.com?subject=Upsolve%20for%20our%20college"
            className={buttonClasses({ variant: "secondary" })}
          >
            Pilot it at your college <ButtonArrow />
          </a>
        </div>
        <div className="surface-inset rounded-[20px] p-5">
          <span className="mb-4 block label-mono">Batch 2027 · topic mastery (example)</span>
          {batches.map(([t, v]) => (
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
                  className="absolute inset-y-0 left-0 origin-left animate-[grow-x_1100ms_var(--ease-out)_backwards] rounded-full"
                  style={{
                    width: `${v}%`,
                    background: `linear-gradient(90deg, transparent, ${v < 25 ? "var(--hard)" : v < 60 ? "var(--medium)" : "var(--easy)"})`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
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
      cta: { label: "Start free", href: "/login" },
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
        href: "mailto:shouryapratap6081@gmail.com?subject=Upsolve%20for%20our%20college",
      },
      items: ["Batch dashboards", "Topic gaps by section", "Inactive-student alerts", "CSV export"],
    },
  ];
  return (
    <section className={cn(WRAP, "pt-28")}>
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
    <section id="faq" className={cn(WRAP, "scroll-mt-24 pt-28")}>
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
            Stop counting.{" "}
            <em className="bg-[linear-gradient(100deg,#fff_20%,#d7ff3a_110%)] bg-clip-text text-transparent">
              Start upsolving.
            </em>
          </h2>
          <p className="relative mx-auto mt-4 max-w-[46ch] text-15 text-white/70">
            Free for students. Sign in with Google and your history is here in seconds.
          </p>
          <div className="relative mt-8 flex justify-center">
            <Magnetic>
              <Link href="/login" className={buttonClasses({ variant: "signal", size: "lg" })}>
                <span data-magnetic-label className="inline-flex items-center gap-2">
                  Start free with Google <ButtonArrow />
                </span>
              </Link>
            </Magnetic>
          </div>
        </div>
        <div className="mt-6 flex w-full flex-wrap items-center justify-between gap-4 border-t border-line pt-6 text-[13px] text-ink-3">
          <span className="flex items-center gap-2">
            <PixelHeart /> Built by a student, for students.
          </span>
          <nav aria-label="Footer" className="flex flex-wrap gap-5">
            <a href="#features" className="hover:text-ink">
              Features
            </a>
            <a href="#faq" className="hover:text-ink">
              Privacy
            </a>
            <a href="https://github.com/shouryez/upsolve" className="hover:text-ink">
              GitHub
            </a>
            <Link href="/login" className="hover:text-ink">
              Sign in
            </Link>
          </nav>
        </div>
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none -mb-[0.22em] text-center font-[650] leading-none tracking-[-0.06em] text-ink select-none [font-size:clamp(90px,22vw,320px)] [mask-image:linear-gradient(180deg,rgba(0,0,0,.14),transparent_85%)]"
      >
        upsolve
      </div>
    </footer>
  );
}

/** A tiny heart drawn in pixels, like the logo. */
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
