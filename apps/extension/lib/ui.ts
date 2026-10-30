// The on-page pill, its panel (memory, hints, pre-submit checklist) and the
// after-Accepted wrap-up, inside a Shadow DOM so LeetCode's CSS and ours never
// interfere. Plain DOM, no framework.
import type { ExtProblemContext } from "@upsolve/contracts";
import type { MistakeTag } from "@upsolve/contracts/leetcode";
import { MISTAKE_TAGS } from "@upsolve/contracts/leetcode";
import { formatClock, type TimerStatus } from "./timer.ts";

const CSS = `
:host { all: initial; }
* { box-sizing: border-box; font-family: "Geist", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; }
.wrap { position: fixed; left: 16px; bottom: 16px; z-index: 2147483000; display: flex; flex-direction: column; align-items: flex-start; gap: 8px; color: #f4f4f6; }
.pill { display: inline-flex; align-items: center; gap: 8px; height: 34px; padding: 0 12px 0 10px; border-radius: 999px;
  background: rgba(19,19,25,.92); border: 1px solid rgba(255,255,255,.13); box-shadow: 0 12px 30px -12px rgba(0,0,0,.6);
  backdrop-filter: blur(10px); cursor: pointer; font: 500 13px/1 ui-monospace, "Geist Mono", Consolas, monospace; color: #f4f4f6; }
.pill:hover { border-color: rgba(255,255,255,.25); }
.dot { width: 8px; height: 8px; border-radius: 50%; flex: none; }
.armed .dot { background: transparent; box-shadow: inset 0 0 0 1.5px #686876; }
.active .dot { background: #d7ff3a; box-shadow: 0 0 0 3px rgba(215,255,58,.18); }
.paused .dot { background: #ffb938; }
.solved .dot { background: #3ddc97; }
.review { color: #9aa3ff; font-size: 11px; letter-spacing: .04em; text-transform: uppercase; }
.label { color: #a3a3b0; font-size: 11px; letter-spacing: .04em; text-transform: uppercase; }
.card { width: 300px; padding: 14px; border-radius: 16px; background: rgba(19,19,25,.97); border: 1px solid rgba(255,255,255,.13);
  box-shadow: 0 24px 60px -24px rgba(0,0,0,.8); font-size: 13px; line-height: 1.45; animation: pop .32s cubic-bezier(.34,1.56,.64,1) both; }
@keyframes pop { from { opacity: 0; transform: translateY(6px) scale(.97); } }
.title { font-weight: 600; margin: 0 0 4px; font-size: 13.5px; }
.meta { color: #a3a3b0; font: 400 11.5px/1.4 ui-monospace, "Geist Mono", Consolas, monospace; margin: 0 0 12px; }
.row { display: flex; flex-wrap: wrap; gap: 6px; }
button.b { height: 30px; padding: 0 12px; border-radius: 999px; border: 1px solid rgba(255,255,255,.13); background: #1a1a22;
  color: #f4f4f6; font-size: 12.5px; font-weight: 550; cursor: pointer; transition: transform .2s, border-color .2s; }
button.b:hover { border-color: rgba(255,255,255,.3); }
button.b:active { transform: scale(.97); }
button.b.primary { background: #d7ff3a; color: #0b0b0f; border-color: transparent; }
button.b.on { background: #f4f4f6; color: #0b0b0f; border-color: transparent; }
button.chip { height: 26px; padding: 0 10px; font-size: 11.5px; font-weight: 500; }
input.note { width: 100%; height: 32px; margin-top: 8px; padding: 0 10px; border-radius: 10px; border: 1px solid rgba(255,255,255,.13);
  background: #1a1a22; color: #f4f4f6; font-size: 12.5px; outline: none; }
input.note:focus { border-color: #6e7bff; }
.sub { color: #a3a3b0; font-size: 11.5px; margin: 10px 0 6px; }
.warn { color: #ffb938; font-size: 11.5px; margin: 8px 0 0; }
.x { margin-left: auto; background: none; border: 0; color: #686876; cursor: pointer; font-size: 16px; line-height: 1; padding: 0 2px; }
.x:hover { color: #f4f4f6; }
.head { display: flex; align-items: flex-start; gap: 8px; }
.sec { margin: 12px 0 0; padding-top: 10px; border-top: 1px solid rgba(255,255,255,.08); }
.eyebrow { color: #686876; font: 500 10px/1 ui-monospace, "Geist Mono", Consolas, monospace; letter-spacing: .08em; text-transform: uppercase; margin: 0 0 7px; }
.mem { color: #c9c9d2; font-size: 12.5px; margin: 0; }
.quote { margin: 6px 0 0; padding: 6px 9px; border-left: 2px solid #9aa3ff; border-radius: 0 8px 8px 0; background: rgba(154,163,255,.08); color: #dcdcf5; font-size: 12px; }
.hint { margin: 0 0 6px; padding: 8px 10px; border-radius: 10px; background: #1a1a22; border: 1px solid rgba(255,255,255,.08); }
.hint b { display: block; font-size: 11.5px; color: #d7ff3a; margin-bottom: 2px; font-weight: 600; }
.hint p { margin: 0; color: #dcdce4; font-size: 12px; }
ul.checks { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 5px; }
ul.checks li { display: flex; gap: 7px; font-size: 12px; color: #dcdce4; }
ul.checks li::before { content: ""; flex: none; width: 12px; height: 12px; margin-top: 2px; border-radius: 4px; border: 1.5px solid #686876; }
ul.checks li.mine::before { border-color: #ffb938; }
.mine-n { color: #ffb938; font: 500 10.5px ui-monospace, "Geist Mono", Consolas, monospace; margin-left: auto; white-space: nowrap; }
a.link { color: #9aa3ff; text-decoration: none; font-size: 12px; }
a.link:hover { text-decoration: underline; }
.sim { display: flex; flex-direction: column; gap: 3px; }
.scroll { max-height: min(60vh, 460px); overflow-y: auto; scrollbar-width: thin; }
`;

