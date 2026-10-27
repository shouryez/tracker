import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../cn";

export type TagTone =
  | "neutral"
  | "easy"
  | "medium"
  | "hard"
  | "ac"
  | "wa"
  | "tle"
  | "ce"
  | "err"
  | "success"
  | "revise"
  | "overdue"
  | "info"
  | "primary"
  | "signal";

// Tinted pills: ~12% fill + 30% border, text in the solid colour.
const tones: Record<TagTone, string> = {
  neutral: "border border-line bg-surface-2 text-ink-2",
  easy: "border border-easy-line bg-easy-soft text-easy",
  medium: "border border-medium-line bg-medium-soft text-medium",
  hard: "border border-hard-line bg-hard-soft text-hard",
  ac: "border border-success-line bg-success-soft text-v-ac",
  success: "border border-success-line bg-success-soft text-success",
  wa: "border border-v-wa/30 bg-v-wa/12 text-v-wa",
  tle: "border border-v-tle/30 bg-v-tle/12 text-v-tle",
  ce: "border border-v-ce/30 bg-v-ce/12 text-v-ce",
  err: "border border-v-err/30 bg-v-err/12 text-v-err",
  revise: "border border-violet-line bg-violet-soft text-violet",
  overdue: "border border-hard-line bg-hard-soft text-overdue",
  info: "border border-info/30 bg-info-soft text-info",
  primary: "border border-primary/30 bg-primary-soft text-primary",
  signal: "border border-transparent bg-signal text-signal-ink",
};

export type TagProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: TagTone;
  /** Mono type for verdicts, IDs and counts. */
  mono?: boolean;
  /** Leading dot in the current colour. */
  dot?: boolean;
};

export function Tag({ tone = "neutral", mono, dot, className, children, ...props }: TagProps) {
  return (
    <span
      className={cn(
        "inline-flex h-[22px] items-center gap-1.5 rounded-full px-2 text-12 leading-none font-[600] whitespace-nowrap",
        mono && "tnum font-mono text-11 font-medium tracking-[.02em]",
        tones[tone],
        className,
      )}
      {...props}
    >
      {dot && <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

const difficultyLabel = { easy: "Easy", medium: "Medium", hard: "Hard" } as const;

/** Easy teal · Medium amber · Hard rose. Tint + border + dot, sans 12/600. */
export function DifficultyTag({
  difficulty,
  className,
}: {
  difficulty: keyof typeof difficultyLabel;
  className?: string;
}) {
  return (
    <Tag tone={difficulty} dot className={className}>
      {difficultyLabel[difficulty]}
    </Tag>
  );
}

export type ProblemStatus = "solved" | "attempted" | "todo" | "revise" | "overdue";

const STATUS: Record<
  ProblemStatus,
  { label: string; tone: TagTone; icon: ReactNode; className?: string }
> = {
  solved: { label: "Solved", tone: "success", icon: <path d="M3.5 8.5 6.5 11.5 12.5 4.5" /> },
  attempted: {
    label: "Attempted",
    tone: "neutral",
    icon: <path d="M8 2.5a5.5 5.5 0 0 1 0 11Z" fill="currentColor" />,
    className: "border-attempted/50 bg-transparent text-attempted",
  },
  todo: { label: "To do", tone: "neutral", icon: <circle cx="8" cy="8" r="4.5" /> },
  revise: {
    label: "Revise",
    tone: "revise",
    icon: <path d="M3.5 8a4.5 4.5 0 1 0 1.3-3.2M3.5 3v2.5H6" />,
  },
  overdue: { label: "Overdue", tone: "overdue", icon: <path d="M8 3.5v5M8 11.5v.5" /> },
};

/** ✓ Solved · ◐ Attempted · ○ To do · ↻ Revise · ! Overdue. Never shares a colour with difficulty. */
export function StatusBadge({
  status,
  label,
  pulse,
  className,
}: {
  status: ProblemStatus;
  /** Override the text, e.g. "Overdue 9d". */
  label?: string;
  /** Soft pulse (use for very overdue). */
  pulse?: boolean;
  className?: string;
}) {
  const s = STATUS[status];
  return (
    <Tag tone={s.tone} className={cn(s.className, className)}>
      <span className={cn("grid place-items-center rounded-full", pulse && "pulse-ring")}>
        <svg
          width="11"
          height="11"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {s.icon}
        </svg>
      </span>
      {label ?? s.label}
    </Tag>
  );
}

export type Verdict = "AC" | "WA" | "TLE" | "MLE" | "RE" | "CE" | "OTHER";
const VERDICT_TONE: Record<Verdict, TagTone> = {
  AC: "ac",
  WA: "wa",
  TLE: "tle",
  MLE: "err",
  RE: "err",
  CE: "ce",
  OTHER: "neutral",
};

/** Compact mono verdict chip: AC green · WA rose · TLE amber · CE grey · MLE/RE orange. */
export function VerdictChip({ verdict, className }: { verdict: Verdict; className?: string }) {
  return (
    <Tag tone={VERDICT_TONE[verdict]} mono className={cn("h-5 px-1.5", className)}>
      {verdict === "OTHER" ? "—" : verdict}
    </Tag>
  );
}

const LEVELS = { basic: 1, core: 2, pro: 3 } as const;

/** Sheet level (Basic / Core / Pro) with a 1–3 bar "signal strength" glyph. */
export function LevelChip({ level, className }: { level: string; className?: string }) {
  const n = LEVELS[level.toLowerCase() as keyof typeof LEVELS] ?? 1;
  return (
    <Tag tone="neutral" className={cn("gap-1.5 font-medium capitalize", className)}>
      <span aria-hidden="true" className="flex h-2.5 items-end gap-[2px]">
        {[1, 2, 3].map((i) => (
          <i
            key={i}
            className={cn(
              "w-[3px] rounded-[1px]",
              i === 1 ? "h-1" : i === 2 ? "h-[7px]" : "h-2.5",
              i <= n ? "bg-ink-2" : "bg-line-3",
            )}
          />
        ))}
      </span>
      {level}
    </Tag>
  );
}

/** "×6" style counter chip. */
export function CounterChip({ n, className }: { n: number; className?: string }) {
  return (
    <Tag tone="neutral" mono className={cn("h-5 px-1.5", className)}>
      ×{n}
    </Tag>
  );
}

/** Verified handle: check + a slow shine. */
export function VerifiedChip({ className }: { className?: string }) {
  return (
    <Tag tone="success" className={cn("sheen h-5 px-1.5 text-11", className)}>
      <svg
        width="10"
        height="10"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
      </svg>
      verified
    </Tag>
  );
}

/** Rose outline + flame: marks the weakest topic. */
export function WeakestChip({ className }: { className?: string }) {
  return (
    <Tag
      tone="overdue"
      mono
      className={cn("h-5 bg-transparent px-1.5 text-[10.5px] uppercase", className)}
    >
      <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <path d="M8 1.5c.6 2.4 3.5 3.9 3.5 7.2a3.5 3.5 0 1 1-7 0c0-1.5.7-2.4 1.5-3 .1 1.2.7 1.9 1.4 2.1C7.2 6 7 3.6 8 1.5Z" />
      </svg>
      weakest
    </Tag>
  );
}
