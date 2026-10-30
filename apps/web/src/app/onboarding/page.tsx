import type { Metadata } from "next";
import { Suspense } from "react";
import { getCurrentUser, isDemoUser } from "@/lib/auth";
import { getProfile } from "@/lib/data";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Set up your profile" };

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="h-[600px] skeleton rounded-lg" />}>
      <ProfileStep />
    </Suspense>
  );
}

async function ProfileStep() {
  const user = await getCurrentUser();
  if (isDemoUser(user)) return <DemoOnly />;
  const profile = await getProfile(user.id);
  const suggestedHandle = (user.name ?? user.email?.split("@")[0] ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 20);

  return (
    <ProfileForm
      editing={Boolean(profile?.onboardedAt)}
      defaults={{
        name: profile?.name ?? user.name ?? "",
        handle: profile?.handle ?? suggestedHandle,
        college: profile?.college ?? null,
        branch: profile?.branch ?? "",
        gradYear: profile?.gradYear ?? null,
        currentYear: profile?.currentYear ?? null,
        goal: profile?.goal ?? "",
        targetCompanies: profile?.targetCompanies ?? [],
        mainLanguage: profile?.mainLanguage ?? "",
        dailyGoalMin: profile?.dailyGoalMin ?? 60,
      }}
    />
  );
}

function DemoOnly() {
  return (
    <p className="text-ink-2">Onboarding needs sign-in. Configure Supabase first (see README).</p>
  );
}

// DsaKaro
