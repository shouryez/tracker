"use client";

import { useState, useTransition } from "react";
import { Button } from "@upsolve/ui";
import { revokeExtensionToken } from "@/app/actions/extension";
import { TimeAgo } from "@/components/time-ago";

export type TokenRow = {
  id: string;
  label: string | null;
  createdAt: string;
  lastUsedAt: string | null;
};

/** Browsers connected to this account, each removable. */
export function ExtensionTokens({ tokens }: { tokens: TokenRow[] }) {
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState<string | null>(null);

  if (tokens.length === 0) {
    return <p className="text-[13px] text-ink-2">No browsers connected yet.</p>;
  }

  return (
    <ul>
      {tokens.map((t) => (
        <li
          key={t.id}
          className="flex flex-wrap items-center gap-3 border-t border-dashed border-line-2 py-3 first:border-t-0 first:pt-0"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-[13.5px] font-medium">{t.label ?? "Browser"}</span>
            <span className="font-mono text-[11px] text-ink-3">
              connected <TimeAgo date={t.createdAt} /> ·{" "}
              {t.lastUsedAt ? (
                <>
                  last used <TimeAgo date={t.lastUsedAt} />
                </>
              ) : (
                "not used yet"
              )}
            </span>
          </span>
          {confirm === t.id ? (
            <>
              <Button
                size="sm"
                variant="secondary"
                className="text-bad"
                disabled={pending}
                onClick={() => startTransition(() => revokeExtensionToken(t.id))}
              >
                Disconnect this browser
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirm(null)}>
                Cancel
              </Button>
            </>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => setConfirm(t.id)}>
              Disconnect
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}
