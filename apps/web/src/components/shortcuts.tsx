"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Kbd } from "@upsolve/ui";
import { openCommandPalette } from "@/components/command-palette";
import { openNextPicker } from "@/components/daily/next-problem";
import { Modal } from "@/components/fx/overlay";

/** "g" then a letter goes to a page (like Gmail and GitHub). */
const GO: { key: string; href: string; label: string }[] = [
  { key: "t", href: "/dashboard", label: "Today" },
  { key: "r", href: "/dashboard/revision", label: "Revision" },
  { key: "s", href: "/dashboard/sheets", label: "Sheets" },
  { key: "c", href: "/dashboard/contests", label: "Contests" },
  { key: "e", href: "/dashboard/sessions", label: "Sessions" },
  { key: "l", href: "/dashboard/notebook", label: "Library" },
  { key: "i", href: "/dashboard/analytics", label: "Insights" },
  { key: "p", href: "/dashboard/groups", label: "People" },
  { key: ",", href: "/dashboard/settings", label: "Settings" },
];

const OTHER: { keys: string[]; label: string }[] = [
  { keys: ["Ctrl", "K"], label: "Search and commands" },
  { keys: ["n"], label: "Pick my next problem" },
  { keys: ["j", "k"], label: "Move through a list (Revision)" },
  { keys: ["x"], label: "Select the row, for bulk actions" },
  { keys: ["/"], label: "Search this sheet (on a sheet page)" },
  { keys: ["?"], label: "This list" },
];

function typing(t: EventTarget | null) {
  const el = t as HTMLElement | null;
  return !!el?.closest("input, textarea, select, [contenteditable=''], [contenteditable='true']");
}

/** App-wide keyboard shortcuts, and "?" to see them. Ignored while you're typing. */
export function Shortcuts() {
  const router = useRouter();
  const [help, setHelp] = useState(false);

  useEffect(() => {
    let leader = 0; // time "g" was pressed
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || typing(e.target)) return;
      if (document.querySelector("dialog[open]")) return;
      const k = e.key.toLowerCase();
      if (leader && Date.now() - leader < 1200) {
        leader = 0;
        const go = GO.find((g) => g.key === k);
        if (go) {
          e.preventDefault();
          router.push(go.href);
        }
        return;
      }
      if (k === "g") {
        leader = Date.now();
      } else if (e.key === "?") {
        e.preventDefault();
        setHelp(true);
      } else if (k === "n") {
        e.preventDefault();
        openNextPicker();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  return (
    <Modal open={help} onClose={() => setHelp(false)} title="Keyboard shortcuts">
      <div className="grid gap-6 sm:grid-cols-2">
        <section>
          <p className="mb-2 text-13 font-[600] text-ink-3">Go to</p>
          <ul className="flex flex-col gap-1.5">
            {GO.map((g) => (
              <li key={g.key} className="flex items-center justify-between gap-3 text-14">
                {g.label}
                <span className="flex gap-1">
                  <Kbd>g</Kbd>
                  <Kbd>{g.key}</Kbd>
                </span>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <p className="mb-2 text-13 font-[600] text-ink-3">Anywhere</p>
          <ul className="flex flex-col gap-1.5">
            {OTHER.map((o) => (
              <li key={o.label} className="flex items-center justify-between gap-3 text-14">
                {o.label}
                <span className="flex gap-1">
                  {o.keys.map((k) => (
                    <Kbd key={k}>{k}</Kbd>
                  ))}
                </span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => {
              setHelp(false);
              openCommandPalette();
            }}
            className="mt-4 text-13 font-[600] text-ink-2 underline-offset-4 hover:text-ink hover:underline"
          >
            Open the command palette
          </button>
        </section>
      </div>
    </Modal>
  );
}
