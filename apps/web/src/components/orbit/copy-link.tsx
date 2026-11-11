"use client";

import { useState } from "react";
import { Link2 } from "lucide-react";
import { toast } from "sonner";
import { Button, CheckDraw } from "@upsolve/ui";

/** Copies a link (e.g. a group invite) and confirms with a toast. */
export function CopyLinkButton({
  url,
  label = "Copy invite link",
  className,
}: {
  url: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="secondary"
      size="sm"
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          toast.success("Invite link copied");
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          toast(url);
        }
      }}
    >
      {copied ? (
        <CheckDraw size={14} className="text-success" />
      ) : (
        <Link2 size={14} aria-hidden="true" />
      )}
      {copied ? "Copied" : label}
    </Button>
  );
}
