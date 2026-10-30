"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ArrowUpRight, Check, Copy, Mail } from "lucide-react";
import { Eyebrow, cardClasses, cn } from "@upsolve/ui";
import { PlayOnView, useScrollProgress } from "./scene-bits";

// "Built by": the two co-founders and how to reach us. The heading lights up word by word
// as you scroll, the cards slide in one after the other and drift at slightly different
// speeds (transform/opacity only). With no JS or reduced motion everything simply shows.

export const CONTACT_EMAIL = "cutubuildlabs@gmail.com";

const FOUNDERS = [
  {
    name: "Sarthak Srivastava",
    initials: "SS",
    linkedin: "https://www.linkedin.com/in/sarthak-srivastava-b99181213",
    /** A square photo in public/team/ (null: the monogram shows instead). */
    photo: "/team/sarthak.webp" as string | null,
  },
  {
    name: "Shourya Pratap Singh Chouhan",
    initials: "SC",
    linkedin: "https://www.linkedin.com/in/shourya-pratap-singh-chouhan-b06294242/",
    photo: "/team/shourya.webp" as string | null,
  },
];

const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/** The heading's words go from faint to full as it scrolls up the screen. */
function ScrollWords({ text, em }: { text: string; em: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useScrollProgress(
    ref,
    (p) => {
      const words = ref.current?.querySelectorAll<HTMLElement>("[data-w]");
      if (!words) return;
      const n = words.length;
      words.forEach((w, i) => {
        const t = reduced() ? 1 : Math.min(1, Math.max(0, p * (n + 2) - i));
        w.style.opacity = (0.18 + 0.82 * t).toFixed(3);
      });
    },
    // From the heading entering at 90% of the screen to it reaching 45%.
    (r, vh) => [r.top - vh * 0.9, vh * 0.45],
  );
  const split = (s: string) => s.split(" ").map((w, i) => ({ w, i }));
  return (
    <h2
      ref={ref}
      id="team-title"
      className="max-w-[16ch] font-display text-[clamp(36px,5.4vw,64px)] leading-[1] tracking-[-0.02em]"
    >
      {split(text).map(({ w, i }) => (
        <span key={`a${i}`} data-w className="text-ink transition-opacity duration-150">
          {w}{" "}
        </span>
      ))}
      <em>
        {split(em).map(({ w, i }) => (
          <span key={`b${i}`} data-w className="transition-opacity duration-150">
            {w}
            {i < em.split(" ").length - 1 ? " " : ""}
          </span>
        ))}
      </em>
    </h2>
  );
}

function LinkedInMark() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z" />
    </svg>
  );
}

