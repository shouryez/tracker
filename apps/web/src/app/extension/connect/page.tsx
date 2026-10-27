import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { DotGrid, GlowOrb, Logo, ThemeToggle } from "@upsolve/ui";
import { getCurrentUser } from "@/lib/auth";
import { ConnectExtension } from "./connect-extension";

export const metadata: Metadata = { title: "Connect the extension" };

export default function ConnectExtensionPage() {
  return (
    <div className="relative min-h-dvh overflow-hidden">
      <DotGrid className="opacity-60" />
      <GlowOrb className="top-[-18%] left-[50%] -translate-x-1/2 opacity-35" size={620} />
      <header className="relative mx-auto flex h-[72px] w-[min(640px,100%-32px)] items-center justify-between">
        <Link href="/dashboard" aria-label="Upsolve dashboard">
          <Logo />
        </Link>
        <ThemeToggle />
      </header>
      <main className="relative mx-auto w-[min(640px,100%-32px)] pt-10 pb-24">
        <h1 className="mb-3 font-display text-[clamp(36px,6vw,52px)] leading-none tracking-[-0.02em]">
          One click. <em className="text-violet">Then just solve.</em>
        </h1>
        <p className="mb-8 max-w-[52ch] text-ink-2">
          Connecting lets the extension send your timed sessions and verdicts to your dashboard. It
          only ever talks to LeetCode and Upsolve.
        </p>
        <Suspense fallback={<div className="h-40 skeleton rounded-lg" />}>
          <Gate />
        </Suspense>
      </main>
    </div>
  );
}

async function Gate() {
  await getCurrentUser(); // redirects to /login when signed out
  return <ConnectExtension />;
}
