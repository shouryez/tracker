import Link from "next/link";
import { Suspense } from "react";
import { LogoMark, SpotlightTracker, ThemeToggle } from "@upsolve/ui";
import { NavHistory } from "@/components/back-link";
import { CommandPalette } from "@/components/command-palette";
import { KeyboardList } from "@/components/keyboard-list";
import { ProblemMenu } from "@/components/problem-menu";
import { Shortcuts } from "@/components/shortcuts";
import { NextProblemPicker } from "@/components/daily/next-problem";
import { FeedbackButton, FeedbackTrigger } from "./_components/feedback-button";
import { SidebarView } from "./_components/nav-links";
import { MobileNavWithData, SidebarWithData } from "./_components/sidebar-data";
import { SearchBox } from "./_components/search-box";
import { StickyHeader } from "./_components/sticky-header";
import { StudyBarWithData } from "./_components/study-bar-data";
import { UserMenu, UserMenuSkeleton } from "./_components/user-menu";

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <div className="desk min-h-dvh lg:flex">
      <Suspense fallback={<SidebarView pathname={null} />}>
        <SidebarWithData />
      </Suspense>

      {/* overflow-x-clip: decorative glows can't widen the page on phones; unlike hidden it keeps the header sticky. */}
      <div className="min-w-0 flex-1 overflow-x-clip px-4 pb-32 sm:px-6 lg:px-10 lg:pt-8 lg:pb-14">
        {/* Phones and tablets only: on desktop, search, theme and you live in the sidebar. */}
        <StickyHeader className="lg:hidden">
          <Link href="/dashboard" className="lg:hidden" aria-label="DsaKaro dashboard">
            <LogoMark size={26} />
          </Link>
          <SearchBox />
          <div className="flex shrink-0 items-center gap-2">
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
        <StudyBarWithData />
      </Suspense>
      <Suspense fallback={null}>
        <NavHistory />
      </Suspense>
      <Suspense fallback={null}>
        <FeedbackButton />
      </Suspense>
      <CommandPalette />
      <Shortcuts />
      <ProblemMenu />
      <KeyboardList />
      <NextProblemPicker />
      <SpotlightTracker />
    </div>
  );
}
