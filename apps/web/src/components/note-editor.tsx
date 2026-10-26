"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@upsolve/ui";
import { saveProblemNote } from "@/app/actions/learning";

/** Plain-text notes for one problem: the trick, the edge case, what to remember. */
export function NoteEditor({ problemId, initial }: { problemId: string; initial: string }) {
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();
  const dirty = value !== saved;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const res = await saveProblemNote(problemId, value);
          setError(!res.ok);
          if (res.ok) {
            setSaved(value);
            toast.success(value.trim() ? "Note saved" : "Note removed");
          }
        });
      }}
      className="flex flex-col gap-2.5"
    >
      <label htmlFor="problem-note" className="sr-only">
        Your notes
      </label>
      <textarea
        id="problem-note"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        maxLength={10_000}
        rows={6}
        placeholder="The key idea, the edge case that got you, the complexity…"
        className="w-full resize-y rounded-md border border-line-2 bg-surface-2 px-3 py-2.5 text-[13.5px] leading-relaxed text-ink placeholder:text-ink-3 focus:border-ink-3 focus:outline-none"
      />
      <div className="flex items-center justify-end gap-3">
        <span className="font-mono text-[11px] text-ink-3" aria-live="polite">
          {error ? (
            <span className="text-bad">Couldn&apos;t save</span>
          ) : dirty ? (
            "Unsaved"
          ) : saved ? (
            "Saved"
          ) : (
            ""
          )}
        </span>
        <Button type="submit" size="sm" variant="secondary" disabled={!dirty} loading={pending}>
          Save note
        </Button>
      </div>
    </form>
  );
}
