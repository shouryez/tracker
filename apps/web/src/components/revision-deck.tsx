"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  type CSSProperties,
  type PointerEvent as RPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { ArrowLeft, ArrowRight, ArrowUp, ExternalLink, Layers, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button, DifficultyTag, Kbd, Tag, cn } from "@upsolve/ui";
import { logReview, undoReview, type ReviewActionName } from "@/app/actions/learning";
import { burst } from "@/components/dashboard/celebrate";
import { Modal } from "@/components/fx/overlay";
import { SignalType } from "@/components/fx/signal-type";
import { feel } from "@/lib/feel";

export type DeckCard = {
  problemId: string;
  title: string;
  url: string;
  difficulty: "easy" | "medium" | "hard" | null;
  topics: string[];
  rung: number;
  due: string;
  overdueDays: number;
  lastSolved: string;
};

type Grade = Extract<ReviewActionName, "remembered" | "shaky" | "forgot">;

const GRADES: Record<Grade, { label: string; hint: string; tone: string; key: string }> = {
  forgot: { label: "Forgot", hint: "Back tomorrow", tone: "var(--bad)", key: "←" },
  shaky: { label: "Shaky", hint: "Same gap again", tone: "var(--amber)", key: "↑" },
  remembered: { label: "Remembered", hint: "Moves out a ring", tone: "var(--signal)", key: "→" },
};

/** Distance (px) a card must travel to count as a swipe. */
const THROW = 110;

/** Which grade a drag offset points at, and how sure (0–1). */
function aim(x: number, y: number): { grade: Grade | null; amount: number } {
  if (-y > Math.abs(x) && -y > 24) return { grade: "shaky", amount: Math.min(1, -y / THROW) };
  if (Math.abs(x) > 24)
    return { grade: x > 0 ? "remembered" : "forgot", amount: Math.min(1, Math.abs(x) / THROW) };
  return { grade: null, amount: 0 };
}

function reviewUrl(url: string) {
  const u = new URL(url);
  u.searchParams.set("upsolve", "review");
  return u.toString();
}

/**
 * "Swipe through": today's due problems as a deck of cards. Flick right if you remembered the
 * approach, left if you forgot, up if it was shaky (or use the arrow keys / buttons). Every
 * grade is a real review, and Undo puts the card back on top.
 */
export function RevisionDeck({ cards }: { cards: DeckCard[] }) {
  const router = useRouter();
  // ?deck=1 (from the command palette) opens it straight away.
  const params = useSearchParams();
  const [open, setOpen] = useState(() => params.get("deck") === "1");
  const [graded, setGraded] = useState(0);
  if (cards.length === 0) return null;
  return (
    <>
      <Button
        variant="secondary"
        onClick={() => {
          feel.tick();
          setOpen(true);
        }}
      >
        <Layers size={14} aria-hidden="true" /> Swipe through {cards.length}
      </Button>
      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          if (graded) router.refresh();
        }}
        title="Swipe through today's revisions"
        description="Right if you remembered the approach, left if you forgot, up if it was shaky."
        className="max-w-[520px]"
      >
        {open && <Deck cards={cards} onGraded={(n) => setGraded(n)} />}
      </Modal>
    </>
  );
}

