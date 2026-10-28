"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { BadgeCheck, Clock3, ImagePlus, Lock, RefreshCw, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button, cn, inputClasses } from "@upsolve/ui";
import { submitCollegeId, withdrawCollegeId } from "@/app/actions/verification";
import { TimeAgo } from "@/components/time-ago";
import type { MyVerification } from "@/lib/verification";

/** Longest side after resizing; enough to read a name and a college logo. */
const MAX_SIDE = 1600;

/** Shrinks the photo in the browser (and drops its EXIF data) before it is uploaded. */
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode"))), "image/jpeg", 0.85),
  );
}

/**
 * College ID verification: status, and an uploader for a photo of the ID card.
 * Used in Settings and (optionally) during onboarding.
 */
export function CollegeVerification({
  state,
  compact = false,
}: {
  state: MyVerification;
  compact?: boolean;
}) {
  const [pending, start] = useTransition();
  const [photo, setPhoto] = useState<{ blob: Blob; url: string } | null>(null);
  const [note, setNote] = useState("");
  const [replacing, setReplacing] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const latest = state.latest;

  useEffect(() => () => void (photo && URL.revokeObjectURL(photo.url)), [photo]);

  async function choose(file: File | undefined) {
    if (!file) return;
    try {
      const blob = await shrink(file);
      setPhoto({ blob, url: URL.createObjectURL(blob) });
    } catch {
      toast.error(
        "Couldn't read that photo. Use a JPG or PNG (on iPhone: Camera › Formats › Most Compatible).",
      );
    }
  }

  function submit() {
    if (!photo) return;
    const form = new FormData();
    form.set("photo", new File([photo.blob], "college-id.jpg", { type: "image/jpeg" }));
    form.set("note", note);
    start(async () => {
      const res = await submitCollegeId(form);
      if (res.ok) {
        toast.success("Sent for review. We'll verify it soon.");
        setPhoto(null);
        setNote("");
        setReplacing(false);
      } else toast.error(res.error);
    });
  }

  if (!state.college) {
    return (
      <p className="text-13 text-ink-2">
        Add your college to your profile first.{" "}
        <Link href="/onboarding" className="text-ink underline">
          Edit profile
        </Link>
      </p>
    );
  }

  if (state.verifiedAt) {
    return (
      <div className="flex items-center gap-3 rounded-[14px] border border-violet-line bg-violet-soft px-4 py-3">
        <BadgeCheck size={22} className="shrink-0 text-violet" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-14 font-[600]">Verified student of {state.college.name}</p>
          <p className="text-12 text-ink-3">
            Verified <TimeAgo date={new Date(state.verifiedAt)} />. Changing your college on your
            profile will need a new check.
          </p>
        </div>
      </div>
    );
  }

  const waiting = latest?.status === "pending" && !replacing;
  const uploader = (
    <div className="flex flex-col gap-3">
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        className="sr-only"
        aria-label="Photo of your college ID"
        onChange={(e) => {
          void choose(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {photo ? (
        <div className="surface-inset flex flex-col gap-3 rounded-[16px] p-3 sm:flex-row sm:items-start">
          {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
          <img
            src={photo.url}
            alt="Your college ID, ready to send"
            className="max-h-48 w-full rounded-[10px] object-contain sm:w-64"
          />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={200}
              placeholder="Anything we should know? (optional)"
              aria-label="Note for the reviewer"
              className={inputClasses({ className: "h-[38px]" })}
            />
            <div className="flex flex-wrap gap-2">
              <Button variant="signal" size="sm" loading={pending} onClick={submit}>
                Send for review
              </Button>
              <Button variant="ghost" size="sm" onClick={() => input.current?.click()}>
                <RefreshCw size={14} aria-hidden="true" /> Different photo
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => input.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            void choose(e.dataTransfer.files[0]);
          }}
          className={cn(
            "group flex flex-col items-center gap-2 rounded-[16px] border-2 border-dashed border-line-2 px-4 text-center transition-colors hover:border-violet-line hover:bg-violet-soft/40",
            compact ? "py-5" : "py-7",
          )}
        >
          <span className="grid size-11 place-items-center rounded-full bg-surface-3 text-ink-2 transition-transform group-hover:scale-105">
            <ImagePlus size={20} aria-hidden="true" />
          </span>
          <span className="text-14 font-[600]">Upload a photo of your college ID</span>
          <span className="text-12 text-ink-3">
            Front side, name and college clearly visible · JPG or PNG
          </span>
        </button>
      )}
      <p className="flex items-start gap-1.5 text-12 text-ink-3">
        <Lock size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
        Only DsaKaro admins see it, and it&apos;s deleted as soon as it&apos;s reviewed. Feel free
        to cover your roll number, date of birth or address.
      </p>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      {!compact && (
        <p className="text-13 text-ink-2">
          Verified students get a badge on college and batch boards and their public profile, so
          everyone knows the rankings are real.
        </p>
      )}
      {waiting ? (
        <div className="flex flex-wrap items-center gap-3 rounded-[14px] border border-medium-line bg-medium-soft px-4 py-3">
          <Clock3 size={20} className="shrink-0 text-medium" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-14 font-[600]">Under review</p>
            <p className="text-12 text-ink-3">
              Sent <TimeAgo date={new Date(latest.submittedAt)} /> for {state.college.name}. Usually
              checked within a day.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setReplacing(true)}>
              Replace photo
            </Button>
            <Button
              variant="ghost"
              size="sm"
              loading={pending}
              onClick={() =>
                start(async () => {
                  const res = await withdrawCollegeId();
                  if (res.ok) toast.success("Withdrawn. Your photo was deleted.");
                  else toast.error(res.error);
                })
              }
            >
              Withdraw
            </Button>
          </div>
        </div>
      ) : (
        <>
          {latest?.status === "rejected" && (
            <div className="flex items-start gap-3 rounded-[14px] border border-bad/30 bg-bad-soft px-4 py-3">
              <TriangleAlert size={18} className="mt-0.5 shrink-0 text-bad" aria-hidden="true" />
              <div>
                <p className="text-14 font-[600]">Last photo wasn&apos;t accepted</p>
                <p className="text-13 text-ink-2">{latest.reason}</p>
              </div>
            </div>
          )}
          {uploader}
        </>
      )}
    </div>
  );
}
