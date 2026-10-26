"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { MessageSquarePlus, X } from "lucide-react";
import { Button, cn } from "@upsolve/ui";
import { sendFeedback } from "@/app/actions/feedback";

type Kind = "bug" | "confusing" | "idea" | "other";
const KINDS: { value: Kind; label: string }[] = [
  { value: "bug", label: "Something broke" },
  { value: "confusing", label: "Confusing" },
  { value: "idea", label: "Idea / request" },
  { value: "other", label: "Other" },
];

/** Event other components dispatch to open the feedback box with a starting text. */
export const FEEDBACK_EVENT = "upsolve:feedback";
export function openFeedback(detail: { kind?: Kind; text?: string } = {}) {
  window.dispatchEvent(new CustomEvent(FEEDBACK_EVENT, { detail }));
}

/** Floating "Feedback" button on every dashboard page (beta). */
export function FeedbackButton() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind>("idea");
  const [text, setText] = useState("");
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const textarea = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const onOpen = (e: Event) => {
      const d = (e as CustomEvent<{ kind?: Kind; text?: string }>).detail ?? {};
      if (d.kind) setKind(d.kind);
      if (d.text) setText(d.text);
      setStatus(null);
      setOpen(true);
    };
    window.addEventListener(FEEDBACK_EVENT, onOpen);
    return () => window.removeEventListener(FEEDBACK_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    textarea.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="fixed right-4 bottom-4 z-40 flex flex-col items-end gap-2">
      {open && (
        <form
          role="dialog"
          aria-label="Send feedback"
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              const res = await sendFeedback({ kind, message: text, page: pathname });
              if (res.ok) {
                setText("");
                setStatus({ ok: true, message: "Thanks! Every note gets read." });
              } else setStatus({ ok: false, message: res.error });
            });
          }}
          className="w-[min(340px,calc(100vw-32px))] rounded-lg border border-line bg-surface p-4 shadow-card"
        >
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[14px] font-[550]">Help shape Upsolve</p>
            <button
              type="button"
              aria-label="Close"
              onClick={() => setOpen(false)}
              className="text-ink-3 hover:text-ink"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
          <div role="radiogroup" aria-label="Kind" className="mb-2.5 flex flex-wrap gap-1.5">
            {KINDS.map((k) => (
              <button
                key={k.value}
                type="button"
                role="radio"
                aria-checked={kind === k.value}
                onClick={() => setKind(k.value)}
                className={cn(
                  "h-[28px] rounded-full border px-2.5 text-[12px] transition-colors duration-[240ms]",
                  kind === k.value
                    ? "border-transparent bg-ink text-bg"
                    : "border-line-2 text-ink-2 hover:text-ink",
                )}
              >
                {k.label}
              </button>
            ))}
          </div>
          <label htmlFor="feedback-text" className="sr-only">
            Your feedback
          </label>
          <textarea
            id="feedback-text"
            ref={textarea}
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={4000}
            rows={4}
            placeholder="What happened, or what would you like?"
            className="w-full resize-y rounded-md border border-line-2 bg-surface-2 px-3 py-2 text-[13px] text-ink placeholder:text-ink-3 focus:border-ink-3 focus:outline-none"
          />
          <div className="mt-2.5 flex items-center justify-between gap-2">
            <span
              aria-live="polite"
              className={cn("text-[12px]", status?.ok ? "text-ok" : "text-bad")}
            >
              {status?.message}
            </span>
            <Button
              type="submit"
              size="sm"
              variant="primary"
              disabled={pending || text.trim().length < 3}
            >
              {pending ? "Sending…" : "Send"}
            </Button>
          </div>
        </form>
      )}
      <button
        type="button"
        onClick={() => {
          setStatus(null);
          setOpen((o) => !o);
        }}
        aria-expanded={open}
        className="inline-flex h-[38px] items-center gap-2 rounded-full border border-line-2 bg-surface px-3.5 text-[13px] text-ink-2 shadow-card transition-colors duration-[240ms] hover:border-ink-3 hover:text-ink"
      >
        <MessageSquarePlus size={15} strokeWidth={1.75} aria-hidden="true" />
        Feedback
      </button>
    </div>
  );
}
