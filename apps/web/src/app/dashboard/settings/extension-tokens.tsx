"use client";

import { useState, useTransition } from "react";
import { MonitorSmartphone } from "lucide-react";
import { Button } from "@upsolve/ui";
import { revokeExtensionToken } from "@/app/actions/extension";
import { HoldToConfirm, Modal } from "@/components/fx/overlay";
import { TimeAgo } from "@/components/time-ago";

export type TokenRow = {
  id: string;
  label: string | null;
  createdAt: string;
  lastUsedAt: string | null;
};

/** Browsers connected to this account as device cards, each removable (hold to confirm). */
export function ExtensionTokens({ tokens, now }: { tokens: TokenRow[]; now: number }) {
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState<TokenRow | null>(null);

  if (tokens.length === 0) {
    return (
      <p className="text-13 text-ink-2">
        No browsers connected yet. Connect one to time every problem automatically.
      </p>
    );
  }

  return (
    <>
      <ul className="grid gap-2.5 sm:grid-cols-2">
        {tokens.map((t) => {
          const active = t.lastUsedAt && now - new Date(t.lastUsedAt).getTime() < 15 * 60_000;
          return (
            <li key={t.id} className="surface-inset flex items-start gap-3 rounded-[16px] p-4">
              <span className="relative grid size-10 shrink-0 place-items-center rounded-[12px] border border-line bg-surface-2 text-ink-2">
                <MonitorSmartphone size={18} aria-hidden="true" />
                {active && (
                  <span
                    aria-label="Active now"
                    className="pulse-ring absolute -top-0.5 -right-0.5 size-2.5 rounded-full border-2 border-surface bg-success text-success"
                  />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-14 font-[600]">{t.label ?? "Browser"}</span>
                <span className="block text-12 text-ink-3">
                  Connected <TimeAgo date={t.createdAt} />
                </span>
                <span className="block text-12 text-ink-3">
                  {t.lastUsedAt ? (
                    <>
                      Last used <TimeAgo date={t.lastUsedAt} />
                    </>
                  ) : (
                    "Not used yet"
                  )}
                </span>
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="hover:text-bad"
                disabled={pending}
                onClick={() => setConfirm(t)}
              >
                Disconnect
              </Button>
            </li>
          );
        })}
      </ul>
      <Modal
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={`Disconnect ${confirm?.label ?? "this browser"}?`}
        description="The extension stops syncing from this browser until you connect it again."
      >
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirm(null)}>
            Cancel
          </Button>
          <HoldToConfirm
            disabled={pending}
            onConfirm={() => {
              const id = confirm?.id;
              setConfirm(null);
              if (id) startTransition(() => revokeExtensionToken(id));
            }}
          >
            Hold to disconnect
          </HoldToConfirm>
        </div>
      </Modal>
    </>
  );
}
