"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonClasses } from "@upsolve/ui";
import { addUpsolveToPlan } from "@/app/actions/daily";

/** "Add the N I missed to Today": puts unfinished contest problems on today's list. */
export function AddUpsolveButton({ keys }: { keys: string[] }) {
  const [added, setAdded] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  if (keys.length === 0) return null;
  if (added) {
    return (
      <Link href="/dashboard" className={buttonClasses({ variant: "secondary" })}>
        <Check size={14} aria-hidden="true" /> On today&apos;s list
      </Link>
    );
  }
  return (
    <Button
      variant="signal"
      loading={pending}
      onClick={() =>
        start(async () => {
          const r = await addUpsolveToPlan(keys);
          if (r.ok) {
            setAdded(true);
            toast(`Added ${r.added} to Today`, {
              action: { label: "Open Today", onClick: () => router.push("/dashboard") },
            });
          } else {
            toast(r.error);
            if (r.error === "Already on today's list.") setAdded(true);
          }
        })
      }
    >
      <Plus size={14} aria-hidden="true" /> Add {keys.length === 1 ? "it" : `the ${keys.length}`} to
      Today
    </Button>
  );
}
