"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { cn, inputClasses } from "@upsolve/ui";
import { searchColleges } from "@/app/actions/profile";

export type CollegeChoice =
  { kind: "existing"; id: string; name: string } | { kind: "new"; name: string } | null;

type Option = { id: string; name: string; shortName: string | null; city: string | null };

/** Search-as-you-type college picker with an "add it" escape hatch. */
export function CollegePicker({
  value,
  onChange,
  invalid,
}: {
  value: CollegeChoice;
  onChange: (c: CollegeChoice) => void;
  invalid?: boolean;
}) {
  const listId = useId();
  const [query, setQuery] = useState("");
  // Results remember which query they answer, so stale results never show.
  const [results, setResults] = useState<{ query: string; options: Option[] }>({
    query: "",
    options: [],
  });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const latest = useRef(0);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const ticket = ++latest.current;
    const t = setTimeout(async () => {
      const options = await searchColleges(q);
      if (ticket === latest.current) {
        setResults({ query: q, options });
        setActive(0);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  const options = results.query === query.trim() ? results.options : [];

  if (value) {
    return (
      <div className="flex h-[42px] items-center gap-2 rounded-sm border border-line-2 bg-surface-2 px-3.5 text-sm">
        <span className="min-w-0 flex-1 truncate">
          {value.name}
          {value.kind === "new" && (
            <span className="ml-2 font-mono text-[11px] text-ink-3">new</span>
          )}
        </span>
        <button
          type="button"
          onClick={() => {
            onChange(null);
            setQuery("");
          }}
          aria-label="Change college"
          className="text-ink-3 hover:text-ink"
        >
          <X size={15} />
        </button>
      </div>
    );
  }

  const q = query.trim();
  const choices: (Option | { add: string })[] = [
    ...options,
    ...(q.length >= 3 && !options.some((o) => o.name.toLowerCase() === q.toLowerCase())
      ? [{ add: q }]
      : []),
  ];

  function pick(c: Option | { add: string }) {
    onChange(
      "add" in c ? { kind: "new", name: c.add } : { kind: "existing", id: c.id, name: c.name },
    );
    setOpen(false);
  }

  return (
    <div className="relative">
      <input
        role="combobox"
        aria-expanded={open && choices.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-invalid={invalid || undefined}
        value={query}
        placeholder="Search: IIT Delhi, NSUT, VIT…"
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (!open || choices.length === 0) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, choices.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            const c = choices[active];
            if (c) pick(c);
          }
        }}
        className={cn(inputClass, invalid && "border-bad")}
      />
      {open && choices.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1.5 w-full overflow-hidden rounded-sm border border-line-2 bg-surface-3 py-1 shadow-card"
        >
          {choices.map((c, i) => (
            <li
              key={"add" in c ? "add" : c.id}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActive(i)}
              onClick={() => pick(c)}
              className={cn(
                "flex cursor-pointer items-center gap-2 px-3 py-2 text-sm",
                i === active && "bg-surface-2",
              )}
            >
              {"add" in c ? (
                <>
                  <Plus size={14} className="text-ink-3" aria-hidden="true" />
                  Add “{c.add}”
                </>
              ) : (
                <>
                  <span className="min-w-0 flex-1 truncate">{c.name}</span>
                  <span className="font-mono text-[11px] text-ink-3">
                    {[c.shortName, c.city].filter(Boolean).join(" · ")}
                  </span>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Shared input look for onboarding (matches the design-system Field). */
export const inputClass = inputClasses();
