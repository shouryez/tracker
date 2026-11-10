"use client";

import { useState, useTransition } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button, Field } from "@upsolve/ui";
import { addOfflineSession, deleteStudySession, editStudySession } from "@/app/actions/daily";

/** "2026-11-11T21:30" for an instant, in `timeZone` (what a datetime-local input wants). */
function toLocalInput(ms: number, timeZone: string) {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(ms);
  const g = (k: string) => p.find((x) => x.type === k)?.value ?? "00";
  return `${g("year")}-${g("month")}-${g("day")}T${g("hour")}:${g("minute")}`;
}

function SessionForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: { start: string; minutes: number; label: string };
  submitLabel: string;
  onSubmit: (v: {
    start: string;
    minutes: number;
    label: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  onCancel: () => void;
}) {
  const [start, setStart] = useState(initial.start);
  const [minutes, setMinutes] = useState(String(initial.minutes));
  const [label, setLabel] = useState(initial.label);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <form
      className="grid gap-3 sm:grid-cols-[1.4fr_.8fr_1.4fr_auto] sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const r = await onSubmit({ start, minutes: Number(minutes), label });
          if (!r.ok) setError(r.error ?? "Couldn't save that.");
        });
      }}
    >
      <Field
        label="Started"
        type="datetime-local"
        value={start}
        onChange={(e) => setStart(e.target.value)}
        required
      />
      <Field
        label="Minutes"
        type="number"
        min={1}
        max={960}
        inputMode="numeric"
        value={minutes}
        onChange={(e) => setMinutes(e.target.value)}
        required
      />
      <Field
        label="Label"
        placeholder="e.g. Graphs lecture"
        value={label}
        maxLength={80}
        onChange={(e) => setLabel(e.target.value)}
      />
      <div className="flex gap-2">
        <Button type="submit" variant="signal" size="sm" loading={pending}>
          {submitLabel}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
      {error && <p className="text-13 text-bad sm:col-span-4">{error}</p>}
    </form>
  );
}

/** Edit and Delete under a finished session. Deleting asks once, inline (no browser dialog). */
export function SessionEditControls({
  session,
  timeZone,
}: {
  session: { id: string; label: string | null; startedAt: number; focusMs: number };
  timeZone: string;
}) {
  const [mode, setMode] = useState<"idle" | "edit" | "delete">("idle");
  const [pending, startTransition] = useTransition();
  if (mode === "edit") {
    return (
      <div className="mt-3 border-t border-line pt-3 pl-[26px]">
        <SessionForm
          initial={{
            start: toLocalInput(session.startedAt, timeZone),
            minutes: Math.max(1, Math.round(session.focusMs / 60_000)),
            label: session.label ?? "",
          }}
          submitLabel="Save"
          onCancel={() => setMode("idle")}
          onSubmit={async (v) => {
            const r = await editStudySession(session.id, v);
            if (r.ok) {
              setMode("idle");
              toast("Session updated");
            }
            return r;
          }}
        />
      </div>
    );
  }
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3 pl-[26px]">
      {mode === "delete" ? (
        <>
          <span className="text-13 text-ink-2">Delete this session for good?</span>
          <Button
            variant="danger"
            size="sm"
            loading={pending}
            onClick={() =>
              startTransition(async () => {
                const r = await deleteStudySession(session.id);
                if (r.ok) toast("Session deleted");
                else toast(r.error);
                setMode("idle");
              })
            }
          >
            Delete
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setMode("idle")}>
            Keep it
          </Button>
        </>
      ) : (
        <>
          <Button variant="secondary" size="sm" onClick={() => setMode("edit")}>
            <Pencil size={13} aria-hidden="true" /> Edit time
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setMode("delete")}>
            <Trash2 size={13} aria-hidden="true" /> Delete
          </Button>
        </>
      )}
    </div>
  );
}

/** "Add time I studied offline": paper practice, lectures, a book. */
export function AddOfflineSession({ timeZone, now }: { timeZone: string; now: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <Button variant="secondary" size="sm" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Plus size={14} aria-hidden="true" data-nudge="plus" /> Add offline time
      </Button>
      {open && (
        <div className="surface-card absolute top-full right-0 z-30 mt-2 w-[min(680px,calc(100vw-32px))] rounded-[20px] p-4 shadow-e3">
          <p className="mb-3 text-14 font-[600]">Add time you studied away from the computer</p>
          <SessionForm
            initial={{ start: toLocalInput(now - 60 * 60_000, timeZone), minutes: 60, label: "" }}
            submitLabel="Add"
            onCancel={() => setOpen(false)}
            onSubmit={async (v) => {
              const r = await addOfflineSession(v);
              if (r.ok) {
                setOpen(false);
                toast("Offline time added");
              }
              return r;
            }}
          />
        </div>
      )}
    </div>
  );
}
