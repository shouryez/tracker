"use client";

import { useState, useTransition } from "react";
import { Bug } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@upsolve/ui";
import { correctFinding } from "@/app/actions/bugs";
import { BUG_CLASSES, type BugClass } from "@/lib/bug-classes";
import type { Finding } from "@/lib/bug-data";

const VERDICT: Record<string, string> = {
  WA: "Wrong answer",
  TLE: "Time limit",
  RE: "Runtime error",
  MLE: "Memory limit",
};
const DATE = new Intl.DateTimeFormat("en", { day: "numeric", month: "short" });

/** A few lines around the bug, the bug's line marked. */
function Snippet({ code, line }: { code: string; line: number }) {
  const lines = code.split("\n");
  const from = Math.max(1, line - 3);
  const to = Math.min(lines.length, line + 3);
  return (
    <pre className="overflow-x-auto rounded-[12px] bg-[color-mix(in_srgb,var(--ink)_6%,transparent)] py-2 font-mono text-[12px] leading-[1.6] shadow-[inset_0_0_0_1px_var(--line)] [scrollbar-width:thin]">
      {lines.slice(from - 1, to).map((l, i) => {
        const n = from + i;
        return (
          <div
            key={n}
            className={cn(
              "flex gap-3 px-3",
              n === line && "bg-[color-mix(in_srgb,var(--bad)_14%,transparent)]",
            )}
          >
            <span className="w-6 shrink-0 text-right text-ink-4 select-none">{n}</span>
            <code className="whitespace-pre">{l || " "}</code>
          </div>
        );
      })}
    </pre>
  );
}

function Io({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="min-w-0">
      <p className="text-[11px] text-ink-3">{label}</p>
      <pre className="max-h-24 overflow-auto rounded-[8px] bg-surface-2 px-2 py-1 font-mono text-[11.5px] whitespace-pre-wrap">
        {value.length > 400 ? `${value.slice(0, 400)}…` : value}
      </pre>
    </div>
  );
}

/** One failed submission's autopsy: the bug class, where, why, and the failing test. */
export function FindingCard({ finding, showTitle }: { finding: Finding; showTitle?: boolean }) {
  const [cls, setCls] = useState<BugClass>(finding.bugClass);
  const [pending, start] = useTransition();
  const meta = BUG_CLASSES[cls];
  return (
    <article className="surface-inset flex flex-col gap-3 rounded-[16px] p-3.5">
      <header className="flex flex-wrap items-center gap-2">
        <span className="grid size-7 place-items-center rounded-full bg-[color-mix(in_srgb,var(--bad)_14%,transparent)] text-bad">
          <Bug size={14} aria-hidden="true" />
        </span>
        <span className="text-14 font-[650]">{meta.label}</span>
        <span className="text-12 text-ink-3">
          {showTitle ? `${finding.title} · ` : ""}
          {VERDICT[finding.verdict] ?? finding.verdict}
          {finding.line ? ` · line ${finding.line}` : ""} · {DATE.format(finding.at)}
        </span>
        <label className="ml-auto flex items-center gap-1.5 text-11 text-ink-3">
          <span className="sr-only sm:not-sr-only">Not right?</span>
          <select
            value={cls}
            disabled={pending}
            onChange={(e) => {
              const next = e.target.value as BugClass;
              setCls(next);
              start(async () => {
                const res = await correctFinding(finding.submissionId, next);
                if (res.ok) toast.success("Bug class updated");
                else {
                  setCls(finding.bugClass);
                  toast.error("Couldn't update it");
                }
              });
            }}
            className="h-7 rounded-[8px] border border-line-2 bg-surface-2 px-1.5 text-12 text-ink"
          >
            {(Object.keys(BUG_CLASSES) as BugClass[]).map((k) => (
              <option key={k} value={k}>
                {BUG_CLASSES[k].label}
              </option>
            ))}
          </select>
        </label>
      </header>
      <p className="text-13 text-ink-2">{finding.explanation}</p>
      {finding.code && finding.line && <Snippet code={finding.code} line={finding.line} />}
      {(finding.failingInput || finding.expected || finding.actual) && (
        <div className="grid gap-2 sm:grid-cols-3">
          <Io label="Failing input" value={finding.failingInput} />
          <Io label="Expected" value={finding.expected} />
          <Io label="Your output" value={finding.actual} />
        </div>
      )}
      <p className="text-12 text-ink-3">
        <span className="font-[600] text-ink-2">Next time:</span> {meta.advice}
      </p>
    </article>
  );
}
