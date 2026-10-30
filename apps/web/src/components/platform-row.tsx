"use client";

import { useState, useTransition, type FormEvent } from "react";
import { ExternalLink, RefreshCw, ShieldQuestion, Trash2 } from "lucide-react";
import type { Platform } from "@upsolve/adapters";
import { Button, ButtonArrow, Tag, Tooltip, VerifiedChip, cn, inputClasses } from "@upsolve/ui";
import { PlatformMark, platformMarkId } from "./site-icons";
import {
  checkVerification,
  connectPlatform,
  disconnectPlatform,
  startVerification,
  syncPlatform,
  type ActionResult,
} from "@/app/actions/platforms";
import { TimeAgo } from "./time-ago";

export type PlatformRowAccount = {
  id: string;
  handle: string;
  verified: boolean;
  verifyCode: string | null;
  verifying: boolean;
  status: "pending" | "ok" | "error" | "rate_limited";
  syncing: boolean;
  lastSyncedAt: string | null;
  lastError: string | null;
  solved: number | null;
};

export function PlatformRow({
  platform,
  label,
  placeholder,
  profileUrl,
  verifyInstructions,
  account,
}: {
  platform: Platform;
  label: string;
  placeholder: string;
  profileUrl: string | null;
  verifyInstructions: string | null;
  account: PlatformRowAccount | null;
}) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<ActionResult | null>(null);
  const [handle, setHandle] = useState("");
  const [confirmRemove, setConfirmRemove] = useState(false);

  function run(action: () => Promise<ActionResult>) {
    setFeedback(null);
    startTransition(async () => setFeedback(await action()));
  }

  function connect(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (handle.trim()) run(() => connectPlatform(platform, handle));
  }

  return (
    <div className="surface-inset group rounded-[16px] p-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="flex min-w-[140px] items-center gap-2.5 text-14 font-[600]">
          {platformMarkId(platform) && (
            <span className="grid size-8 place-items-center rounded-[10px] border border-line bg-surface-2">
              <PlatformMark site={platformMarkId(platform)!} size={16} brand={!!account} />
            </span>
          )}
          {label}
        </span>

        {account ? (
          <>
            <span className="font-mono text-[13px]">
              {profileUrl ? (
                <a
                  href={profileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 hover:underline"
                >
                  {account.handle}
                  <ExternalLink size={11} aria-hidden="true" className="text-ink-3" />
                </a>
              ) : (
                account.handle
              )}
            </span>
            {account.verified ? (
              <VerifiedChip />
            ) : (
              <Tag className="h-5 px-1.5 text-11">unverified</Tag>
            )}
            {account.solved !== null && (
              <Tag className="tnum h-5 px-1.5 text-11">{account.solved} solved</Tag>
            )}
            <span className="ml-auto flex flex-wrap items-center justify-end gap-1.5">
              <Button
                size="sm"
                variant="secondary"
                disabled={pending}
                onClick={() => run(() => syncPlatform(account.id))}
                aria-label={`Sync ${label} now`}
              >
                <RefreshCw
                  size={14}
                  data-nudge="spin"
                  className={cn((pending || account.syncing) && "animate-spin")}
                  aria-hidden="true"
                />
                Sync
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                disabled={pending}
                onClick={() => setConfirmRemove((c) => !c)}
                aria-label={`Remove ${label}`}
                aria-expanded={confirmRemove}
                title={`Remove ${label}`}
                className={cn("hover:text-bad", confirmRemove && "text-bad")}
              >
                <Trash2 size={14} aria-hidden="true" />
              </Button>
            </span>
          </>
        ) : (
          <form onSubmit={connect} className="flex flex-1 flex-wrap items-center gap-2">
            <label htmlFor={`handle-${platform}`} className="sr-only">
              {label} username
            </label>
            <input
              id={`handle-${platform}`}
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder={placeholder}
              autoComplete="off"
              spellCheck={false}
              disabled={pending}
              className={inputClasses({ className: "h-[38px] min-w-0 flex-1 font-mono text-13" })}
            />
            <Tooltip content={handle.trim() ? `Connect ${label}` : "Type your username first"}>
              <Button
                type="submit"
                variant="secondary"
                loading={pending}
                disabled={!handle.trim()}
                className="h-[38px]"
              >
                {platformMarkId(platform) && (
                  <PlatformMark site={platformMarkId(platform)!} size={14} brand />
                )}
                Connect <ButtonArrow />
              </Button>
            </Tooltip>
          </form>
        )}
      </div>

      {/* The confirm step gets its own line: inline beside Sync it was wider than a phone
          screen, and the dashboard clips overflow, so "Remove" couldn't be tapped. */}
      {account && confirmRemove && (
        <div
          role="group"
          aria-label={`Remove ${label}`}
          className="mt-3 flex flex-wrap items-center gap-2.5 rounded-[12px] border border-bad/30 bg-bad-soft p-3"
        >
          <p className="min-w-[200px] flex-1 text-13 text-ink-2">
            Remove <span className="font-[600] text-ink">{account.handle}</span>? Its synced history
            is deleted too. You can connect it again any time.
          </p>
          <span className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="danger"
              loading={pending}
              onClick={() => run(() => disconnectPlatform(account.id))}
            >
              Remove
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => setConfirmRemove(false)}
            >
              Cancel
            </Button>
          </span>
        </div>
      )}

      {account && (
        <p className="mt-2 text-12 text-ink-3">
          {pending || account.syncing ? (
            "Syncing…"
          ) : account.status === "ok" && account.lastSyncedAt ? (
            <>
              Synced <TimeAgo date={account.lastSyncedAt} />
            </>
          ) : account.lastError ? (
            <span className="text-bad">{account.lastError}</span>
          ) : (
            "Waiting for first sync"
          )}
        </p>
      )}

      {account && !account.verified && (
        <div className="mt-3 rounded-[12px] border border-line bg-surface-2 p-3">
          {account.verifying && verifyInstructions ? (
            <>
              <p className="text-[13px] text-ink-2">{verifyInstructions}</p>
              {account.verifyCode && platform !== "codeforces" && (
                <code className="mt-2 inline-block rounded-[8px] bg-signal px-2.5 py-1 font-mono text-13 text-signal-ink shadow-glow-signal select-all">
                  {account.verifyCode}
                </code>
              )}
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  loading={pending}
                  onClick={() => run(() => checkVerification(account.id))}
                >
                  Verify
                </Button>
                {platform === "codeforces" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => run(() => startVerification(account.id))}
                  >
                    Restart 15-minute window
                  </Button>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <ShieldQuestion size={16} className="text-ink-3" aria-hidden="true" />
              <p className="flex-1 text-[13px] text-ink-2">
                Prove this account is yours to appear on college leaderboards.
              </p>
              <Button
                size="sm"
                variant="secondary"
                disabled={pending}
                onClick={() => run(() => startVerification(account.id))}
              >
                Verify ownership
              </Button>
            </div>
          )}
        </div>
      )}

      {feedback && (
        <p
          role={feedback.ok ? "status" : "alert"}
          className={cn("mt-2 text-13", feedback.ok ? "text-success" : "text-bad")}
        >
          {feedback.ok ? feedback.message : feedback.error}
        </p>
      )}
    </div>
  );
}
