// The on-page pill and the after-Accepted prompt, inside a Shadow DOM so
// LeetCode's CSS and ours never interfere. Plain DOM, no framework.
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
`;

export type PillView = {
  status: TimerStatus;
  activeMs: number;
  idleMs: number;
  submits: number;
  title: string | null;
  connected: boolean;
};

export type PromptResult = {
  independence: "solo" | "hint" | "solution" | null;
  mistakeTags: MistakeTag[];
  note: string | null;
};

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

  private readonly onTogglePause: () => void;

  constructor(onTogglePause: () => void) {
    this.onTogglePause = onTogglePause;
    const shadow = this.host.attachShadow({ mode: "closed" });
    shadow.append(el("style", {}, CSS));
    this.wrap = el("div", { class: "wrap" });
    this.pill = el("button", {
      class: "pill armed",
      type: "button",
      "aria-label": "Upsolve timer",
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
    this.panel = null;
    this.prompt = null;
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
      `active ${formatClock(v.activeMs)} · idle ${formatClock(v.idleMs)} · ${v.submits} submit${v.submits === 1 ? "" : "s"}`,
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

  /** Asks how the problem was solved. Resolves when answered, or with nulls after 12 s untouched. */
  askHowSolved(opts: { elapsedMs: number; hadFailures: boolean }): Promise<PromptResult> {
    this.prompt?.remove();
    if (this.hidden) this.setHidden(false);
    const card = el("div", {
      class: "card",
      role: "dialog",
      "aria-label": "How did you solve it?",
    });
    this.prompt = card;

    return new Promise((resolve) => {
      const result: PromptResult = { independence: null, mistakeTags: [], note: null };
      let touched = false;
      const finish = () => {
        clearTimeout(timer);
        card.remove();
        if (this.prompt === card) this.prompt = null;
        resolve(result);
      };
      const timer = setTimeout(() => {
        if (!touched) finish();
      }, 12_000);
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
        const b = el("button", { class: "b", type: "button" }, label);
        b.addEventListener("click", () => {
          result.independence = value;
          for (const other of buttons) other.classList.toggle("on", other === b);
          done.disabled = false;
          if (!opts.hadFailures) finish();
        });
        return b;
      });
      choices.append(...buttons);
      card.append(head, choices);

      const done = el("button", { class: "b primary", type: "button" }, "Done");
      done.disabled = true;
      done.addEventListener("click", finish);

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
          e.stopPropagation(); // keep LeetCode's editor shortcuts out of the way
          if (e.key === "Enter" && !done.disabled) finish();
        });
        const actions = el("div", { class: "row" });
        actions.style.marginTop = "10px";
        actions.append(done);
        card.append(tags, note, actions);
      }

      this.wrap.insertBefore(card, this.pill);
    });
  }
}
