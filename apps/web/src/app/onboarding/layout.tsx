import Link from "next/link";
import { Logo, ThemeToggle } from "@upsolve/ui";

export default function OnboardingLayout({ children }: LayoutProps<"/onboarding">) {
  return (
    <div className="desk relative min-h-dvh overflow-hidden">
      {/* The lamp, and a dot field that fades out down the page. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(900px_500px_at_50%_-10%,rgba(240,136,79,.1),transparent_65%)]"
      />
      <div
        aria-hidden="true"
        className="dotfield pointer-events-none absolute inset-x-0 top-0 h-[480px]"
      />
      <header className="relative mx-auto flex h-[72px] w-[min(1000px,100%-32px)] items-center justify-between">
        <Link href="/" aria-label="DsaKaro home">
          <Logo />
        </Link>
        <ThemeToggle />
      </header>
      <main className="relative mx-auto w-[min(1000px,100%-32px)] pt-6 pb-24">{children}</main>
    </div>
  );
}
