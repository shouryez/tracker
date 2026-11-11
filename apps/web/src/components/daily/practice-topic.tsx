"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, Target } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonClasses } from "@upsolve/ui";
import { addTopicPracticeToPlan } from "@/app/actions/daily";

/** "Practice my weakest topic": three problems in that topic from your sheets, onto Today. */
export function PracticeTopicButton({ topic, label }: { topic: string; label: string }) {
  const [added, setAdded] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  if (added) {
    return (
      <Link href="/dashboard" className={buttonClasses({ variant: "secondary", size: "sm" })}>
        <Check size={14} aria-hidden="true" /> On today&apos;s list
      </Link>
    );
  }
  return (
    <Button
      variant="signal"
      size="sm"
      loading={pending}
      onClick={() =>
        start(async () => {
          const r = await addTopicPracticeToPlan(topic);
          if (!r.ok) {
            toast(r.error);
            return;
          }
          setAdded(true);
          toast(`Added ${r.added} ${label} problem${r.added === 1 ? "" : "s"} to Today`, {
            action: { label: "Open Today", onClick: () => router.push("/dashboard") },
          });
        })
      }
    >
      <Target size={14} aria-hidden="true" /> Practice {label}
    </Button>
  );
}
