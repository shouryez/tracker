import { browser } from "wxt/browser";
import { wordmarkSvg } from "@upsolve/ui/brand";
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

/** The DSA करो wordmark, drawn from the same data as the web app's logo. */
function logo() {
  const span = document.createElement("span");
  span.className = "brand";
  // A constant SVG string from our own package, not user input.
  span.innerHTML = wordmarkSvg({ height: 18 });
  return span;
}

function stat(value: string, unit: string, label: string) {
  const num = h("div", { class: "num", text: value }, h("small", { text: unit }));
  return h("div", {}, num, h("p", { class: "sub", text: label }));
}

function render(s: Status) {
  const header = h("header", {}, logo());

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

  if (s.autoPaused) {
    children.push(
      h(
        "div",
        { class: "card" },
        h("p", { class: "eyebrow", text: "Study session · auto-paused" }),
        h("p", {
          class: "sub",
          text: `${s.autoPaused.host ? `Paused while you were on ${s.autoPaused.host}. ` : ""}Open a study tab (LeetCode, a DSA video, DsaKaro) and the timer picks up again.`,
        }),
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
