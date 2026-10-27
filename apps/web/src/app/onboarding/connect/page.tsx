import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Button, ButtonArrow, Card } from "@upsolve/ui";
import { finishOnboarding } from "@/app/actions/profile";
import { PlatformConnections } from "@/components/platform-connections";
import { getCurrentUser, isDemoUser } from "@/lib/auth";
import { getProfile } from "@/lib/data";
import { OnboardingSteps } from "../steps";

export const metadata: Metadata = { title: "Connect your platforms" };

export default function ConnectPage() {
  return (
    <div className="mx-auto max-w-[760px] animate-[slide-in-r_var(--dur-slow)_var(--ease-out)]">
      <OnboardingSteps current={2} />
      <h1 className="mb-3 font-display text-[clamp(36px,6vw,52px)] leading-none tracking-[-0.02em]">
        Bring your history. <em className="text-violet">All of it.</em>
      </h1>
      <p className="mb-8 max-w-[52ch] text-ink-2">
        Enter your usernames. We pull your solved problems, ratings and activity from public data.
        Never your password.
      </p>
      <Suspense fallback={<div className="h-56 skeleton rounded-lg" />}>
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
  const profile = await getProfile(user.id);
  if (!profile?.handle) redirect("/onboarding");

  return (
    <>
      <Card>
        <PlatformConnections userId={user.id} />
      </Card>
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