function FounderCard({ f, i }: { f: (typeof FOUNDERS)[number]; i: number }) {
  return (
    <div
      data-spotlight
      className={cn(
        cardClasses({ spotlight: true }),
        "group/f flex flex-col gap-6 rounded-[24px] p-6 sm:p-7",
        "transition-[translate,box-shadow,border-color] duration-[var(--dur-slow)] hover:-translate-y-1 hover:border-line-2 hover:shadow-e3",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Monogram under the brand's lime headline bar, which draws in on view. */}
        <span className="relative grid size-16 place-items-center rounded-[18px] border border-line-2 bg-surface-2 font-display text-[28px] tracking-[-0.02em] text-ink sm:size-[72px]">
          <span
            aria-hidden="true"
            className="demo-t absolute -top-[5px] left-2 z-10 h-[4px] w-[calc(100%-16px)] origin-left rounded-full bg-[var(--signal-mark)] armed:scale-x-0"
            style={{ transitionDelay: `${300 + i * 140}ms` }}
          />
          {f.photo ? (
            <Image
              src={f.photo}
              alt={f.name}
              fill
              sizes="72px"
              className="rounded-[17px] object-cover"
            />
          ) : (
            f.initials
          )}
        </span>
        <span className="font-mono text-[11px] tracking-[.1em] text-ink-4 uppercase">0{i + 1}</span>
      </div>
      <div>
        <p className="text-[clamp(20px,2.2vw,24px)] leading-tight font-[650] tracking-[-0.02em] text-ink">
          {f.name}
        </p>
        <p className="mt-1 font-mono text-[11.5px] tracking-[.08em] text-ink-3 uppercase">
          Co-founder · DsaKaro
        </p>
      </div>
      <a
        href={f.linkedin}
        target="_blank"
        rel="noreferrer"
        className="inline-flex w-max items-center gap-2 rounded-full border border-line-2 bg-surface-2 px-4 py-2 text-[13px] font-[600] text-ink transition-[background-color,border-color,transform] duration-[var(--dur-base)] hover:border-[#0a66c2]/60 hover:bg-[#0a66c2]/12 active:scale-[.97]"
      >
        <span className="text-[#2d82d2]">
          <LinkedInMark />
        </span>
        Connect on LinkedIn
        <ArrowUpRight
          size={13}
          aria-hidden="true"
          className="text-ink-3 transition-transform duration-[var(--dur-base)] group-hover/f:translate-x-0.5 group-hover/f:-translate-y-0.5"
        />
      </a>
    </div>
  );
}

function CopyEmail() {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(CONTACT_EMAIL).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        });
      }}
      aria-label={copied ? "Email copied" : "Copy email address"}
      className="grid size-10 shrink-0 place-items-center rounded-full border border-line-2 text-ink-2 transition-[color,background-color,transform] duration-[var(--dur-base)] hover:bg-surface-3 hover:text-ink active:scale-90"
    >
      {copied ? <Check size={15} className="text-success" /> : <Copy size={15} />}
    </button>
  );
}

export function Founders() {
  const grid = useRef<HTMLDivElement>(null);
  // The two cards drift at slightly different speeds while the section scrolls by.
  useScrollProgress(
    grid,
    (p) => {
      const cards = grid.current?.querySelectorAll<HTMLElement>("[data-drift]");
      if (!cards || reduced()) return;
      cards.forEach((c, i) => {
        c.style.transform = `translate3d(0, ${((0.5 - p) * (i === 0 ? 24 : 56)).toFixed(1)}px, 0)`;
      });
    },
    (r, vh) => [r.top - vh, r.height + vh],
  );

  return (
    <section
      id="team"
      aria-labelledby="team-title"
      className="mx-auto w-[min(1200px,100%-32px)] scroll-mt-24 pt-28"
    >
      <div className="mb-10 flex flex-col items-start gap-4 sm:mb-12">
        <Eyebrow>Team</Eyebrow>
        <ScrollWords text="Meet the" em="team." />
      </div>

      <PlayOnView className="flex flex-col gap-3.5">
        <div ref={grid} className="grid gap-3.5 md:grid-cols-2">
          {FOUNDERS.map((f, i) => (
            // Slides in (armed:, see PlayOnView) and drifts (data-drift); the card inside lifts on hover.
            <div
              key={f.name}
              data-drift
              className="demo-t will-change-transform armed:translate-y-10 armed:opacity-0"
              style={{ transitionDelay: `${i * 140}ms` }}
            >
              <FounderCard f={f} i={i} />
            </div>
          ))}
        </div>

        <div
          className="demo-t surface-card flex flex-wrap items-center gap-4 rounded-[24px] p-5 armed:translate-y-6 armed:opacity-0 sm:p-6"
          style={{ transitionDelay: "320ms" }}
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-[14px] bg-[color-mix(in_srgb,var(--signal)_16%,transparent)] text-ink">
            <Mail size={18} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="label-mono">Contact us</p>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="mt-0.5 block truncate text-[clamp(17px,2.4vw,22px)] font-[600] tracking-[-0.01em] text-ink underline decoration-line-3 underline-offset-[6px] transition-colors hover:decoration-[var(--signal-mark)]"
            >
              {CONTACT_EMAIL}
            </a>
            <p className="mt-1 text-12 text-ink-3">
              Feedback, a bug, or DsaKaro for your college: we read everything.
            </p>
          </div>
          <CopyEmail />
        </div>
      </PlayOnView>
    </section>
  );
}

// DsaKaro
