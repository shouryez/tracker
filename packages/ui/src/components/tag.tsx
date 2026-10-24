import type { HTMLAttributes } from "react";
import { cn } from "../cn";

export type TagTone = "neutral" | "easy" | "medium" | "hard" | "ac" | "wa" | "tle" | "signal";

const tones: Record<TagTone, string> = {
  neutral: "border border-line bg-surface-2 text-ink-2",
  easy: "bg-easy/12 text-easy",
  medium: "bg-medium/12 text-medium",
  hard: "bg-hard/12 text-hard",
  ac: "bg-ok/12 text-ok",
  wa: "bg-bad/12 text-bad",
  tle: "bg-warn/12 text-warn",
  signal: "bg-signal text-signal-ink",
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
