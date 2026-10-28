import { browser } from "wxt/browser";
import type { Message, Status } from "../../lib/messages.ts";
import { WEB_URL } from "../../lib/storage.ts";
import { formatClock } from "../../lib/timer.ts";

const app = document.getElementById("app")!;

function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: { class?: string; text?: string; onclick?: () => void } = {},
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (props.class) el.className = props.class;
  if (props.text !== undefined) el.textContent = props.text;
  if (props.onclick) el.addEventListener("click", props.onclick);
  el.append(...children);
  return el;
}

const send = (msg: Message) => browser.runtime.sendMessage(msg);
const open = (path: string) => browser.tabs.create({ url: `${WEB_URL}${path}` });

/** The DsaKaro mark: a tick through two hollow nodes, ending in a lime node. */
function logo() {
  const ns = "http://www.w3.org/2000/svg";
  const node = (tag: string, attrs: Record<string, string>) => {
    const el = document.createElementNS(ns, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    return el;
  };
  const svg = node("svg", { width: "20", height: "20", viewBox: "2.5 0.5 28 28" });
  const mask = node("mask", {
    id: "dk-holes",
    maskUnits: "userSpaceOnUse",
    x: "0",
    y: "0",
    width: "32",
    height: "32",
  });
  mask.append(
    node("rect", { width: "32", height: "32", fill: "#fff" }),
    node("circle", { cx: "5.5", cy: "16", r: "1.3", fill: "#000" }),
    node("circle", { cx: "12.5", cy: "23", r: "1.3", fill: "#000" }),
  );
  svg.append(
    mask,
    node("path", {
      d: "M5.5 16 12.5 23 24.5 9.5",
      fill: "none",
      stroke: "#f4f4f6",
      "stroke-width": "5.4",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      mask: "url(#dk-holes)",
    }),
    node("circle", { cx: "26", cy: "7.5", r: "4.2", fill: "#d7ff3a" }),
  );
  return svg;
}

function stat(value: string, unit: string, label: string) {
  const num = h("div", { class: "num", text: value }, h("small", { text: unit }));
  return h("div", {}, num, h("p", { class: "sub", text: label }));
}

function render(s: Status) {
  const header = h("header", {}, logo(), h("span", {}, "Dsa", h("em", { text: "Karo" })));

  if (!s.connected) {
    app.replaceChildren(
      header,
      h(
        "div",
        { class: "card" },
        h("p", {
          text: "Connect to your DsaKaro account to sync your LeetCode and GeeksforGeeks sessions.",
        }),
        h("p", {
          class: "sub",
          text: "Sessions are already being timed and saved here; they upload once you connect.",
        }),
      ),
      h("button", { class: "primary", text: "Connect", onclick: () => open("/extension/connect") }),
    );
    return;
  }

  const children: Node[] = [header];

  if (s.authError) {
    children.push(
      h(
        "div",
        { class: "card" },
        h("p", { class: "bad", text: s.authError }),
        h("button", {
          class: "primary",
          text: "Reconnect",
          onclick: () => open("/extension/connect"),
        }),
      ),
    );
  }

  const name = s.me?.user.name?.split(" ")[0];
  const today = s.me?.today;
  children.push(
    h(
      "div",
      { class: "card" },
      h("p", { class: "eyebrow", text: name ? `Today · ${name}` : "Today" }),
      today
        ? h(
            "div",
            { class: "stats" },
            stat(String(today.solved), "", "solved"),
            stat(String(today.sessions), "", "sessions"),
            stat(formatClock(today.activeMs), "", "focused"),
          )
        : h("p", {
            class: "sub",
            text: "Offline: today's numbers will show when the server is reachable.",
          }),
    ),
  );

  if (s.current) {
    children.push(
      h(
        "div",
        { class: "card" },
        h("p", {
          class: "eyebrow",
          text: s.current.status === "solved" ? "Just solved" : "Now solving",
        }),
        h("p", { text: s.current.title ?? s.current.slug }),
        h(
          "p",
          { class: "sub mono" },
          `${formatClock(s.current.activeMs)} active · ${s.current.submits} submit${s.current.submits === 1 ? "" : "s"} · ${s.current.status}`,
        ),
      ),
    );
  }

  if (s.lab) {
    children.push(
      h(
        "div",
        { class: "card" },
        h("p", { class: "eyebrow", text: "Lab mode · focusing" }),
        h(
          "div",
          { class: "stats" },
          stat(formatClock(s.lab.focusMs), "", "focus"),
          stat(formatClock(s.lab.awayMs), "", "away"),
          stat(String(s.lab.switches), "", "switches"),
        ),
        h(
          "div",
          { class: "row" },
          h("button", {
            text: "Stop and save",
            onclick: () => void send({ type: "lab:stop", report: true }).then(load),
          }),
          h("button", {
            class: "ghost",
            text: "Open timer",
            onclick: () => open("/dashboard/sessions#lab"),
          }),
        ),
      ),
    );
  }

  const saved = h("p", { class: "sub" });
  children.push(
    h(
      "div",
      { class: "card" },
      h("p", { class: "eyebrow", text: "Save for later" }),
      h("p", {
        class: "sub",
        text: "A tutorial, an article or a problem you'll come back to. YouTube keeps your timestamp.",
      }),
      h(
        "div",
        { class: "row" },
        h("button", {
          text: "Save this page",
          onclick: () =>
            void (send({ type: "save:tab" }) as Promise<{ ok: boolean; error?: string }>).then(
              (r) => {
                saved.textContent = r.ok ? "Saved to your list." : (r.error ?? "Couldn't save.");
                saved.className = `sub ${r.ok ? "ok" : "warn"}`;
              },
            ),
        }),
        h("button", { class: "ghost", text: "View list", onclick: () => open("/dashboard/later") }),
      ),
      saved,
    ),
  );

  const hist = s.history;
  const historyText = !hist
    ? "History import starts the next time you open leetcode.com."
    : hist.status === "running"
      ? `Importing your LeetCode history… ${hist.imported} so far`
      : hist.status === "done"
        ? `History imported (${hist.imported} submissions).`
        : hist.status === "error"
          ? `History import paused: ${hist.error}`
          : "History import waiting.";
  children.push(
    h(
      "div",
      { class: "card" },
      h("p", { class: "sub", text: historyText }),
      h("p", {
        class: `sub ${s.pending > 0 ? "warn" : "ok"}`,
        text: s.pending > 0 ? `${s.pending} session(s) waiting to upload` : "Everything synced",
      }),
    ),
  );

  children.push(
    h(
      "div",
      { class: "row" },
      h("button", {
        class: "primary",
        text: "Today's plan",
        onclick: () => open("/dashboard/today"),
      }),
      ...(s.pending > 0
        ? [
            h("button", {
              text: "Sync now",
              onclick: () => void send({ type: "flush" }).then(load),
            }),
          ]
        : []),
      h("button", {
        class: "ghost",
        text: "Disconnect",
        onclick: () => void send({ type: "auth:clear" }).then(load),
      }),
    ),
  );

  app.replaceChildren(...children);
}

async function load() {
  render((await send({ type: "status" })) as Status);
}

void load();
