"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@upsolve/ui";
import { deleteMyCode } from "@/app/actions/bugs";

/** Saved code (WA autopsy): what's kept, and one button to delete all of it. */
export function CodeSettings({ count }: { count: number }) {
  const [sure, setSure] = useState(false);
  const [left, setLeft] = useState(count);
  const [pending, start] = useTransition();
  return (
    <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-4">
      <p className="min-w-[220px] flex-1 text-13 text-ink-2">
        <span className="block font-[600] text-ink">Your saved code</span>
        When you submit on LeetCode, the extension saves that submission&apos;s code so failed ones
        can get a bug autopsy. {left > 0 ? `${left} saved.` : "Nothing saved yet."}
      </p>
      {left > 0 &&
        (sure ? (
          <span className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setSure(false)} disabled={pending}>
              Keep it
            </Button>
            <Button
              size="sm"
              variant="secondary"
              loading={pending}
              className="text-bad"
              onClick={() =>
                start(async () => {
                  const res = await deleteMyCode();
                  if (!res.ok) return void toast.error("Couldn't delete it. Try again.");
                  setLeft(0);
                  setSure(false);
                  toast.success("Saved code deleted", {
                    description: "With the autopsies and drills made from it.",
                  });
                })
              }
            >
              <Trash2 size={13} aria-hidden="true" /> Delete all {left}
            </Button>
          </span>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => setSure(true)}>
            <Trash2 size={13} aria-hidden="true" /> Delete my code
          </Button>
        ))}
    </div>
  );
}
