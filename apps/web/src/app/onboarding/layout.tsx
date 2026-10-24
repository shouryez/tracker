import Link from "next/link";
import { Logo, ThemeToggle } from "@upsolve/ui";

export default function OnboardingLayout({ children }: LayoutProps<"/onboarding">) {
  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <i className="absolute top-[-12%] left-[60%] h-[460px] w-[560px] animate-drift-a rounded-full bg-[var(--glow-a)] opacity-50 blur-[110px]" />
      </div>
      <header className="relative mx-auto flex h-[72px] w-[min(720px,100%-32px)] items-center justify-between">
        <Link href="/" aria-label="Upsolve home">
          <Logo />
        </Link>
        <ThemeToggle />
      </header>
      <main className="relative mx-auto w-[min(720px,100%-32px)] pt-6 pb-24">{children}</main>
    </div>
  );
}
