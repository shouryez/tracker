"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ClipboardPaste, Copy, MoreHorizontal, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button, CheckDraw, Switch, cn, inputClasses } from "@upsolve/ui";
import {
  createGroup,
  deleteGroup,
  joinGroup,
  leaveGroup,
  removeMember,
  renameGroup,
  resetInvite,
  setMemberRole,
  setSocialPrefs,
  transferOwnership,
  type SocialResult,
} from "@/app/actions/social";
import { formatDuration } from "@/lib/format";

const inputClass = inputClasses({ className: "min-w-0 flex-1 rounded-full" });
const SUGGESTED = ["CSE-B grinders", "Hostel night owls", "Coding club", "Placement prep"];

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
        <Button type="submit" variant="signal" loading={pending} disabled={name.trim().length < 2}>
          Create
        </Button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {SUGGESTED.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setName(n)}
            className="h-7 rounded-full border border-line-2 px-2.5 text-12 text-ink-2 transition-colors hover:border-line-3 hover:bg-surface-2 hover:text-ink"
          >
            {n}
          </button>
        ))}
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
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Paste from clipboard"
          title="Paste from clipboard"
          onClick={async () => {
            try {
              setCode((await navigator.clipboard.readText()).trim());
            } catch {
              // Clipboard blocked: paste by hand.
            }
          }}
        >
          <ClipboardPaste size={15} aria-hidden="true" />
        </Button>
        <Button
          type="submit"
          variant="secondary"
          loading={pending}
          disabled={code.trim().length < 6}
        >
          Join
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
      <Button
        variant="signal"
        size="lg"
        loading={pending}
        onClick={() => run(() => joinGroup(code))}
      >
        Join the group
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
        <code className="min-w-0 flex-1 truncate rounded-full border border-line-2 bg-surface-inset px-3.5 py-2.5 font-mono text-12 text-ink-2 shadow-inset">
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
          {copied ? (
            <CheckDraw size={14} className="text-success" />
          ) : (
            <Copy size={14} aria-hidden="true" />
          )}
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
        "rounded-full px-3 py-1.5 text-12 font-[550] transition-colors duration-[var(--dur-base)]",
        armed
          ? "bg-bad/15 text-bad ring-1 ring-bad/40"
          : "text-ink-3 hover:bg-surface-2 hover:text-ink",
      )}
    >
      {armed ? confirm : label}
    </button>
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

type Role = "owner" | "admin" | "member";

/**
 * The "..." menu beside a member: what the viewer may do to them, by role (owner > admin >
 * member, like WhatsApp). Remove and Make owner ask once more.
 */
