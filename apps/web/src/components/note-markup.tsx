import { Fragment, type ReactNode } from "react";
import { cn } from "@upsolve/ui";

/**
 * Notes v2 (FEATURES-PLAN F6): renders a plain-text note with ``` code fences (a tiny
 * regex highlighter for C++, Java, Python and JS), inline `code` and links. No HTML is ever
 * interpreted, so any note is safe to render. Pure, so it works on server and client.
 */
export function NoteMarkup({ text, className }: { text: string; className?: string }) {
  const parts = splitFences(text);
  return (
    <div className={cn("flex flex-col gap-2 text-13 leading-relaxed", className)}>
      {parts.map((p, i) =>
        p.kind === "code" ? (
          <pre
            key={i}
            className="overflow-x-auto rounded-[12px] bg-[color-mix(in_srgb,var(--ink)_6%,transparent)] px-3 py-2.5 font-mono text-[12.5px] leading-[1.6] shadow-[inset_0_0_0_1px_var(--line)] [scrollbar-width:thin]"
          >
            {p.lang && (
              <span className="mb-1 block text-[10px] font-[600] tracking-wider text-ink-4 uppercase">
                {p.lang}
              </span>
            )}
            <code>{highlight(p.body, p.lang)}</code>
          </pre>
        ) : p.body.trim() ? (
          <p key={i} className="whitespace-pre-line">
            {inline(p.body.replace(/^\n+|\n+$/g, ""))}
          </p>
        ) : null,
      )}
    </div>
  );
}

/** True when a note has something the renderer would show differently from plain text. */
export const hasMarkup = (text: string) => /```|`[^`\n]+`|https?:\/\//.test(text);

type Part = { kind: "text"; body: string } | { kind: "code"; body: string; lang: string };

function splitFences(text: string): Part[] {
  const out: Part[] = [];
  const re = /```([\w+#-]*)[^\n]*\n?([\s\S]*?)(?:```|$)/g;
  let last = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > last) out.push({ kind: "text", body: text.slice(last, m.index) });
    out.push({ kind: "code", lang: m[1]!.toLowerCase(), body: m[2]!.replace(/\n$/, "") });
    last = re.lastIndex;
    if (m[0].length === 0) re.lastIndex++;
  }
  if (last < text.length) out.push({ kind: "text", body: text.slice(last) });
  return out;
}

function inline(text: string): ReactNode {
  const re = /`([^`\n]+)`|(https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"])/g;
  const out: ReactNode[] = [];
  let last = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(
      m[1] !== undefined ? (
        <code
          key={m.index}
          className="rounded-[6px] bg-[color-mix(in_srgb,var(--ink)_8%,transparent)] px-1.5 py-px font-mono text-[0.92em]"
        >
          {m[1]}
        </code>
      ) : (
        <a
          key={m.index}
          href={m[2]}
          target="_blank"
          rel="noreferrer nofollow"
          className="break-all text-info underline underline-offset-2 hover:text-ink"
        >
          {m[2]!.replace(/^https?:\/\/(www\.)?/, "")}
        </a>
      ),
    );
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

const KEYWORDS = new Set(
  (
    "auto bool break case catch char class const continue def default delete do double elif " +
    "else enum except export extends false final finally float for from function if import in " +
    "int is lambda let long map new None nonlocal not null nullptr or pass private protected " +
    "public raise return self set short static string struct super switch template this throw " +
    "True true try typedef unordered_map unsigned var vector void while with yield and async " +
    "await boolean of pair queue stack deque priority_queue List Map HashMap ArrayList range len"
  ).split(" "),
);

const TOKEN = {
  py: /(#[^\n]*)|("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*')|(\b\d+(?:\.\d+)?\b)|([A-Za-z_]\w*)/g,
  c: /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`)|(\b\d+(?:\.\d+)?\b)|(#\s*\w+|[A-Za-z_]\w*)/g,
};

function highlight(code: string, lang: string): ReactNode {
  const re = new RegExp(/^(py|python|python3)$/.test(lang) ? TOKEN.py : TOKEN.c);
  const out: ReactNode[] = [];
  let last = 0;
  for (let m = re.exec(code); m; m = re.exec(code)) {
    if (m.index > last) out.push(code.slice(last, m.index));
    const [whole, comment, str, num, word] = m;
    const cls = comment
      ? "text-ink-3 italic"
      : str
        ? "text-signal-text"
        : num
          ? "text-medium"
          : word && (word.startsWith("#") || KEYWORDS.has(word))
            ? "text-info"
            : null;
    out.push(
      cls ? (
        <span key={m.index} className={cls}>
          {whole}
        </span>
      ) : (
        <Fragment key={m.index}>{whole}</Fragment>
      ),
    );
    last = re.lastIndex;
  }
  if (last < code.length) out.push(code.slice(last));
  return out;
}
