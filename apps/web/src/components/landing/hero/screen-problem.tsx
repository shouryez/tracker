import type { ReactNode } from "react";
import { Check, Lock, Pause, X } from "lucide-react";
import { DifficultyTag, LogoMark, cn } from "@upsolve/ui";
import type { SceneState } from "./scene";

// A generic problem page (deliberately not any judge's real UI) with the DsaKaro
// extension pill in the corner. Everything is driven by the scene's discrete state; the
// pill's clock text is written straight to [data-part=clock] by the scene.

const CODE: { indent: number; parts: [string, string?][] }[] = [
  { indent: 0, parts: [["def ", "k"], ["minEatingSpeed", "f"], ["(piles, h):"]] },
  { indent: 1, parts: [["lo, hi = "], ["1", "n"], [", "], ["max", "f"], ["(piles)"]] },
  { indent: 1, parts: [["while ", "k"], ["lo < hi:"]] },
  { indent: 2, parts: [["k = (lo + hi) // "], ["2", "n"]] },
  {
    indent: 2,
    parts: [
      ["if ", "k"],
      ["sum", "f"],
      ["(-(-p // k) "],
      ["for ", "k"],
      ["p "],
      ["in ", "k"],
      ["piles) <= h:"],
    ],
  },
  { indent: 3, parts: [["hi = k"]] },
  { indent: 2, parts: [["else", "k"], [":"]] },
  { indent: 3, parts: [["lo = k + "], ["1", "n"]] },
  { indent: 1, parts: [["return ", "k"], ["lo"]] },
];
const TONE: Record<string, string> = { k: "text-primary", f: "text-ink", n: "text-medium" };

export function BrowserChrome({
  tabs,
  active,
  url,
  right,
}: {
  tabs: string[];
  active: number;
  url: string;
  right?: ReactNode;
}) {
  return (
    <div className="shrink-0 bg-surface-3">
      <div className="flex h-[30px] items-end gap-1 px-2">
        <span className="mr-2 mb-[11px] flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <i key={i} className="size-2 rounded-full bg-line-3" />
          ))}
        </span>
        {tabs.map((t, i) => (
          <span
            key={t}
            className={cn(
              "flex h-[24px] w-[190px] items-center truncate rounded-t-[8px] px-3 text-[11px]",
              i === active ? "bg-bg text-ink" : "text-ink-3",
            )}
          >
            {t}
          </span>
        ))}
      </div>
      <div className="flex h-[30px] items-center gap-2 bg-bg px-3">
        <span className="flex h-[20px] flex-1 items-center gap-1.5 rounded-full bg-surface-2 px-3 font-mono text-[10.5px] text-ink-3">
          <Lock size={9} aria-hidden="true" /> {url}
        </span>
        {right}
      </div>
    </div>
  );
}