export function MemberMenu({
  groupId,
  member,
  viewerRole,
  self,
}: {
  groupId: string;
  member: { userId: string; name: string; role: Role };
  viewerRole: Role;
  self: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [armed, setArmed] = useState<"remove" | "owner" | null>(null);
  const { pending, error, run } = useAction();
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent | KeyboardEvent) => {
      if (
        e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.contains(e.target as Node)
      ) {
        setOpen(false);
        setArmed(null);
      }
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const owner = viewerRole === "owner";
  const manager = owner || viewerRole === "admin";
  const items: {
    key: string;
    label: string;
    danger?: boolean;
    act: () => Promise<SocialResult>;
  }[] = [];
  if (self) {
    if (member.role === "admin")
      items.push({
        key: "step-down",
        label: "Step down as admin",
        act: () => setMemberRole(groupId, member.userId, "member"),
      });
  } else if (member.role !== "owner") {
    if (manager && member.role === "member")
      items.push({
        key: "admin",
        label: "Make group admin",
        act: () => setMemberRole(groupId, member.userId, "admin"),
      });
    if (owner && member.role === "admin")
      items.push({
        key: "dismiss",
        label: "Dismiss as admin",
        act: () => setMemberRole(groupId, member.userId, "member"),
      });
    if (owner)
      items.push({
        key: "owner",
        label: armed === "owner" ? "Tap again: they become owner" : "Make group owner",
        act: () => transferOwnership(groupId, member.userId),
      });
    if (owner || (manager && member.role === "member"))
      items.push({
        key: "remove",
        label: armed === "remove" ? `Tap again to remove ${member.name}` : "Remove from group",
        danger: true,
        act: () => removeMember(groupId, member.userId),
      });
  }
  if (items.length === 0) return null;

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-label={`Options for ${member.name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={pending}
        onClick={() => {
          setOpen((o) => !o);
          setArmed(null);
        }}
        className="grid size-8 place-items-center rounded-full text-ink-3 transition-colors hover:bg-surface-3 hover:text-ink"
      >
        <MoreHorizontal size={16} aria-hidden="true" />
      </button>
      {open && (
        <div
          role="menu"
          className="glass absolute top-full right-0 z-50 mt-1 w-60 origin-top-right animate-[pop-open_var(--dur-base)_var(--ease-out)] rounded-[14px] border border-line-2 p-1.5 shadow-e3"
        >
          {items.map((it) => (
            <button
              key={it.key}
              type="button"
              role="menuitem"
              disabled={pending}
              onClick={() => {
                const needsConfirm = it.key === "remove" || it.key === "owner";
                if (needsConfirm && armed !== it.key) return setArmed(it.key as "remove" | "owner");
                setOpen(false);
                setArmed(null);
                run(it.act);
              }}
              className={cn(
                "block w-full rounded-[10px] px-3 py-2 text-left text-13 font-[550] transition-colors",
                it.danger ? "text-bad hover:bg-bad-soft" : "text-ink hover:bg-surface-3",
                armed === it.key && "bg-bad-soft",
              )}
            >
              {it.label}
            </button>
          ))}
        </div>
      )}
      {error && (
        <p className="absolute top-full right-0 mt-1 w-56 text-right text-[12px] text-bad">
          {error}
        </p>
      )}
    </div>
  );
}

/** Group settings for the owner and admins: rename, and delete for everyone. */
export function GroupSettings({ groupId, name }: { groupId: string; name: string }) {
  const [value, setValue] = useState(name);
  const [confirm, setConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const rename = useAction();
  const del = useAction();
  return (
    <div className="flex flex-col gap-5">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          rename.run(async () => {
            const res = await renameGroup(groupId, value);
            if (res.ok) toast.success("Group renamed");
            return res;
          });
        }}
        className="flex flex-col gap-1.5"
      >
        <label htmlFor="group-rename" className="label-mono">
          Group name
        </label>
        <div className="flex gap-2">
          <input
            id="group-rename"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            maxLength={40}
            className={inputClass}
          />
          <Button
            type="submit"
            variant="secondary"
            size="sm"
            loading={rename.pending}
            disabled={value.trim().length < 2 || value.trim() === name}
          >
            Save
          </Button>
        </div>
        {rename.error && <p className="text-[12.5px] text-bad">{rename.error}</p>}
      </form>

      <div className="rounded-[14px] border border-bad/30 bg-bad-soft p-3.5">
        <p className="text-13 font-[600] text-ink">Delete group</p>
        <p className="mt-0.5 text-12 text-ink-2">
          Removes it for everyone, with its board, shared problems and nudges. This can&apos;t be
          undone.
        </p>
        {deleting ? (
          <div className="mt-3 flex flex-col gap-2">
            <label htmlFor="group-delete" className="text-12 text-ink-2">
              Type <span className="font-[600] text-ink">{name}</span> to confirm
            </label>
            <div className="flex flex-wrap gap-2">
              <input
                id="group-delete"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="off"
                className={inputClass}
              />
              <Button
                variant="danger"
                size="sm"
                loading={del.pending}
                disabled={confirm.trim() !== name}
                onClick={() => del.run(() => deleteGroup(groupId, confirm))}
              >
                Delete for everyone
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={del.pending}
                onClick={() => {
                  setDeleting(false);
                  setConfirm("");
                }}
              >
                Cancel
              </Button>
            </div>
            {del.error && <p className="text-[12.5px] text-bad">{del.error}</p>}
          </div>
        ) : (
          <Button variant="danger" size="sm" className="mt-3" onClick={() => setDeleting(true)}>
            <Trash2 size={13} aria-hidden="true" /> Delete group
          </Button>
        )}
      </div>
    </div>
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
    <span
      className="tnum rounded-full bg-signal-soft px-2 py-0.5 font-mono text-12 text-signal-text"
      title={formatDuration(ms)}
    >
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