export type PillView = {
  status: TimerStatus;
  activeMs: number;
  idleMs: number;
  submits: number;
  title: string | null;
  connected: boolean;
  /** Opened from the revision queue. */
  review: boolean;
};

export type PromptResult = {
  independence: "solo" | "hint" | "solution" | null;
  mistakeTags: MistakeTag[];
  note: string | null;
  /** Topic id of the pattern used. */
  pattern: string | null;
  takeaway: string | null;
};

/** Pattern chips when the problem's own topics are unknown (ids match @upsolve/core topics). */
const COMMON_PATTERNS: { id: string; label: string }[] = [
  { id: "hashing", label: "Hashing" },
  { id: "two-pointers", label: "Two pointers" },
  { id: "sliding-window", label: "Sliding window" },
  { id: "binary-search", label: "Binary search" },
  { id: "stack-queue", label: "Stack / queue" },
  { id: "trees", label: "Trees" },
  { id: "graphs", label: "Graphs" },
  { id: "dp", label: "DP" },
  { id: "greedy", label: "Greedy" },
  { id: "recursion", label: "Backtracking" },
  { id: "heap", label: "Heap" },
];

const HOW: Record<"solo" | "hint" | "solution", string> = {
  solo: "on your own",
  hint: "with a hint",
  solution: "after the solution",
};

function ago(ms: number) {
  const d = Math.floor((Date.now() - ms) / 86_400_000);
  return d <= 0 ? "today" : d === 1 ? "yesterday" : `${d} days ago`;
}

const MISTAKE_LABELS: Record<MistakeTag, string> = {
  "edge-case": "Edge case",
  overflow: "Overflow",
  "off-by-one": "Off by one",
  "wrong-approach": "Wrong approach",
  "too-slow": "Too slow",
  misread: "Misread",
  syntax: "Syntax",
};

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (text !== undefined) node.textContent = text;
  return node;
}

export class TimerUi {
  private host = el("div", { id: "upsolve-root" });
  private wrap: HTMLDivElement;
  private pill: HTMLButtonElement;
  private panel: HTMLDivElement | null = null;
  private prompt: HTMLDivElement | null = null;
  private view: PillView | null = null;
  private hidden = false;
  private context: ExtProblemContext | null = null;
  private hintsShown = 0;
  private tip: HTMLDivElement | null = null;

  private readonly onTogglePause: () => void;

  constructor(onTogglePause: () => void) {
    this.onTogglePause = onTogglePause;
    const shadow = this.host.attachShadow({ mode: "closed" });
    shadow.append(el("style", {}, CSS));
    this.wrap = el("div", { class: "wrap" });
    this.pill = el("button", {
      class: "pill armed",
      type: "button",
      "aria-label": "DsaKaro timer",
    });
    this.pill.addEventListener("click", () => this.togglePanel());
    this.wrap.append(this.pill);
    shadow.append(this.wrap);
  }

  mount() {
    if (!this.host.isConnected) document.documentElement.append(this.host);
  }

  unmount() {
    this.host.remove();
    this.panel?.remove();
    this.tip?.remove();
    this.panel = null;
    this.prompt = null;
    this.tip = null;
    this.context = null;
    this.hintsShown = 0;
  }

