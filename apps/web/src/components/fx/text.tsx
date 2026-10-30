"use client";

import { useEffect, useRef, type ElementType, type ReactNode } from "react";
import { cn } from "@upsolve/ui";

const GLYPHS = "01<>/{}[]#*+=ACWTLE";

/**
 * "Decoding" text: on first view each character scrambles briefly, then resolves left to
 * right into the real text. Server-renders the real text; reduced motion skips it.
 */
export function DecodeText({
  text,
  className,
  duration = 600,
}: {
  text: string;
  className?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const step = () => {
        const p = Math.min(1, (performance.now() - start) / duration);
        const done = Math.floor(p * text.length);
        el.textContent = [...text]
          .map((ch, i) =>
            i < done || ch === " " || ch === "," || ch === "."
              ? ch
              : GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
          )
          .join("");
        if (p < 1) frame = requestAnimationFrame(step);
        else el.textContent = text;
      };
      frame = requestAnimationFrame(step);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
      el.textContent = text;
    };
  }, [text, duration]);
  return (
    <span ref={ref} className={cn("tnum", className)} aria-label={text}>
      {text}
    </span>
  );
}

/**
 * Headline whose words rise from a blur, staggered. The `accent` words are set in serif
 * italic with a soft glow and a small skew that settles. Pure CSS, runs once on mount.
 * Words never start transparent, so a hero headline still counts as painted for LCP.
 */
export function TextReveal({
  as: Tag = "h1",
  text,
  accent,
  className,
  accentClassName,
  delay = 0,
  id,
}: {
  as?: ElementType;
  id?: string;
  text: string;
  accent?: string;
  className?: string;
  accentClassName?: string;
  delay?: number;
}) {
  const words = text.split(" ").filter(Boolean);
  const accentWords = accent ? accent.split(" ").filter(Boolean) : [];
  let i = 0;
  const word = (w: string, em: boolean): ReactNode => {
    const d = delay + i++ * 70;
    return (
      <span
        key={`${w}-${i}`}
        className={cn(
          "inline-block animate-[word-rise_800ms_var(--ease-out)_backwards] motion-reduce:animate-none",
          em &&
            "font-display font-normal italic [text-shadow:0_0_28px_color-mix(in_srgb,currentColor_35%,transparent)]",
          em && accentClassName,
        )}
        style={{ animationDelay: `${d}ms` }}
      >
        {w}
      </span>
    );
  };
  return (
    <Tag id={id} className={className} aria-label={accent ? `${text} ${accent}` : text}>
      <span aria-hidden="true">
        {words.map((w, idx) => (
          <span key={idx}>{word(w, false)} </span>
        ))}
        {accentWords.map((w, idx) => (
          <span key={`a${idx}`}>
            {word(w, true)}
            {idx < accentWords.length - 1 ? " " : ""}
          </span>
        ))}
      </span>
    </Tag>
  );
}

// DsaKaro
