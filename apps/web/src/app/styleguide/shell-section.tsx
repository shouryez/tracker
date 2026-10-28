import type { ReactNode } from "react";
import Link from "next/link";
import { RotateCcw, Share2 } from "lucide-react";
import { ButtonArrow, buttonClasses } from "@upsolve/ui";
import { Avatar } from "@/app/dashboard/_components/avatar-menu";
import { SidebarView } from "@/app/dashboard/_components/nav-links";
import { ExtensionPromo } from "@/app/dashboard/_components/sidebar-data";
import { Dot, PAGE_GLOW, PageHeader } from "@/components/page-header";

// Dev-only preview of the app shell with sample data (the real one needs sign-in).

const SAMPLE_USER = {
  label: "Shourya",
  email: "sample@example.com",
  avatarUrl: null,
  handle: "shourya",
  initials: "S",
  canSignOut: false,
  admin: null,
};

export function ShellSection({
  Section,
}: {
  Section: (p: { title: string; children: ReactNode }) => ReactNode;
}) {
  return (
    <Section title="App shell">
      <div className="flex overflow-hidden rounded-[20px] border border-line bg-bg-2 [&>aside]:!flex [&>aside]:!h-[720px]">
        <SidebarView
          pathname="/dashboard/revision"
          badges={{ "/dashboard/revision": 5 }}
          footer={<ExtensionPromo connected={false} />}
          user={
            <span className="flex items-center gap-2.5 rounded-[14px] border border-line bg-surface-2/70 p-2">
              <Avatar user={SAMPLE_USER} size={34} />
              <span className="min-w-0 leading-tight">
                <span className="block truncate text-13 font-[600]">{SAMPLE_USER.label}</span>
                <span className="block truncate text-11 text-ink-3">@{SAMPLE_USER.handle}</span>
              </span>
            </span>
          }
        />
        <div className="flex min-w-0 flex-1 flex-col gap-10 p-8">
          <PageHeader
            eyebrow="Overview · Tue 28 Oct"
            glow={PAGE_GLOW.overview}
            title={
              <>
                Burning the midnight oil, <em>Shourya.</em>
              </>
            }
            subtitle={
              <>
                <span>47-day streak</span>
                <Dot />
                <span>5 to revise</span>
                <Dot />
                <span>Placements</span>
              </>
            }
            actions={
              <>
                <span className={buttonClasses({ variant: "secondary", size: "sm" })}>
                  <Share2 size={14} aria-hidden="true" /> Share card
                </span>
                <Link href="#" className={buttonClasses({ variant: "signal", size: "sm" })}>
                  <RotateCcw size={14} aria-hidden="true" /> Revise now <ButtonArrow />
                </Link>
              </>
            }
          />
          <PageHeader
            eyebrow="Revision"
            glow={PAGE_GLOW.revision}
            title={
              <>
                Revision, <em>five today.</em>
              </>
            }
            subtitle="1 → 3 → 7 → 16 → 35 → 90 days, so nothing fades."
          />
          <PageHeader
            eyebrow="Analytics · last 30 days"
            glow={PAGE_GLOW.analytics}
            title={
              <>
                Analytics, <em>how you practise.</em>
              </>
            }
          />
        </div>
      </div>
    </Section>
  );
}
