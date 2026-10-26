import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../cn";

export type TagTone =
  "neutral" | "easy" | "medium" | "hard" | "ac" | "wa" | "tle" | "info" | "primary" | "signal";

// Tinted pills: soft background + matching 1px border, text in the solid colour.
const tones: Record<TagTone, string> = {
  neutral: "border border-line bg-surface-2 text-ink-2",
  easy: "border border-easy-line bg-easy-soft text-easy",
  medium: "border border-medium-line bg-medium-soft text-medium",
  hard: "border border-hard-line bg-hard-soft text-hard",
  ac: "border border-ok/30 bg-ok-soft text-ok",
  wa: "border border-bad/30 bg-bad-soft text-bad",
  tle: "border border-warn/30 bg-warn-soft text-warn",
  info: "border border-info/30 bg-info-soft text-info",
  primary: "border border-primary/30 bg-primary-soft text-primary",
  signal: "border border-transparent bg-signal text-signal-ink",
};

export type TagProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: TagTone;
  /** Mono type for verdicts, IDs and counts. */
  mono?: boolean;
  /** Leading dot in the current colour (used for difficulty). */
  dot?: boolean;
};

export function Tag({ tone = "neutral", mono, dot, className, children, ...props }: TagProps) {
  return (
    <span
      className={cn(
        "inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-full px-2 text-[11.5px] leading-none font-medium",
        mono && "font-mono text-[11px]",
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

export function DifficultyTag({ difficulty }: { difficulty: keyof typeof difficultyLabel }) {
  return (
    <Tag tone={difficulty} dot>
      {difficultyLabel[difficulty]}
    </Tag>
  );
}

export type ProblemStatus = "solved" | "attempted" | "todo" | "revise";

const STATUS: Record<ProblemStatus, { label: string; tone: TagTone; icon: ReactNode }> = {
  solved: {
    label: "Solved",
    tone: "ac",
    icon: <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />,
  },
  attempted: {
    label: "Attempted",
    tone: "tle",
    icon: <path d="M8 3v5l3 2" />,
  },
  todo: { label: "To do", tone: "neutral", icon: <circle cx="8" cy="8" r="4.5" /> },
  revise: {
    label: "Revise",
    tone: "tle",
    icon: <path d="M3.5 8a4.5 4.5 0 1 0 1.3-3.2M3.5 3v2.5H6" />,
  },
};

/** Solved / Attempted / To do / Revise, each with its own icon and colour. */
export function StatusBadge({ status, className }: { status: ProblemStatus; className?: string }) {
  const s = STATUS[status];
  return (
    <Tag tone={s.tone} mono className={className}>
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
      {s.label}
    </Tag>
  );
}
