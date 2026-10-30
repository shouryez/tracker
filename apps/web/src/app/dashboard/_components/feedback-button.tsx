"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { MessageSquarePlus } from "lucide-react";
import { Button, Tooltip, cn, inputClasses } from "@upsolve/ui";
import { sendFeedback } from "@/app/actions/feedback";
import { Modal } from "@/components/fx/overlay";

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

/** Small icon button for the top bar; opens the feedback dialog. Never overlaps content. */
export function FeedbackTrigger({ className }: { className?: string }) {
  return (
    <Tooltip content="Send feedback" side="bottom" className={className}>
      <button
        type="button"
        onClick={() => openFeedback()}
        aria-label="Send feedback"
        className="inline-grid size-[34px] place-items-center rounded-full border border-line-2 bg-surface text-ink-2 transition-[color,border-color,transform] duration-[var(--dur-base)] hover:border-ink-3 hover:text-ink active:scale-95"
      >
        <MessageSquarePlus size={15} strokeWidth={1.75} aria-hidden="true" />
      </button>
    </Tooltip>
  );
}

/** Feedback dialog (beta). Opened by FeedbackTrigger, the palette or the mobile More sheet. */
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
    if (open) textarea.current?.focus();
  }, [open]);

  return (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      title={
        <>
          Help shape <em className="font-display font-normal">DsaKaro.</em>
        </>
      }
      description="Bugs, confusing bits, ideas. Every note gets read."
    >
      <form
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
      >
        <div role="radiogroup" aria-label="Kind" className="mb-3 flex flex-wrap gap-1.5">
          {KINDS.map((k) => (
            <button
              key={k.value}
              type="button"
              role="radio"
              aria-checked={kind === k.value}
              onClick={() => setKind(k.value)}
              className={cn(
                "h-[30px] rounded-full border px-3 text-12 font-[550] transition-colors duration-[var(--dur-base)]",
                kind === k.value
                  ? "border-violet-line bg-violet-soft text-ink"
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
          rows={5}
          placeholder="What happened, or what would you like?"
          className={inputClasses({ className: "h-auto resize-y py-2.5" })}
        />
        <div className="mt-3 flex items-center justify-between gap-2">
          <span
            aria-live="polite"
            className={cn("text-12", status?.ok ? "text-success" : "text-bad")}
          >
            {status?.message}
          </span>
          <Button
            type="submit"
            variant="signal"
            loading={pending}
            disabled={text.trim().length < 3}
          >
            Send
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// DsaKaro
