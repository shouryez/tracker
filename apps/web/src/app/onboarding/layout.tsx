import Link from "next/link";
import { DotGrid, GlowOrb, Logo, ThemeToggle } from "@upsolve/ui";

export default function OnboardingLayout({ children }: LayoutProps<"/onboarding">) {
  return (
    <div className="relative min-h-dvh overflow-hidden">
      <DotGrid className="opacity-60" />
      <GlowOrb className="top-[-14%] left-[55%] animate-drift-a opacity-40" size={560} />
      <GlowOrb
        className="bottom-[-20%] left-[-10%] animate-drift-b opacity-25"
        size={480}
        color="var(--aurora-2)"
      />
      <header className="relative mx-auto flex h-[72px] w-[min(1000px,100%-32px)] items-center justify-between">
        <Link href="/" aria-label="Upsolve home">
          <Logo />
        </Link>
        <ThemeToggle />
      </header>
      <main className="relative mx-auto w-[min(1000px,100%-32px)] pt-6 pb-24">{children}</main>
    </div>
  );
}