  /** What DsaKaro knows about this problem (memory, hints, checklist). */
  setContext(ctx: ExtProblemContext | null) {
    this.context = ctx;
    if (this.panel) this.fillPanel();
  }

  /** How many hints the user has opened on this problem. */
  hintsUsed() {
    return this.hintsShown;
  }

  private showTip(build: (card: HTMLDivElement, close: () => void) => void) {
    this.tip?.remove();
    if (this.hidden) this.setHidden(false);
    const card = el("div", { class: "card", role: "status" });
    const close = () => {
      card.remove();
      if (this.tip === card) this.tip = null;
    };
    build(card, close);
    this.tip = card;
    this.wrap.insertBefore(card, this.pill);
  }

  /** After ~25 active minutes: offer the hints one at a time instead of the editorial. */
  offerHints() {
    const hints = this.context?.hints ?? [];
    if (hints.length === 0 || this.hintsShown > 0 || this.prompt) return;
    this.showTip((card, close) => {
      const x = el("button", { class: "x", type: "button", "aria-label": "Close" }, "×");
      x.addEventListener("click", close);
      const head = el("div", { class: "head" });
      head.append(el("p", { class: "title" }, "Stuck for a while? Try a nudge first."), x);
      const sub = el(
        "p",
        { class: "meta" },
        "Hints go from gentle to specific. Each one you open still beats the editorial.",
      );
      const body = el("div", {});
      const row = el("div", { class: "row" });
      const next = el("button", { class: "b primary", type: "button" }, "Show hint 1");
      next.addEventListener("click", () => {
        const h = hints[this.hintsShown];
        if (!h) return;
        this.hintsShown++;
        body.append(this.hintNode(h));
        if (this.hintsShown >= hints.length) next.remove();
        else next.textContent = `Show hint ${this.hintsShown + 1}`;
        if (this.panel) this.fillPanel();
      });
      const later = el("button", { class: "b", type: "button" }, "Not now");
      later.addEventListener("click", close);
      row.append(next, later);
      card.append(head, sub, body, row);
    });
  }

  /** After a wrong verdict: the checks this user most often misses. */
  showChecklist(verdict: string) {
    const checks = this.context?.checklist ?? [];
    if (checks.length === 0 || this.prompt) return;
    this.showTip((card, close) => {
      const x = el("button", { class: "x", type: "button", "aria-label": "Close" }, "×");
      x.addEventListener("click", close);
      const head = el("div", { class: "head" });
      head.append(el("p", { class: "title" }, `${verdict}. Before the next submit:`), x);
      card.append(head, this.checksNode(checks.slice(0, 5)));
    });
  }

  private hintNode(h: ExtProblemContext["hints"][number]) {
    const box = el("div", { class: "hint" });
    box.append(el("b", {}, `Hint ${h.level} · ${h.title}`), el("p", {}, h.body));
    return box;
  }

  private checksNode(checks: ExtProblemContext["checklist"]) {
    const list = el("ul", { class: "checks" });
    for (const c of checks) {
      const li = el("li", c.mine > 0 ? { class: "mine" } : {});
      li.append(el("span", {}, c.text));
      if (c.mine > 0) li.append(el("span", { class: "mine-n" }, `you ×${c.mine}`));
      list.append(li);
    }
    return list;
  }

  setHidden(hidden: boolean) {
    this.hidden = hidden;
    this.wrap.style.display = hidden ? "none" : "";
  }

  render(view: PillView) {
    this.view = view;
    this.pill.className = `pill ${view.status}`;
    const label =
      view.status === "armed"
        ? "ready"
        : view.status === "solved"
          ? "solved"
          : view.status === "paused"
            ? "paused"
            : "";
    this.pill.replaceChildren(
      el("span", { class: "dot" }),
      el("span", {}, formatClock(view.activeMs)),
      ...(view.review ? [el("span", { class: "review" }, "review")] : []),
      ...(label ? [el("span", { class: "label" }, label)] : []),
    );
    if (this.panel) this.fillPanel();
  }

  private togglePanel() {
    if (this.panel) {
      this.panel.remove();
      this.panel = null;
      return;
    }
    this.panel = el("div", { class: "card" });
    this.fillPanel();
    this.wrap.insertBefore(this.panel, this.pill);
  }

