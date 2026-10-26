"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button, Switch, cn } from "@upsolve/ui";
import {
  createGroup,
  joinGroup,
  leaveGroup,
  removeMember,
  resetInvite,
  setSocialPrefs,
  type SocialResult,
} from "@/app/actions/social";
import { formatDuration } from "@/lib/format";

const inputClass =
  "h-[38px] min-w-0 flex-1 rounded-full border border-line-2 bg-surface-2 px-3.5 text-[13.5px] text-ink placeholder:text-ink-3 focus:border-ink-3 focus:outline-none";

function useAction() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<SocialResult>) =>
    startTransition(async () => {
      setError(null);
      const res = await fn();
      if (res && !res.ok) setError(res.error);
    });
  return { pending, error, run };
}

export function CreateGroupForm() {
  const [name, setName] = useState("");
  const { pending, error, run } = useAction();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        run(() => createGroup(name));
      }}
      className="flex flex-col gap-2"
    >
      <div className="flex gap-2">
        <label htmlFor="group-name" className="sr-only">
          Group name
        </label>
        <input
          id="group-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          placeholder="e.g. CSE-B grinders"
          className={inputClass}
        />
        <Button
          type="submit"
          size="sm"
          variant="primary"
          disabled={pending || name.trim().length < 2}
        >
          {pending ? "Creating…" : "Create"}
        </Button>
      </div>
      {error && <p className="text-[12.5px] text-bad">{error}</p>}
    </form>
  );
}

export function JoinGroupForm() {
  const [code, setCode] = useState("");
  const { pending, error, run } = useAction();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        run(() => joinGroup(code));
      }}
      className="flex flex-col gap-2"
    >
      <div className="flex gap-2">
        <label htmlFor="invite-code" className="sr-only">
          Invite link or code
        </label>
        <input
          id="invite-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          maxLength={200}
          placeholder="Paste an invite link or code"
          className={inputClass}
        />
        <Button
          type="submit"
          size="sm"
          variant="secondary"
          disabled={pending || code.trim().length < 6}
        >
          {pending ? "Joining…" : "Join"}
        </Button>
      </div>
      {error && <p className="text-[12.5px] text-bad">{error}</p>}
    </form>
  );
}

/** One-click join on the invite page. */
export function JoinButton({ code }: { code: string }) {
  const { pending, error, run } = useAction();
  return (
    <div className="flex flex-col items-start gap-2">
      <Button variant="signal" disabled={pending} onClick={() => run(() => joinGroup(code))}>
        {pending ? "Joining…" : "Join the group"}
      </Button>
      {error && <p className="text-[12.5px] text-bad">{error}</p>}
    </div>
  );
}

export function InviteLink({
  groupId,
  url,
  canReset,
}: {
  groupId: string;
  url: string;
  canReset: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const { pending, error, run } = useAction();
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-full border border-line-2 bg-surface-2 px-3.5 py-2 font-mono text-[12px] text-ink-2">
          {url}
        </code>
        <Button
          size="sm"
          variant="secondary"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              toast.success("Invite link copied");
              setCopied(true);
              setTimeout(() => setCopied(false), 1800);
            } catch {
              // Clipboard blocked: the link is visible to copy by hand.
            }
          }}
        >
          {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      {canReset && (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => resetInvite(groupId))}
          className="inline-flex items-center gap-1.5 self-start font-mono text-[11px] text-ink-3 hover:text-ink"
        >
          <RefreshCw size={11} aria-hidden="true" /> New link (the old one stops working)
        </button>
      )}
      {error && <p className="text-[12.5px] text-bad">{error}</p>}
    </div>
  );
}

/** Asks once more before acting (no browser dialogs). */
function ConfirmButton({
  label,
  confirm,
  onConfirm,
  pending,
}: {
  label: string;
  confirm: string;
  onConfirm: () => void;
  pending: boolean;
}) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => (armed ? onConfirm() : setArmed(true))}
      className={cn(
        "rounded-full px-2.5 py-1 font-mono text-[11px] transition-colors duration-[240ms]",
        armed ? "bg-bad/12 text-bad" : "text-ink-3 hover:text-ink",
      )}
    >
      {armed ? confirm : label}
    </button>
  );
}

export function RemoveMemberButton({ groupId, memberId }: { groupId: string; memberId: string }) {
  const { pending, run } = useAction();
  return (
    <ConfirmButton
      label="Remove"
      confirm="Tap again to remove"
      pending={pending}
      onConfirm={() => run(() => removeMember(groupId, memberId))}
    />
  );
}

export function LeaveGroupButton({ groupId, owner }: { groupId: string; owner: boolean }) {
  const { pending, error, run } = useAction();
  return (
    <span className="inline-flex flex-col items-end gap-1">
      <ConfirmButton
        label="Leave group"
        confirm={owner ? "Leave? Ownership passes on" : "Tap again to leave"}
        pending={pending}
        onConfirm={() => run(() => leaveGroup(groupId))}
      />
      {error && <span className="text-[12px] text-bad">{error}</span>}
    </span>
  );
}

/** Re-renders the page every `seconds` while the tab is visible, so the study room stays live. */
export function AutoRefresh({ seconds = 20 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}

/** A member's running timer: the last reported time plus however long ago it was reported. */
export function LiveClock({
  activeMs,
  ageSeconds,
  running,
}: {
  activeMs: number;
  ageSeconds: number;
  running: boolean;
}) {
  const [base] = useState(() => Date.now());
  const [now, setNow] = useState(base);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running]);
  const ms = activeMs + (running ? ageSeconds * 1000 + (now - base) : 0);
  const s = Math.floor(ms / 1000);
  const clock = `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  return (
    <span className="font-mono text-[12px] tabular-nums" title={formatDuration(ms)}>
      {clock}
    </span>
  );
}

/** On/off switch for a social privacy setting (leaderboard opt-in, live sharing). */
export function PrefSwitch({
  pref,
  initial,
  label,
}: {
  pref: "onLeaderboards" | "shareLive";
  initial: boolean;
  label: string;
}) {
  const [on, setOn] = useState(initial);
  const { pending, error, run } = useAction();
  const router = useRouter();
  return (
    <span className="inline-flex flex-col items-end gap-1">
      <Switch
        checked={on}
        label={label}
        disabled={pending}
        onCheckedChange={(next) => {
          setOn(next);
          run(async () => {
            const res = await setSocialPrefs({ [pref]: next });
            if (!res.ok) setOn(!next);
            else {
              toast.success("Saved");
              router.refresh();
            }
            return res;
          });
        }}
      />
      {error && <span className="max-w-[220px] text-right text-[12px] text-bad">{error}</span>}
    </span>
  );
}
