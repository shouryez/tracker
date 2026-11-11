import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Button, ButtonArrow, Card } from "@upsolve/ui";
import { finishOnboarding } from "@/app/actions/profile";
import { PlatformConnections } from "@/components/platform-connections";
import { getCurrentUser, isDemoUser } from "@/lib/auth";
import { getProfile } from "@/lib/data";
import { getMyVerification } from "@/lib/verification";
import { getSheetSummaries } from "@/lib/sheets-data";
import { MainSheetPicker } from "@/components/main-sheet-picker";
import { CollegeVerification } from "@/components/college-verification";
import { OnboardingSteps } from "../steps";
import { VariableProximity } from "@/components/fx/variable-proximity";

export const metadata: Metadata = { title: "Connect your platforms" };

export default function ConnectPage() {
  return (
    <div className="mx-auto max-w-[760px] animate-[slide-in-r_var(--dur-slow)_var(--ease-out)]">
      <OnboardingSteps current={2} />
      <h1 className="mb-3 font-display text-[clamp(36px,6vw,52px)] leading-none tracking-[-0.02em]">
        <VariableProximity text="Bring your history." />{" "}
        <em className="text-ink-3 not-italic">Pick your sheet.</em>
      </h1>
      <p className="mb-8 max-w-[52ch] text-ink-2">
        Start with your LeetCode username: we pull your solved problems, ratings and activity from
        public data, never your password. Then pick the sheet you&apos;re working through.
      </p>
      <Suspense fallback={<div className="h-56 skeleton rounded-[24px]" />}>
        <ConnectStep />
      </Suspense>
    </div>
  );
}

async function ConnectStep() {
  const user = await getCurrentUser();
  if (isDemoUser(user)) {
    return (
      <p className="text-ink-2">Connecting platforms needs sign-in. Configure Supabase first.</p>
    );
  }
  const [profile, verification, sheets] = await Promise.all([
    getProfile(user.id),
    getMyVerification(user.id),
    getSheetSummaries(user.id),
  ]);
  const main = sheets.find((s) => s.following) ?? null;
  if (!profile?.handle) redirect("/onboarding");

  return (
    <>
      <Card>
        <PlatformConnections userId={user.id} />
      </Card>
      <Card className="mt-5">
        <div className="mb-4">
          <p className="mb-1.5 text-13 font-[600] text-ink-3">Step 2 of this page</p>
          <h2 className="text-18 font-[600]">Which sheet are you on?</h2>
          <p className="mt-1 text-13 text-ink-2">
            Your main sheet is where Today&apos;s picks and Continue start. Problems you&apos;ve
            already solved are ticked on it automatically.
          </p>
        </div>
        <MainSheetPicker
          initialMain={main?.id ?? null}
          sheets={sheets.map((s) => ({
            id: s.id,
            slug: s.slug,
            name: s.name,
            author: s.author,
            total: s.total,
            done: s.done,
          }))}
        />
      </Card>
      {profile.college && !verification.verifiedAt && (
        <Card className="mt-5">
          <div className="mb-4">
            <p className="mb-1.5 text-13 font-[600] text-ink-3">Optional · 30 seconds</p>
            <h2 className="text-18 font-[600]">Verify you study at {profile.college.name}</h2>
            <p className="mt-1 text-13 text-ink-2">
              Verified students get a badge on college boards. You can also do this later in
              Settings.
            </p>
          </div>
          <CollegeVerification state={verification} compact />
        </Card>
      )}
      <p className="mt-4 text-xs text-ink-3">
        The first Codeforces sync can take a few seconds if you have lots of submissions. You can
        connect or verify platforms later from Settings.
      </p>
      <form action={finishOnboarding} className="mt-8 flex justify-end">
        <Button type="submit" variant="signal" size="lg">
          {profile.onboardedAt ? "Back to dashboard" : "Go to my dashboard"} <ButtonArrow />
        </Button>
      </form>
    </>
  );
}
