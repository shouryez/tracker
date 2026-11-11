import Link from "next/link";
import { Suspense } from "react";
import { Check } from "lucide-react";
import { LiveDot, Logo, ThemeToggle } from "@upsolve/ui";
import { isSupabaseConfigured } from "@/lib/env";
import { LoginForm } from "./login-form";
import { VariableProximity } from "@/components/fx/variable-proximity";
import { DotField } from "@/components/fx/dot-field";

export type AuthMode = "login" | "signup";

// 34 weeks of made-up activity for the art panel (deterministic, so server and client agree).
const HEAT = Array.from({ length: 34 * 7 }, (_, i) => {
  const r = (Math.abs(Math.sin(i * 3.77) * 9999) % 1) as number;
  const p = 0.25 + (Math.floor(i / 7) / 34) * 0.5;
  return r > p ? 0 : 1 + Math.min(3, Math.floor((r / p) * 4));
});
const HEAT_COLORS = ["#1a1a1d", "#1f3a33", "#2f6355", "#56a08b", "#86d9c2"];

const POINTS: Record<AuthMode, string[]> = {
  login: [
    "LeetCode, Codeforces and GFG in one dashboard",
    "Striver and NeetCode sheets that tick themselves",
    "Revision that brings problems back before you forget",
  ],
  signup: [
    "Free for students, no card, no password",
    "Connect LeetCode, Codeforces or GFG in seconds",
    "Your sheets, revision and streak from day one",
  ],
};

/**
 * Split layout: a lamp-lit panel with a tilted year of practice beside the sign-in card.
 * Both use Google or an emailed link; sign-in won't create an account, sign-up will.
 */
export function AuthPage({ mode }: { mode: AuthMode }) {
  const points = POINTS[mode];
  return (
    <div className="grid min-h-dvh bg-bg lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative m-3 hidden overflow-hidden rounded-[24px] bg-[radial-gradient(700px_500px_at_20%_0%,rgba(240,136,79,.16),transparent_65%),#0b0b0c] text-[#eceef2] ring-1 ring-white/10 lg:flex lg:flex-col">
        {/* A year of practice, one square a day, tilted across the panel. */}
        <div
          aria-hidden="true"
          className="absolute top-1/2 -right-16 left-10 grid -translate-y-1/2 -rotate-[8deg] grid-flow-col grid-rows-7 gap-[5px] opacity-90"
        >
          {HEAT.map((l, i) => (
            <i
              key={i}
              className="aspect-square rounded-[4px]"
              style={{
                background: HEAT_COLORS[l],
                boxShadow: l === 4 ? "0 0 8px rgba(134,217,194,.3)" : undefined,
              }}
            />
          ))}
        </div>
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(180deg,#0b0b0c_8%,transparent_40%,transparent_62%,#0b0b0c_92%)]"
        />
        <div className="relative z-10 p-10">
          <Link href="/" aria-label="DsaKaro home" className="inline-block text-white">
            <Logo />
          </Link>
          <h2 className="mt-16 max-w-[13ch] font-display text-[52px] leading-[.98]">
            Every problem you solve,{" "}
            <span className="relative whitespace-nowrap">
              remembered.
              <span
                aria-hidden="true"
                className="absolute right-[4%] -bottom-[.02em] left-0 h-[.07em] rounded-full bg-[#86d9c2] shadow-[0_0_24px_rgba(134,217,194,.45)]"
              />
            </span>
          </h2>
          <ul className="mt-8 flex flex-col gap-2.5 text-[14px] text-white/80">
            {points.map((t, i) => (
              <li
                key={t}
                className="flex animate-[highlight-cycle_9s_ease-in-out_infinite] items-center gap-2.5 motion-reduce:animate-none"
                style={{ animationDelay: `${i * 3}s` }}
              >
                <span className="grid size-5 place-items-center rounded-full bg-white/10">
                  <Check size={12} aria-hidden="true" />
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative z-10 mt-auto flex items-center gap-2 p-10 text-13 text-white/55">
          <LiveDot /> Free for students
        </div>
      </aside>

      <div className="relative grid place-items-center overflow-hidden px-4 py-16">
        <DotField className="pointer-events-none absolute inset-0 hidden lg:block" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden lg:hidden"
        >
          <i className="absolute top-[-10%] left-1/2 h-[480px] w-[560px] -translate-x-1/2 scale-150 animate-drift-a bg-[radial-gradient(closest-side,var(--glow-a),transparent)] opacity-60" />
        </div>
        <div className="absolute top-5 right-5">
          <ThemeToggle />
        </div>

        <main id="main" className="relative w-full max-w-[400px] animate-page">
          <Link href="/" aria-label="DsaKaro home" className="mb-10 inline-block lg:hidden">
            <Logo />
          </Link>
          <h1 className="mb-2 font-display text-[44px] leading-none [&_em]:text-ink-3 [&_em]:not-italic">
            {mode === "login" ? (
              <>
                <VariableProximity text="Welcome back." /> <em>Chalo,&nbsp;DSA&nbsp;karo.</em>
              </>
            ) : (
              <>
                Start free. <em>Chalo,&nbsp;DSA&nbsp;karo.</em>
              </>
            )}
          </h1>
          <p className="mb-8 text-ink-2">
            {mode === "login"
              ? "Sign in to sync your platforms and track every session."
              : "Create your account in one step. No password to remember."}
          </p>

          {!isSupabaseConfigured && (
            <p className="mb-6 rounded-[16px] border border-dashed border-line-2 p-3.5 font-mono text-xs leading-relaxed text-ink-2">
              Demo mode: sign-in is off until Supabase is configured. Copy{" "}
              <code className="text-ink">apps/web/.env.example</code> to{" "}
              <code className="text-ink">.env.local</code> and fill it in (see README).
            </p>
          )}

          <div className="surface-card relative overflow-hidden rounded-[24px] p-6 shadow-e3">
            <Suspense>
              <LoginForm mode={mode} disabled={!isSupabaseConfigured} />
            </Suspense>
          </div>

          <p className="mt-6 text-sm text-ink-2">
            {mode === "login" ? (
              <>
                New to DsaKaro?{" "}
                <Link
                  href="/signup"
                  className="font-[600] text-ink underline-offset-4 hover:underline"
                >
                  Create an account
                </Link>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="font-[600] text-ink underline-offset-4 hover:underline"
                >
                  Sign in
                </Link>
              </>
            )}
          </p>
          <p className="mt-3 text-xs text-ink-3">
            We only ask for what we need. Your platform passwords never touch our servers.
          </p>
        </main>
      </div>
    </div>
  );
}
