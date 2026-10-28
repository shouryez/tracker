import { BadgeCheck } from "lucide-react";
import { cn } from "@upsolve/ui";

/** Small check shown next to a name once an admin has verified their college ID. */
export function VerifiedBadge({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <BadgeCheck
      size={size}
      strokeWidth={2.25}
      role="img"
      aria-label="Verified student"
      className={cn("inline-block shrink-0 align-[-2px] text-violet", className)}
    >
      <title>Verified student</title>
    </BadgeCheck>
  );
}
