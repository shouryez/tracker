"use client";

import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { Switch } from "@upsolve/ui";
import { setProfilePublic } from "@/app/actions/profile";

export function PublicToggle({ isPublic }: { isPublic: boolean }) {
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(isPublic);

  return (
    <Switch
      checked={optimistic}
      label="Public profile"
      disabled={pending}
      onCheckedChange={(next) =>
        startTransition(async () => {
          setOptimistic(next);
          await setProfilePublic(next);
          toast.success(next ? "Your profile is public" : "Your profile is private");
        })
      }
    />
  );
}
