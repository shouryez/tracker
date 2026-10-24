import Link from "next/link";
import { ButtonArrow, Eyebrow, Logo, ThemeToggle, buttonClasses } from "@upsolve/ui";

// Placeholder landing page. The full marketing site is Phase 6 (DESIGN.md §9.1).
export default function Home() {
  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 -top-40 h-[900px]">
        <i className="absolute top-[4%] left-[52%] h-[520px] w-[620px] animate-drift-a rounded-full bg-[var(--glow-a)] blur-[90px]" />
        <i className="absolute top-[14%] left-[66%] h-[420px] w-[460px] animate-drift-b rounded-full bg-[var(--glow-b)] blur-[90px]" />
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-50 [background-image:linear-gradient(var(--line)_1px,transparent_1px),linear-gradient(90deg,var(--line)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_20%,#000_30%,transparent_75%)]"
      />

      <header className="relative mx-auto flex h-[72px] w-[min(1120px,100%-32px)] items-center justify-between">
        <Link href="/" aria-label="Upsolve home">
          <Logo />
        </Link>
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <Link href="/login" className={buttonClasses({ variant: "primary", size: "sm" })}>
            Sign in
          </Link>
        </div>
      </header>

      <main className="relative mx-auto flex w-[min(1200px,100%-32px)] flex-col items-center pt-24 pb-32 text-center">
        <Eyebrow live>Tracking 8 platforms · Free for students</Eyebrow>
        <h1 className="mt-[22px] mb-[18px] max-w-[13ch] font-display text-[clamp(46px,8.2vw,104px)] leading-[.98] tracking-[-0.02em] text-balance">
          <span className="text-ink-3">Every problem you solve,</span> <em>remembered.</em>
        </h1>
        <p className="mb-7 max-w-[560px] text-[clamp(15px,1.6vw,17.5px)] text-ink-2">
          Upsolve times every problem you open, catches every verdict, and turns your LeetCode,
          Codeforces and GFG history into one dashboard that tells you what to revise next.
        </p>
        <div className="flex flex-wrap justify-center gap-2.5">
          <Link href="/login" className={buttonClasses({ variant: "signal" })}>
            Get started — it&apos;s free <ButtonArrow />
          </Link>
          <Link href="/dashboard" className={buttonClasses({ variant: "secondary" })}>
            See the dashboard
          </Link>
        </div>
        <p className="mt-[18px] font-mono text-xs tracking-[.02em] text-ink-3">
          Works with Striver A2Z · NeetCode 150 · Blind 75 · Love Babbar 450
        </p>
      </main>
    </div>
  );
}
