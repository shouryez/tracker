"use client";

import { useState, useTransition, type FormEvent } from "react";
import { BadgeCheck, ExternalLink, RefreshCw, ShieldQuestion, Trash2 } from "lucide-react";
import type { Platform } from "@upsolve/adapters";
import { Button, ButtonArrow, Tag, cn } from "@upsolve/ui";
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
    <div className="border-t border-dashed border-line-2 py-4 first:border-t-0 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="min-w-[110px] text-[14px] font-[550]">{label}</span>

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
              <Tag tone="ac" mono>
                <BadgeCheck size={12} aria-hidden="true" /> verified
              </Tag>
            ) : (
              <Tag mono>unverified</Tag>
            )}
            {account.solved !== null && <Tag mono>{account.solved} solved</Tag>}
            <span className="ml-auto flex items-center gap-1.5">
              <Button
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() => run(() => syncPlatform(account.id))}
                aria-label={`Sync ${label} now`}
              >
                <RefreshCw size={14} className={cn(pending && "animate-spin")} aria-hidden="true" />
                Sync
              </Button>
              {confirmRemove ? (
                <>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="text-bad"
                    disabled={pending}
                    onClick={() => run(() => disconnectPlatform(account.id))}
                  >
                    Remove {label} and its data
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmRemove(false)}>
                    Cancel
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => setConfirmRemove(true)}
                  aria-label={`Remove ${label}`}
                >
                  <Trash2 size={14} aria-hidden="true" />
                </Button>
              )}
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
              className="h-[34px] min-w-0 flex-1 rounded-sm border border-line-2 bg-surface-2 px-3 font-mono text-[13px] text-ink outline-none transition-[border-color,box-shadow] duration-[240ms] placeholder:text-ink-3 focus:border-primary focus:shadow-[0_0_0_4px_var(--primary-soft)]"
            />
            <Button type="submit" size="sm" variant="indigo" disabled={pending || !handle.trim()}>
              {pending ? "Connecting…" : "Connect"} {!pending && <ButtonArrow />}
            </Button>
          </form>
        )}
      </div>

      {account && (
        <p className="mt-1.5 font-mono text-[11px] text-ink-3">
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
        <div className="mt-3 rounded-md border border-line bg-surface-2 p-3">
          {account.verifying && verifyInstructions ? (
            <>
              <p className="text-[13px] text-ink-2">{verifyInstructions}</p>
              {account.verifyCode && platform !== "codeforces" && (
                <code className="mt-2 inline-block rounded-xs bg-signal px-2 py-1 font-mono text-[13px] text-signal-ink select-all">
                  {account.verifyCode}
                </code>
              )}
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  disabled={pending}
                  onClick={() => run(() => checkVerification(account.id))}
                >
                  {pending ? "Checking…" : "Verify"}
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
          className={cn("mt-2 text-[13px]", feedback.ok ? "text-ok" : "text-bad")}
        >
          {feedback.ok ? feedback.message : feedback.error}
        </p>
      )}
    </div>
  );
}