  private fillPanel() {
    const v = this.view;
    if (!this.panel || !v) return;
    const close = el("button", { class: "x", type: "button", "aria-label": "Close" }, "×");
    close.addEventListener("click", () => this.togglePanel());
    const head = el("div", { class: "head" });
    head.append(el("p", { class: "title" }, v.title ?? "This problem"), close);

    const meta = el(
      "p",
      { class: "meta" },
      `${v.review ? "review · " : ""}active ${formatClock(v.activeMs)} · idle ${formatClock(v.idleMs)} · ${v.submits} submit${v.submits === 1 ? "" : "s"}`,
    );
    const row = el("div", { class: "row" });
    if (v.status !== "solved") {
      const pause = el(
        "button",
        { class: "b", type: "button" },
        v.status === "paused" ? "Resume" : "Pause",
      );
      pause.addEventListener("click", () => this.onTogglePause());
      row.append(pause);
    }
    const hide = el("button", { class: "b", type: "button" }, "Hide on this problem");
    hide.addEventListener("click", () => this.setHidden(true));
    row.append(hide);

    this.panel.replaceChildren(head, meta, row);
    this.panel.classList.add("scroll");
    const ctx = this.context;
    if (ctx) {
      // What you remember about this problem.
      const mem = el("div", { class: "sec" });
      mem.append(el("p", { class: "eyebrow" }, "Your memory"));
      const m = ctx.memory;
      const facts =
        m.solvedCount > 0
          ? [
              `Solved ${m.solvedCount}×`,
              m.lastSolvedAt ? `last ${ago(m.lastSolvedAt)}` : null,
              m.bestActiveMs ? `best ${formatClock(m.bestActiveMs)}` : null,
              m.independence ? HOW[m.independence] : null,
            ]
          : [
              m.attempts > 0
                ? `${m.attempts} attempt${m.attempts === 1 ? "" : "s"}, not solved yet`
                : "First time on this one",
            ];
      mem.append(el("p", { class: "mem" }, facts.filter(Boolean).join(" · ")));
      if (ctx.review && !ctx.review.retired) {
        const due = ctx.review.dueAt - Date.now();
        mem.append(
          el(
            "p",
            { class: "mem" },
            `Revision step ${ctx.review.step} · ${due <= 0 ? "due now" : `due in ${Math.ceil(due / 86_400_000)}d`}`,
          ),
        );
      }
      if (m.lastTakeaway) mem.append(el("p", { class: "quote" }, `“${m.lastTakeaway}”`));
      if (ctx.note) mem.append(el("p", { class: "quote" }, ctx.note));
      this.panel.append(mem);

      if (ctx.hints.length > 0 && v.status !== "solved") {
        const sec = el("div", { class: "sec" });
        sec.append(el("p", { class: "eyebrow" }, "Hints"));
        for (const h of ctx.hints.slice(0, this.hintsShown)) sec.append(this.hintNode(h));
        if (this.hintsShown < ctx.hints.length) {
          const more = el(
            "button",
            { class: "b chip", type: "button" },
            this.hintsShown === 0 ? "Show a gentle hint" : `Show hint ${this.hintsShown + 1}`,
          );
          more.addEventListener("click", () => {
            this.hintsShown++;
            this.fillPanel();
          });
          sec.append(more);
        }
        this.panel.append(sec);
      }

      if (ctx.checklist.length > 0 && v.status !== "solved") {
        const sec = el("div", { class: "sec" });
        sec.append(
          el("p", { class: "eyebrow" }, "Before you submit"),
          this.checksNode(ctx.checklist.slice(0, 5)),
        );
        this.panel.append(sec);
      }

      if (ctx.similar.length > 0 || ctx.dashboardUrl) {
        const sec = el("div", { class: "sec sim" });
        if (ctx.similar.length > 0) sec.append(el("p", { class: "eyebrow" }, "Similar"));
        for (const sim of ctx.similar) {
          if (!sim.url) sec.append(el("span", { class: "mem" }, sim.title));
          else
            sec.append(
              el(
                "a",
                { class: "link", href: sim.url, target: "_blank", rel: "noreferrer" },
                sim.title,
              ),
            );
        }
        if (ctx.dashboardUrl)
          sec.append(
            el(
              "a",
              { class: "link", href: ctx.dashboardUrl, target: "_blank", rel: "noreferrer" },
              "Open in DsaKaro ↗",
            ),
          );
        this.panel.append(sec);
      }
    }
    if (!v.connected) {
      this.panel.append(
        el(
          "p",
          { class: "warn" },
          "Not connected: sessions are saved and will upload once you connect from the toolbar icon.",
        ),
      );
    }
  }

