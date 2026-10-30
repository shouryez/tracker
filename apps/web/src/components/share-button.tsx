"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button, CheckDraw } from "@upsolve/ui";

/** Shares this page (native share sheet when available, else copies the link). */
export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={async () => {
        const url = window.location.href;
        try {
          if (navigator.share) {
            await navigator.share({ title, url });
            return;
          }
          await navigator.clipboard.writeText(url);
          toast.success("Profile link copied");
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          // Share sheet dismissed or clipboard blocked: nothing to do.
        }
      }}
    >
      {copied ? (
        <CheckDraw size={14} className="text-success" />
      ) : (
        <Share2 size={14} aria-hidden="true" />
      )}
      {copied ? "Copied" : "Share"}
    </Button>
  );
}

// DsaKaro
