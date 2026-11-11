"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import { SignalType } from "@/components/fx/signal-type";
import { feel } from "@/lib/feel";

const KEY = "dsakaro:badges";

/**
 * Celebrates a badge (or a new tier) the first time this browser sees it (FRONTEND-PLAN
 * §9.4): a toast whose headline powers on like a sign, a chime and a milestone tap. The very
 * first visit only records what you already have, so nobody gets ten toasts at once.
 */
export function BadgeWatcher({ earned }: { earned: { id: string; name: string }[] }) {
  const router = useRouter();
  const sig = earned.map((b) => `${b.id}:${b.name}`).join("|");
  useEffect(() => {
    const now = sig ? sig.split("|") : [];
    let seen: string[] | null = null;
    try {
      const raw = localStorage.getItem(KEY);
      seen = raw ? (JSON.parse(raw) as string[]) : null;
      localStorage.setItem(KEY, JSON.stringify(now));
    } catch {
      return;
    }
    if (!seen) return;
    const fresh = now.filter((k) => !seen!.includes(k)).slice(0, 2);
    fresh.forEach((k, i) => {
      const name = k.split(":").slice(1).join(":");
      window.setTimeout(
        () => {
          feel.milestone();
          toast.success(
            <SignalType
              text={`Badge: ${name}`}
              trigger="mount"
              glowColor="var(--signal)"
              interference={0}
              clickCycle={false}
            />,
            {
              description: "It's on your profile now.",
              action: {
                label: "See it",
                onClick: () => router.push("/dashboard/analytics#badges"),
              },
            },
          );
        },
        900 + i * 1600,
      );
    });
  }, [sig, router]);
  return null;
}