  /**
   * The 10-second wrap-up: how you solved it, the pattern, and a one-line takeaway.
   * Resolves when answered, or with nulls after 20 s untouched.
   */
  askHowSolved(opts: { elapsedMs: number; hadFailures: boolean }): Promise<PromptResult> {
    this.prompt?.remove();
    this.tip?.remove();
    this.tip = null;
    if (this.hidden) this.setHidden(false);
    const card = el("div", {
      class: "card",
      role: "dialog",
      "aria-label": "How did you solve it?",
    });
    this.prompt = card;

    return new Promise((resolve) => {
      const result: PromptResult = {
        independence: this.hintsShown > 0 ? "hint" : null,
        mistakeTags: [],
        note: null,
        pattern: null,
        takeaway: null,
      };
      let touched = false;
      const finish = () => {
        clearTimeout(timer);
        card.remove();
        if (this.prompt === card) this.prompt = null;
        resolve(result);
      };
      const timer = setTimeout(() => {
        if (!touched) finish();
      }, 20_000);
      // Reading (hovering), clicking or typing keeps the prompt open.
      card.addEventListener("pointerenter", () => (touched = true));
      card.addEventListener("pointerdown", () => (touched = true));
      card.addEventListener("keydown", () => (touched = true));

      const close = el("button", { class: "x", type: "button", "aria-label": "Skip" }, "×");
      close.addEventListener("click", finish);
      const head = el("div", { class: "head" });
      head.append(
        el(
          "p",
          { class: "title" },
          `Accepted in ${formatClock(opts.elapsedMs)}. How did you solve it?`,
        ),
        close,
      );

      const choices = el("div", { class: "row" });
      const options: [PromptResult["independence"], string][] = [
        ["solo", "On my own"],
        ["hint", "Used a hint"],
        ["solution", "Saw the solution"],
      ];
      const buttons = options.map(([value, label]) => {
        const b = el(
          "button",
          { class: result.independence === value ? "b on" : "b", type: "button" },
          label,
        );
        b.addEventListener("click", () => {
          result.independence = value;
          for (const other of buttons) other.classList.toggle("on", other === b);
        });
        return b;
      });
      choices.append(...buttons);
      card.append(head, choices);

      const done = el("button", { class: "b primary", type: "button" }, "Save");
      done.addEventListener("click", finish);

      // Pattern: the problem's own topics first, then common ones.
      card.append(el("p", { class: "sub" }, "Which pattern cracked it?"));
      const seenIds = new Set<string>();
      const patterns = [...(this.context?.topics ?? []), ...COMMON_PATTERNS]
        .filter((t) => (seenIds.has(t.id) ? false : (seenIds.add(t.id), true)))
        .slice(0, 8);
      const patternRow = el("div", { class: "row" });
      const chips = patterns.map((t) => {
        const chip = el("button", { class: "b chip", type: "button" }, t.label);
        chip.addEventListener("click", () => {
          result.pattern = result.pattern === t.id ? null : t.id;
          for (const [i, c] of chips.entries())
            c.classList.toggle("on", patterns[i]!.id === result.pattern);
        });
        return chip;
      });
      patternRow.append(...chips);
      const takeaway = el("input", {
        class: "note",
        type: "text",
        maxlength: "200",
        placeholder: "One-line takeaway, e.g. “sort first, then two pointers”",
      });
      takeaway.addEventListener("input", () => (result.takeaway = takeaway.value.trim() || null));
      takeaway.addEventListener("keydown", (e) => {
        e.stopPropagation(); // keep LeetCode's editor shortcuts out of the way
        if (e.key === "Enter") finish();
      });
      card.append(patternRow, takeaway);

      if (opts.hadFailures) {
        card.append(el("p", { class: "sub" }, "What tripped you up before? (optional)"));
        const tags = el("div", { class: "row" });
        for (const tag of MISTAKE_TAGS) {
          const chip = el("button", { class: "b chip", type: "button" }, MISTAKE_LABELS[tag]);
          chip.addEventListener("click", () => {
            const on = !result.mistakeTags.includes(tag);
            result.mistakeTags = on
              ? [...result.mistakeTags, tag]
              : result.mistakeTags.filter((t) => t !== tag);
            chip.classList.toggle("on", on);
          });
          tags.append(chip);
        }
        const note = el("input", {
          class: "note",
          type: "text",
          maxlength: "500",
          placeholder: "One-line note for future you (optional)",
        });
        note.addEventListener("input", () => (result.note = note.value.trim() || null));
        note.addEventListener("keydown", (e) => {
          e.stopPropagation();
          if (e.key === "Enter") finish();
        });
        card.append(tags, note);
      }
      const actions = el("div", { class: "row" });
      actions.style.marginTop = "10px";
      actions.append(done);
      card.append(actions);

      this.wrap.insertBefore(card, this.pill);
    });
  }
}

// DsaKaro
