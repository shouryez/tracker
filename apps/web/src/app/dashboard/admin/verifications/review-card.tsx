"use client";

import { useState, useTransition } from "react";
import { Check, TriangleAlert, X } from "lucide-react";
import { toast } from "sonner";
import { Button, Tag, cn, inputClasses } from "@upsolve/ui";
import { reviewCollegeId } from "@/app/actions/verification";
import { TimeAgo } from "@/components/time-ago";
import type { QueueItem } from "@/lib/verification";

/** One upload: the photo, who sent it and for which college, and approve / reject. */
export function ReviewCard({ item, reasons }: { item: QueueItem; reasons: string[] }) {
  const [pending, start] = useTransition();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState(reasons[0] ?? "");
  const [custom, setCustom] = useState("");
  const [zoom, setZoom] = useState(false);

  const decide = (decision: "approve" | "reject") =>
    start(async () => {
      const res = await reviewCollegeId(
        item.id,
        decision,
        decision === "reject" ? custom.trim() || reason : undefined,
      );
      if (res.ok) toast.success(decision === "approve" ? "Verified" : "Rejected");
      else toast.error(res.error);
    });

  return (
    <article className="surface-inset flex flex-col gap-3 rounded-[16px] p-3">
      <button
        type="button"
        onClick={() => setZoom((z) => !z)}
        aria-label={zoom ? "Shrink photo" : "Enlarge photo"}
        className="overflow-hidden rounded-[12px] bg-[#0b0b0f]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- private, uncached admin image */}
        <img
          src={`/api/admin/verifications/${item.id}/image`}
          alt={`College ID uploaded by ${item.name ?? item.handle ?? "a student"}`}
          className={cn(
            "w-full object-contain transition-[max-height] duration-[var(--dur-slow)]",
            zoom ? "max-h-[640px]" : "max-h-64",
          )}
        />
      </button>
      <div className="flex flex-col gap-1">
        <p className="text-15 font-[600]">
          {item.name ?? "No name"}
          {item.handle && (
            <span className="ml-1.5 text-12 font-normal text-ink-3">@{item.handle}</span>
          )}
        </p>
        <p className="text-13 text-ink-2">
          {item.college}
          {item.gradYear ? ` · batch ${item.gradYear}` : ""}
        </p>
        <p className="text-12 text-ink-3">
          {item.email ?? "no email"} · sent <TimeAgo date={new Date(item.submittedAt)} />
        </p>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {item.rejections > 0 && (
            <Tag tone="tle" mono>
              {item.rejections} earlier rejection{item.rejections === 1 ? "" : "s"}
            </Tag>
          )}
          {item.collegeChanged && (
            <Tag tone="wa" mono>
              <TriangleAlert size={11} aria-hidden="true" /> college changed since
            </Tag>
          )}
        </div>
        {item.note && <p className="mt-1 text-13 text-ink-2">&ldquo;{item.note}&rdquo;</p>}
      </div>

      {rejecting ? (
        <div className="flex flex-col gap-2">
          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1 text-12 text-ink-3">Why? The student sees this.</legend>
            {reasons.map((r) => (
              <label key={r} className="flex cursor-pointer items-start gap-2 text-13">
                <input
                  type="radio"
                  name={`reason-${item.id}`}
                  checked={!custom && reason === r}
                  onChange={() => {
                    setReason(r);
                    setCustom("");
                  }}
                  className="mt-1 accent-[var(--violet)]"
                />
                {r}
              </label>
            ))}
          </fieldset>
          <input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            maxLength={240}
            placeholder="Or write your own reason"
            aria-label="Custom reason"
            className={inputClasses({ className: "h-[38px]" })}
          />
          <div className="flex gap-2">
            <Button variant="danger" size="sm" loading={pending} onClick={() => decide("reject")}>
              <X size={14} aria-hidden="true" /> Reject
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setRejecting(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button
            variant="signal"
            size="sm"
            loading={pending}
            disabled={item.collegeChanged}
            onClick={() => decide("approve")}
          >
            <Check size={14} aria-hidden="true" /> Approve
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setRejecting(true)}>
            Reject…
          </Button>
        </div>
      )}
    </article>
  );
}

// DsaKaro
