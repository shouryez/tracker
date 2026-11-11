"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Play } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@upsolve/ui";
import { startFocus } from "@/app/actions/daily";
import { labStart } from "@/lib/ext-bridge";
import { maybeAutoPopout } from "./focus-live";

/** The problem page in review mode, so the extension times it as a revision. */
function reviewUrl(url: string) {
  const u = new URL(url);
  u.searchParams.set("upsolve", "review");
  return u.toString();
}

/**
 * "Review 3 now": opens the first due problem in review mode and starts a study session
 * labelled as revision (or carries on the one that's running). The rest wait on Revision.
 */
export function ReviewSessionButton({
  problems,
  sessionRunning,
}: {
  problems: { title: string; url: string }[];
  sessionRunning: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const n = problems.length;
  if (n === 0) return null;
  return (
    <Button
      variant="secondary"
      size="sm"
      loading={pending}
      onClick={() => {
        // Open the tab inside the click, before any await, so it isn't blocked as a popup.
        window.open(reviewUrl(problems[0]!.url), "_blank", "noopener");
        if (sessionRunning) {
          toast(`Revising ${problems[0]!.title}`, {
            description: "Your running study session is timing it.",
          });
          return;
        }
        start(async () => {
          const res = await startFocus("stopwatch", `Revision · ${n} problem${n === 1 ? "" : "s"}`);
          if (!res.ok) return void toast.error(res.error);
          if (!res.existing) {
            await labStart(res.id, res.startedAt);
            maybeAutoPopout();
          }
          toast.success(`Revision session started · ${n} to go`, {
            description: "Grade each one on Revision when you're done.",
            action: { label: "Revision", onClick: () => router.push("/dashboard/revision") },
          });
          router.refresh();
        });
      }}
    >
      <Play size={13} aria-hidden="true" className="fill-current" /> Review {n} now
    </Button>
  );
}