function Deck({ cards, onGraded }: { cards: DeckCard[]; onGraded: (n: number) => void }) {
  const [index, setIndex] = useState(0);
  const [history, setHistory] = useState<{ card: DeckCard; grade: Grade }[]>([]);
  const [drag, setDrag] = useState({ x: 0, y: 0, active: false });
  const [flying, setFlying] = useState<{ grade: Grade; x: number; y: number } | null>(null);
  // Consecutive "remembered": each one chimes a semitone higher.
  const combo = useRef(0);
  const start = useRef({ x: 0, y: 0, t: 0 });
  const top = cards[index];
  const done = index >= cards.length;

  const commit = useCallback(
    (grade: Grade, from = { x: 0, y: 0 }) => {
      const card = cards[index];
      if (!card || flying) return;
      // Fly out in the swipe's direction, then reveal the next card.
      const out =
        grade === "shaky"
          ? { x: from.x * 0.4, y: -520 }
          : { x: (grade === "remembered" ? 1 : -1) * 560, y: from.y * 1.2 };
      setFlying({ grade, ...out });
      feel.whoosh();
      if (grade === "remembered") feel.combo((combo.current += 1));
      else {
        combo.current = 0;
        if (grade === "forgot") feel.soft();
        else feel.tick();
      }
      window.setTimeout(() => {
        setFlying(null);
        setDrag({ x: 0, y: 0, active: false });
        setHistory((h) => [...h, { card, grade }]);
        setIndex((i) => {
          const next = i + 1;
          onGraded(next);
          if (next >= cards.length) void burst();
          return next;
        });
      }, 260);
      logReview(card.problemId, grade).catch(() =>
        toast.error(`Couldn't save ${card.title}. Try again.`),
      );
    },
    [cards, index, flying, onGraded],
  );

  const undo = useCallback(() => {
    const last = history.at(-1);
    if (!last || flying) return;
    feel.tick();
    combo.current = 0;
    void undoReview(last.card.problemId, last.grade);
    setHistory((h) => h.slice(0, -1));
    setIndex((i) => {
      onGraded(i - 1);
      return i - 1;
    });
  }, [history, flying, onGraded]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowRight") commit("remembered");
      else if (e.key === "ArrowLeft") commit("forgot");
      else if (e.key === "ArrowUp") commit("shaky");
      else if (e.key.toLowerCase() === "z" || e.key === "Backspace") undo();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [commit, undo]);

  const onDown = (e: RPointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("a,button") || flying) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = { x: e.clientX, y: e.clientY, t: performance.now() };
    setDrag({ x: 0, y: 0, active: true });
  };
  const onMove = (e: RPointerEvent<HTMLDivElement>) => {
    if (!drag.active) return;
    setDrag({ x: e.clientX - start.current.x, y: e.clientY - start.current.y, active: true });
  };
  const onUp = () => {
    if (!drag.active) return;
    const dt = Math.max(1, performance.now() - start.current.t);
    const { grade, amount } = aim(drag.x, drag.y);
    // A quick flick counts even if it's short.
    const fast = Math.hypot(drag.x, drag.y) / dt > 0.6;
    if (grade && (amount >= 1 || fast)) commit(grade, drag);
    else setDrag({ x: 0, y: 0, active: false });
  };

  const live = flying ?? drag;
  const { grade: pointing, amount } = flying
    ? { grade: flying.grade, amount: 1 }
    : aim(drag.x, drag.y);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between text-13 text-ink-3">
        <span className="tnum">
          {Math.min(index + 1, cards.length)} of {cards.length}
        </span>
        <div className="flex h-1.5 flex-1 mx-4 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--ink)_8%,transparent)]">
          {history.map((h, i) => (
            <span
              key={i}
              className="h-full transition-[width] duration-300"
              style={{ width: `${100 / cards.length}%`, background: GRADES[h.grade].tone }}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={undo}
          disabled={history.length === 0}
          className="inline-flex items-center gap-1 rounded-full px-2 py-1 font-[600] text-ink-2 hover:text-ink disabled:opacity-40"
        >
          <Undo2 size={13} aria-hidden="true" /> Undo
        </button>
      </div>

      <div className="relative h-[300px] touch-none select-none [perspective:1200px]">
        {done ? (
          <div className="grid h-full place-items-center rounded-[24px] border border-dashed border-line-2 text-center">
            <div className="flex flex-col items-center gap-2 px-6">
              <SignalType
                as="p"
                text="Deck cleared."
                trigger="mount"
                glowColor="var(--signal)"
                interference={0}
                clickCycle={false}
                className="font-display text-[34px] leading-none"
              />
              <p className="text-14 text-ink-2">
                {history.filter((h) => h.grade === "remembered").length} remembered ·{" "}
                {history.filter((h) => h.grade === "shaky").length} shaky ·{" "}
                {history.filter((h) => h.grade === "forgot").length} back tomorrow
              </p>
            </div>
          </div>
        ) : (
          cards.slice(index, index + 3).map((c, k) => {
            const isTop = k === 0;
            const style = isTop
              ? {
                  transform: `translate(${live.x}px, ${live.y}px) rotate(${live.x / 18}deg)`,
                  transition: drag.active ? "none" : "transform 260ms cubic-bezier(.2,.8,.2,1)",
                  zIndex: 3,
                }
              : {
                  // Cards behind rise into place as the top one leaves.
                  transform: `translateY(${(k - Math.min(1, amount) * 0.9) * 14}px) scale(${1 - (k - Math.min(1, amount) * 0.9) * 0.05})`,
                  transition: "transform 260ms cubic-bezier(.2,.8,.2,1)",
                  zIndex: 3 - k,
                  opacity: k === 2 ? 0.6 : 1,
                };
            return (
              <div
                key={c.problemId}
                aria-hidden={!isTop}
                data-cursor={isTop ? "grab" : undefined}
                onPointerDown={isTop ? onDown : undefined}
                onPointerMove={isTop ? onMove : undefined}
                onPointerUp={isTop ? onUp : undefined}
                onPointerCancel={isTop ? onUp : undefined}
                className={cn(
                  "surface-card absolute inset-0 flex flex-col justify-between overflow-hidden rounded-[24px] p-6",
                  isTop && "cursor-grab active:cursor-grabbing",
                )}
                style={style}
              >
                {isTop && pointing && (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 rounded-[inherit]"
                    style={{
                      opacity: amount * 0.9,
                      background: `radial-gradient(120% 90% at ${pointing === "remembered" ? "100% 50%" : pointing === "forgot" ? "0% 50%" : "50% 0%"}, color-mix(in srgb, ${GRADES[pointing].tone} 28%, transparent), transparent 70%)`,
                    }}
                  />
                )}
                {isTop && pointing && (
                  <span
                    className="absolute top-5 rounded-[10px] border-2 px-3 py-1 font-display text-[22px] font-[650]"
                    style={{
                      color: GRADES[pointing].tone,
                      borderColor: GRADES[pointing].tone,
                      opacity: amount,
                      ...(pointing === "remembered"
                        ? { left: 20, rotate: "-10deg" }
                        : pointing === "forgot"
                          ? { right: 20, rotate: "10deg" }
                          : { left: "50%", translate: "-50% 0" }),
                    }}
                  >
                    {GRADES[pointing].label}
                  </span>
                )}
                <div className="relative flex items-center gap-2 text-12 text-ink-3">
                  <span className="tnum rounded-full bg-[color-mix(in_srgb,var(--ink)_6%,transparent)] px-2.5 py-1 font-[600] text-ink-2">
                    Ring {c.rung}
                  </span>
                  <span className={cn(c.overdueDays > 0 && "text-bad")}>{c.due}</span>
                </div>
                <div className="relative">
                  <p className="font-display text-[clamp(24px,5vw,32px)] leading-[1.08] text-balance">
                    {c.title}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    {c.difficulty && <DifficultyTag difficulty={c.difficulty} />}
                    {c.topics.map((t) => (
                      <Tag key={t} className="h-6 px-2 text-12">
                        {t}
                      </Tag>
                    ))}
                  </div>
                </div>
                <div className="relative flex items-center justify-between gap-3 text-13 text-ink-3">
                  <span>Last solved {c.lastSolved}</span>
                  <a
                    href={reviewUrl(c.url)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-[600] text-ink-2 hover:text-ink"
                  >
                    Re-solve <ExternalLink size={12} aria-hidden="true" />
                  </a>
                </div>
              </div>
            );
          })
        )}
      </div>

      {!done && top && (
        <div className="grid grid-cols-3 gap-2">
          {(["forgot", "shaky", "remembered"] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => commit(g)}
              className="group flex flex-col items-center gap-1 rounded-[16px] px-2 py-3 text-13 font-[600] shadow-[inset_0_0_0_1px_var(--line-2)] transition-[background-color,box-shadow] hover:shadow-[inset_0_0_0_1px_var(--tone)]"
              style={{ "--tone": GRADES[g].tone } as CSSProperties}
            >
              <span className="flex items-center gap-1.5" style={{ color: GRADES[g].tone }}>
                {g === "forgot" ? (
                  <ArrowLeft size={14} aria-hidden="true" />
                ) : g === "shaky" ? (
                  <ArrowUp size={14} aria-hidden="true" />
                ) : (
                  <ArrowRight size={14} aria-hidden="true" />
                )}
                {GRADES[g].label}
              </span>
              <span className="text-11 font-[500] text-ink-3">{GRADES[g].hint}</span>
            </button>
          ))}
        </div>
      )}
      <p className="hidden items-center justify-center gap-1.5 text-12 text-ink-3 sm:flex">
        <Kbd>←</Kbd> <Kbd>↑</Kbd> <Kbd>→</Kbd> to grade · <Kbd>Z</Kbd> to undo
      </p>
    </div>
  );
}