export function ScreenProblem({ s }: { s: SceneState }) {
  return (
    <div className="lt-ui absolute inset-0 flex flex-col bg-bg text-ink">
      <BrowserChrome
        tabs={["875. Koko Eating Bananas", "New Tab"]}
        active={s.away ? 1 : 0}
        url="…/problems/koko-eating-bananas"
        right={<LogoMark size={14} />}
      />
      <div className="relative min-h-0 flex-1">
        <div
          className={cn(
            "absolute inset-0 grid grid-cols-[1fr_1.3fr] gap-2.5 p-2.5 transition-opacity duration-300",
            s.away && "opacity-0",
          )}
        >
          <section className="flex min-w-0 flex-col gap-2.5 rounded-[10px] border border-line bg-surface p-3.5">
            <span className="text-[16px] font-[600] tracking-[-0.02em]">
              875. Koko Eating Bananas
            </span>
            <span className="flex gap-1.5">
              <DifficultyTag difficulty="medium" />
              <span className="rounded-full bg-surface-3 px-2 py-0.5 text-[10.5px] text-ink-3">
                Binary search
              </span>
            </span>
            {[96, 88, 92, 54].map((w, i) => (
              <i key={i} className="h-[7px] rounded-full bg-surface-3" style={{ width: `${w}%` }} />
            ))}
            <div className="mt-1 rounded-[8px] bg-surface-inset p-2.5 font-mono text-[10.5px] leading-[1.7] text-ink-2">
              <span className="text-ink-3">Input</span> piles = [3,6,7,11], h = 8
              <br />
              <span className="text-ink-3">Output</span> 4
            </div>
            {[90, 70].map((w, i) => (
              <i key={i} className="h-[7px] rounded-full bg-surface-3" style={{ width: `${w}%` }} />
            ))}
          </section>
          <section className="flex min-w-0 flex-col overflow-hidden rounded-[10px] border border-line bg-surface-inset">
            <span className="flex items-center gap-2 border-b border-line px-3 py-1.5 font-mono text-[10px] text-ink-3">
              Python3 <span className="ml-auto">auto-saved</span>
            </span>
            <ol className="flex-1 py-2 font-mono text-[11.5px] leading-[1.85]">
              {CODE.map((line, i) => {
                const bug = i === 5 && !s.fixed && s.lines > 5;
                return (
                  <li
                    key={i}
                    className={cn(
                      "flex whitespace-pre transition-opacity duration-200",
                      i >= s.lines + 1 && "opacity-0",
                      bug &&
                        s.verdict === "wa" &&
                        "bg-[color-mix(in_srgb,var(--hard)_14%,transparent)]",
                      i === 5 &&
                        s.fixed &&
                        s.verdict !== "ac" &&
                        "bg-[color-mix(in_srgb,var(--easy)_12%,transparent)]",
                    )}
                  >
                    <span className="w-8 shrink-0 pr-3 text-right text-ink-4">{i + 1}</span>
                    <span style={{ paddingLeft: `${line.indent * 2}ch` }}>
                      {line.parts.map(([t, tone], k) => (
                        <span key={k} className={tone ? TONE[tone] : "text-ink-2"}>
                          {t}
                        </span>
                      ))}
                      {bug && <span className="text-ink-2"> - </span>}
                      {bug && <span className="text-medium">1</span>}
                    </span>
                  </li>
                );
              })}
            </ol>
            <div className="flex items-center gap-2 border-t border-line px-3 py-2">
              <span
                className={cn(
                  "rounded-[7px] bg-ink px-3 py-1 text-[11px] font-[600] text-bg transition-transform",
                  (s.verdict !== "none" || s.lines >= 8) && "lt-press",
                )}
              >
                Submit
              </span>
              <span className="rounded-[7px] bg-surface-3 px-3 py-1 text-[11px] text-ink-2">
                Run
              </span>
              {s.verdict === "wa" && (
                <span className="lt-pop inline-flex items-center gap-1 rounded-full bg-bad-soft px-2.5 py-1 text-[11px] font-[600] text-bad">
                  <X size={11} aria-hidden="true" /> Wrong Answer · 38/122
                </span>
              )}
              {s.verdict === "ac" && (
                <span
                  data-part="ac-chip"
                  className="lt-pop inline-flex items-center gap-1 rounded-full bg-ok-soft px-2.5 py-1 text-[11px] font-[600] text-ok"
                >
                  <Check size={11} aria-hidden="true" /> Accepted · 31 ms
                </span>
              )}
            </div>
          </section>
        </div>
        <div
          className={cn(
            "absolute inset-0 grid place-items-center transition-opacity duration-300",
            !s.away && "pointer-events-none opacity-0",
          )}
        >
          <span className="h-[30px] w-[46%] rounded-full bg-surface-2" />
        </div>
      </div>
      <ExtensionPill s={s} />
    </div>
  );
}

/** The extension's in-page pill. Always dark, like the real one (Shadow DOM). */
function ExtensionPill({ s }: { s: SceneState }) {
  const running = !s.away && s.verdict !== "ac";
  return (
    <div className="absolute right-3 bottom-3 flex flex-col items-end gap-2 text-white">
      {s.honest !== "none" && (
        <div className="lt-pop rounded-[14px] border border-white/10 bg-[#141417] p-3 shadow-[0_18px_40px_-14px_rgba(0,0,0,.8)]">
          <span className="block text-[11px] text-white/60">Accepted. How did you solve it?</span>
          <span className="mt-2 flex gap-1 rounded-full bg-white/[.06] p-[3px] text-[11px]">
            {["Solo", "Hint", "Saw solution"].map((o) => (
              <span
                key={o}
                className={cn(
                  "rounded-full px-2.5 py-1 transition-colors duration-200",
                  o === "Solo" && s.honest === "solo"
                    ? "bg-white font-[600] text-[#0b0b0f]"
                    : "text-white/70",
                )}
              >
                {o}
              </span>
            ))}
          </span>
        </div>
      )}
      <span className="flex h-[30px] items-center gap-2 rounded-full border border-white/10 bg-[#141417] pr-3 pl-2.5 shadow-[0_10px_30px_-10px_rgba(0,0,0,.8)]">
        {running ? (
          <span className="size-[7px] rounded-full bg-signal shadow-[0_0_8px_var(--signal)]" />
        ) : s.away ? (
          <Pause size={10} className="text-white/60" aria-hidden="true" />
        ) : (
          <Check size={11} className="text-ok" aria-hidden="true" />
        )}
        <span data-part="clock" className="num font-mono text-[13px] tracking-[-0.02em]">
          00:00
        </span>
        {s.away && <span className="text-[10.5px] text-white/55">paused · idle</span>}
      </span>
    </div>
  );
}
