"use client";

import { useState, useTransition } from "react";
import { Hand } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@upsolve/ui";
import { nudgeMember } from "@/app/actions/daily";

/** A gentle once-a-day nudge to a group member who hasn't solved anything today. */
export function NudgeButton({
  groupId,
  toUser,
  name,
  already,
}: {
  groupId: string;
  toUser: string;
  name: string;
  already: boolean;
}) {
  const [sent, setSent] = useState(already);
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={sent || pending}
      onClick={() =>
        start(async () => {
          const res = await nudgeMember(groupId, toUser);
          if (res.ok) {
            setSent(true);
            toast.success(`Nudged ${name}`, {
              description: "They'll see it next time they open DsaKaro.",
            });
          } else {
            toast.error(res.error);
            if (res.error.startsWith("Already")) setSent(true);
          }
        })
      }
      className={cn(
        "inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-11 font-[600] transition-colors",
        sent
          ? "border-line text-ink-4"
          : "border-line-2 text-ink-2 hover:border-medium-line hover:bg-medium-soft hover:text-medium",
      )}
      title={sent ? "Nudged today" : `Nudge ${name}`}
    >
      <Hand size={12} aria-hidden="true" className={cn(!sent && "group-hover:animate-pulse")} />
      {sent ? "Nudged" : "Nudge"}
    </button>
  );
}
