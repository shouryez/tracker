import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Check } from "lucide-react";
import { LiveDot, Logo, ThemeToggle } from "@upsolve/ui";
import { isSupabaseConfigured } from "@/lib/env";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

/** Split layout: a dark brand panel (orb + starfield) beside the sign-in card. */
export default function LoginPage() {
  return (
    <div className="grid min-h-dvh bg-bg lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative m-3 hidden overflow-hidden rounded-[28px] bg-[#08080d] text-[#f4f4f6] ring-1 ring-white/10 lg:flex lg:flex-col">
        <div aria-hidden="true" className="starfield absolute inset-0 opacity-70" />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_10%_0%,rgba(110,123,255,.3),transparent_70%)]"
        />
        <div aria-hidden="true" className="absolute -bottom-[38%] left-1/2 -translate-x-1/2">
          <div className="orb size-[520px] animate-[blob_14s_var(--ease-in-out)_infinite_alternate]" />
        </div>
        <div className="relative z-10 p-10">
          <Link href="/" aria-label="Upsolve home" className="inline-block text-white">
            <Logo />
          </Link>
          <h2 className="mt-16 max-w-[13ch] font-display text-[56px] leading-[.98] tracking-[-0.02em]">
            <span className="text-white/45">Every problem you solve,</span> <em>remembered.</em>
          </h2>
          <ul className="mt-8 flex flex-col gap-2.5 text-[14px] text-white/70">
            {[
              "LeetCode, Codeforces and GFG in one dashboard",
              "Striver and NeetCode sheets that tick themselves",
              "Revision that brings problems back before you forget",
            ].map((t) => (
              <li key={t} className="flex items-center gap-2.5">
                <span className="grid size-5 place-items-center rounded-full bg-white/10">
                  <Check size={12} aria-hidden="true" />
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative z-10 mt-auto flex items-center gap-2 p-10 font-mono text-[11px] tracking-[.08em] text-white/50 uppercase">
          <LiveDot /> Free for students
        </div>
      </aside>

      <div className="relative grid place-items-center px-4 py-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden lg:hidden"
        >
          <i className="absolute top-[-10%] left-1/2 h-[480px] w-[560px] -translate-x-1/2 animate-drift-a rounded-full bg-[var(--glow-a)] opacity-60 blur-[110px]" />
        </div>
        <div className="absolute top-5 right-5">
          <ThemeToggle />
        </div>

        <main id="main" className="relative w-full max-w-[400px] animate-page">
          <Link href="/" aria-label="Upsolve home" className="mb-10 inline-block lg:hidden">
            <Logo />
          </Link>
          <h1 className="mb-2 font-display text-[44px] leading-none tracking-[-0.02em]">
            <span className="text-ink-3">Welcome back.</span> <em>Let&apos;s upsolve.</em>
          </h1>
          <p className="mb-8 text-ink-2">Sign in to sync your platforms and track every session.</p>

          {!isSupabaseConfigured && (
            <p className="mb-6 rounded-md border border-dashed border-line-2 bg-surface-2 p-3.5 font-mono text-xs leading-relaxed text-ink-2">
              Demo mode: sign-in is off until Supabase is configured. Copy{" "}
              <code className="text-ink">apps/web/.env.example</code> to{" "}
              <code className="text-ink">.env.local</code> and fill it in (see README).
            </p>
          )}

          <div className="rounded-[22px] border border-line bg-surface p-5 shadow-md">
            <Suspense>
              <LoginForm disabled={!isSupabaseConfigured} />
            </Suspense>
          </div>

          <p className="mt-6 text-xs text-ink-3">
            We only ask for what we need. Your platform passwords never touch our servers.
          </p>
        </main>
      </div>
    </div>
  );
}
