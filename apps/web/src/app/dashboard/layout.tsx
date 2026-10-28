import Link from "next/link";
import { Suspense } from "react";
import { LogoMark, SpotlightTracker, ThemeToggle } from "@upsolve/ui";
import { NavHistory } from "@/components/back-link";
import { CommandPalette } from "@/components/command-palette";
import { NextProblemPicker } from "@/components/daily/next-problem";
import { FeedbackButton, FeedbackTrigger } from "./_components/feedback-button";
import { SidebarView } from "./_components/nav-links";
import { MobileNavWithData, SidebarWithData } from "./_components/sidebar-data";
import { SearchBox } from "./_components/search-box";
import { StickyHeader } from "./_components/sticky-header";
import { UserMenu, UserMenuSkeleton } from "./_components/user-menu";

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <div className="min-h-dvh bg-bg-2 lg:flex">
      <Suspense fallback={<SidebarView pathname={null} />}>
        <SidebarWithData />
      </Suspense>

      <div className="min-w-0 flex-1 px-4 pb-32 sm:px-6 lg:pb-12">
        <StickyHeader>
          <Link href="/dashboard" className="lg:hidden" aria-label="Upsolve dashboard">
            <LogoMark size={26} />
          </Link>
          <SearchBox />
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex">
              <FeedbackTrigger />
            </span>
            <ThemeToggle />
            <Suspense fallback={<UserMenuSkeleton />}>
              <UserMenu />
            </Suspense>
          </div>
        </StickyHeader>
        <main id="main" className="mx-auto w-full max-w-[1440px] scroll-mb-28">
          {children}
        </main>
      </div>

      <Suspense fallback={null}>
        <MobileNavWithData />
      </Suspense>
      <Suspense fallback={null}>
        <NavHistory />
      </Suspense>
      <Suspense fallback={null}>
        <FeedbackButton />
      </Suspense>
      <CommandPalette />
      <NextProblemPicker />
      <SpotlightTracker />
    </div>
  );
}
