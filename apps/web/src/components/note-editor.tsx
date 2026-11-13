"use client";

import { useRef, useState, useTransition } from "react";
import { Eye, LayoutTemplate, PenLine } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@upsolve/ui";
import { saveProblemNote } from "@/app/actions/learning";
import { NoteMarkup, hasMarkup } from "@/components/note-markup";
import { feel } from "@/lib/feel";

const TEMPLATE = `Approach:

Complexity: O() time, O() space

Edge cases:

Mistake to remember:
`;

/**
 * Notes for one problem: the trick, the edge case, what to remember. Plain text, with ```
 * code fences, `inline code` and links rendered (FEATURES-PLAN F6). A preview toggle shows
 * up only once the note has any of that.
 */
export function NoteEditor({ problemId, initial }: { problemId: string; initial: string }) {
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [error, setError] = useState(false);
  const [preview, setPreview] = useState(() => Boolean(initial.trim()) && hasMarkup(initial));
  const [pending, startTransition] = useTransition();
  const area = useRef<HTMLTextAreaElement>(null);
  const dirty = value !== saved;
  const markup = hasMarkup(value);
  const showPreview = preview && markup;

  const insertTemplate = () => {
    const next = value.trim() ? `${value.replace(/\s+$/, "")}\n\n${TEMPLATE}` : TEMPLATE;
    setValue(next);
    setPreview(false);
    feel.tick();
    requestAnimationFrame(() => {
      const el = area.current;
      if (!el) return;
      const at = next.length - TEMPLATE.length + "Approach: ".length;
      el.focus();
      el.setSelectionRange(at, at);
    });
  };

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
      {showPreview ? (
        <div
          className="min-h-[148px] rounded-md border border-line-2 bg-surface-2 px-3 py-2.5 text-ink"
          onDoubleClick={() => setPreview(false)}
        >
          <NoteMarkup text={value} className="text-[13.5px]" />
        </div>
      ) : (
        <textarea
          ref={area}
          id="problem-note"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            const before = value.slice(0, e.currentTarget.selectionStart);
            // Inside an open ``` fence, Tab indents instead of leaving the field.
            if (e.key === "Tab" && !e.shiftKey && (before.match(/```/g)?.length ?? 0) % 2 === 1) {
              e.preventDefault();
              const el = e.currentTarget;
              const { selectionStart: s, selectionEnd: end } = el;
              const next = `${value.slice(0, s)}  ${value.slice(end)}`;
              setValue(next);
              requestAnimationFrame(() => el.setSelectionRange(s + 2, s + 2));
            }
          }}
          maxLength={10_000}
          rows={6}
          spellCheck={!/```/.test(value)}
          placeholder={"The key idea, the edge case that got you, the complexity…\n```cpp for code"}
          className="w-full resize-y rounded-md border border-line-2 bg-surface-2 px-3 py-2.5 text-[13.5px] leading-relaxed text-ink placeholder:text-ink-3 focus:border-ink-3 focus:outline-none"
        />
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={insertTemplate}>
          <LayoutTemplate size={13} aria-hidden="true" /> Template
        </Button>
        {markup && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            aria-pressed={showPreview}
            onClick={() => {
              setPreview((v) => !v);
              feel.tick();
            }}
          >
            {showPreview ? (
              <>
                <PenLine size={13} aria-hidden="true" /> Edit
              </>
            ) : (
              <>
                <Eye size={13} aria-hidden="true" /> Preview
              </>
            )}
          </Button>
        )}
        <span className="ml-auto font-mono text-[11px] text-ink-3" aria-live="polite">
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
