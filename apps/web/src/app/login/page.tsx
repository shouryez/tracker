import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Logo, ThemeToggle } from "@upsolve/ui";
import { isSupabaseConfigured } from "@/lib/env";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="relative grid min-h-dvh place-items-center px-4 py-16">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <i className="absolute top-[-10%] left-1/2 h-[480px] w-[560px] -translate-x-1/2 animate-drift-a rounded-full bg-[var(--glow-a)] opacity-60 blur-[110px]" />
      </div>
      <div className="absolute top-5 right-5">
        <ThemeToggle />
      </div>

      <main className="relative w-full max-w-[400px]">
        <Link href="/" aria-label="Upsolve home" className="mb-10 inline-block">
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

        <Suspense>
          <LoginForm disabled={!isSupabaseConfigured} />
        </Suspense>

        <p className="mt-8 text-xs text-ink-3">
          We only ask for what we need. Your platform passwords never touch our servers.
        </p>
      </main>
    </div>
  );
}
