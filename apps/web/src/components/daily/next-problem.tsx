"use client";

import { useEffect, useState, useTransition } from "react";
import { ArrowUpRight, CalendarPlus, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button, ButtonArrow, DifficultyTag, Spinner, Tag } from "@upsolve/ui";
import { addProblemsToPlan, pickNextProblem, type NextPick } from "@/app/actions/daily";
import { Modal } from "@/components/fx/overlay";

/** Other components open the picker with this event (command palette, Today page). */
export const NEXT_EVENT = "upsolve:next";
export function openNextPicker() {
  window.dispatchEvent(new Event(NEXT_EVENT));
}

/** Opens the picker mounted in the dashboard layout. */
export function NextProblemButton() {
  return (
    <Button variant="secondary" size="sm" onClick={openNextPicker}>
      <Sparkles size={14} aria-hidden="true" /> What next?
    </Button>
  );
}

/** "What should I solve next?": the single best problem, and why. Mounted once per layout. */
export function NextProblemPicker() {
  const [open, setOpen] = useState(false);
  const [pick, setPick] = useState<NextPick | null | undefined>(undefined);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [pending, start] = useTransition();

  const load = (skip: string[]) =>
    start(async () => {
      setPick(await pickNextProblem(skip));
    });

  useEffect(() => {
    const onOpen = () => {
      setOpen(true);
      setSkipped([]);
      setPick(undefined);
      load([]);
    };
    window.addEventListener(NEXT_EVENT, onOpen);
    return () => window.removeEventListener(NEXT_EVENT, onOpen);
  }, []);

  return (
    <>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={
          <>
            Solve this <em className="font-display font-normal">next.</em>
          </>
        }
        description="Picked from your sheets, aimed at your weakest topic, one step above your comfort level."
      >
        {pick === undefined || (pending && !pick) ? (
          <div className="grid h-40 place-items-center text-ink-3">
            <Spinner />
          </div>
        ) : pick === null ? (
          <p className="py-6 text-center text-14 text-ink-2">
            Nothing to suggest yet. Follow a sheet and solve a few problems first.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="surface-inset rounded-[16px] p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                {pick.difficulty && <DifficultyTag difficulty={pick.difficulty} />}
                <Tag>{pick.topic}</Tag>
              </div>
              <p className="text-20 leading-snug font-[600]">{pick.title}</p>
              <p className="mt-2 flex items-center gap-1.5 text-13 text-ink-2">
                <Sparkles size={13} aria-hidden="true" className="text-signal-text" />
                {pick.reason} · from {pick.sheet}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {pick.url && (
                <a
                  href={pick.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-[42px] flex-1 items-center justify-center gap-2 rounded-full bg-signal px-[18px] text-14 font-[550] text-signal-ink transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-glow-signal"
                >
                  Solve it <ArrowUpRight size={15} aria-hidden="true" />
                </a>
              )}
              <Button
                variant="secondary"
                onClick={() =>
                  start(async () => {
                    const res = await addProblemsToPlan([pick.problemId], "custom");
                    if (res.ok) toast.success("Added to today");
                    else toast.error(res.error);
                  })
                }
              >
                <CalendarPlus size={15} aria-hidden="true" /> Add to today
              </Button>
              <Button
                variant="ghost"
                loading={pending}
                onClick={() => {
                  const next = [...skipped, pick.problemId];
                  setSkipped(next);
                  load(next);
                }}
              >
                <RefreshCw size={14} data-nudge="spin" aria-hidden="true" /> Another
              </Button>
            </div>
            <p className="text-11 text-ink-3">
              Not feeling it? &ldquo;Another&rdquo; skips it for now <ButtonArrow />
            </p>
          </div>
        )}
      </Modal>
    </>
  );
}

// DsaKaro
