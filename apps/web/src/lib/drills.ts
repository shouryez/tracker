import "server-only";
import { sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { bugDrills } from "@upsolve/db";
import { aiModel, chatJson } from "@/lib/ai";
import { BUG_CLASSES, isBugClass, type BugClass } from "@/lib/bug-classes";
import { db, userTag } from "@/lib/db";

// Spot your bug (FINAL-FEATURES A3): one of your accepted solutions with one line broken
// the way you usually break code. The model only names a line and its replacement; the
// drill is built here, so exactly one line differs and the answer is known for sure.

/** Classes a single changed line can plant, with what the model is asked to do. */
const PLANTABLE = {
  "off-by-one": "a loop bound or an index that is off by one",
  "wrong-condition": "a comparison flipped between < and <=, or > and >=, or == and !=",
  "index-out-of-bounds": "an index that can step past the start or the end of an array or string",
  overflow: "arithmetic done in a type that is too small, so a large value overflows",
  "empty-or-single": "a guard for empty or one-element input that is missing its case or is wrong",
  duplicates: "logic that goes wrong when values repeat",
  negatives: "logic that quietly assumes the values are positive",
  "base-case": "a wrong base case or a wrong value returned for the smallest input",
  "init-or-reset": "a variable that starts at the wrong value",
  "null-access": "a missing or wrong null or empty check before .next, .left, .right or .top()",
} as const satisfies Partial<Record<BugClass, string>>;
type Plantable = keyof typeof PLANTABLE;

const NO_OVERFLOW = /^(python|python3|javascript|typescript|ruby|php)$/i;
const HAS_POINTERS = /\.next|\.left|\.right|\bnull\b|\bNone\b|nullptr|\.top\(\)|\.peek\(\)/;
const ONLY_PUNCT = /^[\s{}();,[\]]*$/;
const FAST_MS = 30_000;
export const DRILL_MS = 90_000;
const DAILY_LIMIT = 40;

export type PublicDrill = {
  id: string;
  title: string;
  language: string | null;
  code: string;
  failingInput: string | null;
};

export type DrillReveal = {
  correct: boolean;
  pickedLine: number | null;
  bugLine: number;
  bugClass: BugClass;
  explanation: string;
  /** The line as you wrote it, and as the drill broke it. */
  was: string | null;
  now: string;
  ms: number;
};

type Source = {
  submissionId: string;
  problemId: string;
  title: string;
  language: string | null;
  code: string;
};

/**
 * How likely each class is to be drilled: your autopsied bugs weigh in, and recent drills
 * move it. A miss brings the class back more often, a quick catch lets it fade.
 */
export function classWeights(
  findings: Partial<Record<BugClass, number>>,
  recent: { bugClass: string; correct: boolean; ms: number | null }[],
): Map<Plantable, number> {
  const out = new Map<Plantable, number>();
  for (const k of Object.keys(PLANTABLE) as Plantable[]) {
    let w = 1 + 2 * (findings[k] ?? 0);
    for (const d of recent.filter((r) => r.bugClass === k).slice(0, 8)) {
      w *= !d.correct ? 1.6 : (d.ms ?? DRILL_MS) <= FAST_MS ? 0.6 : 0.85;
    }
    out.set(k, Math.min(40, Math.max(0.2, w)));
  }
  return out;
}

function pickWeighted<T>(weights: Map<T, number>): T | null {
  const total = [...weights.values()].reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (const [k, w] of weights) {
    r -= w;
    if (r <= 0) return k;
  }
  return [...weights.keys()].at(-1) ?? null;
}

const SYSTEM = `You make a debugging drill. You get an accepted solution and a bug class.
Change exactly ONE line so the code has a bug of that class. Make it small and realistic, the kind of slip a person really makes. The code must still compile, and must give a wrong answer, or crash, on the failing input you give.
Reply with one JSON object and nothing else:
{"line": <1-based number of the line you change>,
 "new_line": "<the full new text of that line, without its leading indentation>",
 "failing_input": "<a small valid input on which the changed code fails, in LeetCode's input format>",
 "explanation": "<one or two short sentences, second person, past tense about the drill: what the changed line does wrong on that input>"}
Rules: do not add or remove lines, do not add comments, do not rename anything, do not touch a line that is blank or only a brace. Check the failing input really breaks the changed line before you answer.`;

const numbered = (code: string) =>
  code
    .split("\n")
    .map((l, i) => `${String(i + 1).padStart(3)}| ${l}`)
    .join("\n");

const squash = (s: string) => s.replace(/\s+/g, "");

/** Checks the model's edit and applies it, or returns null. */
export function applyEdit(
  code: string,
  out: Record<string, unknown>,
): { broken: string; line: number; failingInput: string | null; explanation: string } | null {
  const lines = code.split("\n");
  const n = out.line;
  if (typeof n !== "number" || !Number.isInteger(n) || n < 1 || n > lines.length) return null;
  const original = lines[n - 1]!;
  if (ONLY_PUNCT.test(original)) return null;
  if (typeof out.new_line !== "string" || typeof out.explanation !== "string") return null;
  const next = out.new_line.replace(/\r?\n[\s\S]*$/, "").trim();
  if (!next || squash(next) === squash(original)) return null;
  if (next.length > original.trim().length * 2 + 40) return null;
  const comment = /\/\/|\/\*|#(?!include)/;
  if (comment.test(next) && !comment.test(original)) return null;
  const indent = original.match(/^\s*/)?.[0] ?? "";
  const broken = [...lines.slice(0, n - 1), indent + next, ...lines.slice(n)].join("\n");
  const failingInput =
    typeof out.failing_input === "string" && out.failing_input.trim()
      ? out.failing_input.trim().slice(0, 500)
      : null;
  const explanation = out.explanation.trim().slice(0, 400);
  if (!explanation) return null;
  return { broken, line: n, failingInput, explanation };
}

async function sources(userId: string): Promise<Source[]> {
  const rows = (await db().execute(sql`
    select distinct on (pp.problem_id)
           s.id as "submissionId", pp.problem_id as "problemId",
           coalesce(p.title, pp.title) as title, sc.language, sc.code
    from submission_code sc
    join submissions s on s.id = sc.submission_id
    join platform_problems pp on pp.id = s.platform_problem_id
    left join problems p on p.id = pp.problem_id
    where sc.user_id = ${userId} and s.verdict = 'AC' and pp.problem_id is not null
    order by pp.problem_id, s.submitted_at desc`)) as unknown as Source[];
  return rows.filter((r) => {
    const n = r.code.split("\n").length;
    return n >= 4 && n <= 90 && r.code.length <= 6000;
  });
}

/** How many of your accepted solutions a drill can be made from. */
export async function drillSourceCount(userId: string): Promise<number> {
  return (await sources(userId)).length;
}

/** The newest drill you haven't answered, from the last day, so a reload doesn't lose it. */
export async function getOpenDrill(userId: string): Promise<PublicDrill | null> {
  const [row] = (await db().execute(sql`
    select d.id, coalesce(p.title, '') as title, d.language, d.broken_code as code,
           d.failing_input as "failingInput"
    from bug_drills d left join problems p on p.id = d.problem_id
    where d.user_id = ${userId} and d.answered_at is null
      and d.created_at > now() - interval '1 day'
    order by d.created_at desc limit 1`)) as unknown as PublicDrill[];
  return row ?? null;
}

export type MakeResult =
  | { ok: true; drill: PublicDrill }
  | { ok: false; reason: "no-source" | "limit" | "ai" };

export async function makeDrill(userId: string): Promise<MakeResult> {
  const [pool, counts, recent, todayRows] = await Promise.all([
    sources(userId),
    db().execute(sql`
      select coalesce(user_class, bug_class) as c, count(*)::int as n
      from bug_findings where user_id = ${userId} group by 1`),
    db().execute(sql`
      select bug_class as "bugClass", correct, answer_ms as ms,
             source_submission_id as "sourceId"
      from bug_drills where user_id = ${userId} and answered_at is not null
      order by answered_at desc limit 60`),
    db().execute(sql`
      select count(*)::int as n from bug_drills
      where user_id = ${userId} and created_at > now() - interval '1 day'`),
  ]);
  if (pool.length === 0) return { ok: false, reason: "no-source" };
  const today = (todayRows as unknown as { n: number }[])[0]?.n ?? 0;
  if (today >= DAILY_LIMIT) return { ok: false, reason: "limit" };

  const findings: Partial<Record<BugClass, number>> = {};
  for (const r of counts as unknown as { c: string; n: number }[]) {
    if (isBugClass(r.c)) findings[r.c] = r.n;
  }
  const history = (
    recent as unknown as {
      bugClass: string;
      correct: boolean | null;
      ms: number | null;
      sourceId: string | null;
    }[]
  ).filter((d): d is typeof d & { correct: boolean } => d.correct !== null);
  const weights = classWeights(findings, history);
  const used = new Set(history.slice(0, 5).map((d) => d.sourceId));
  const fresh = pool.filter((s) => !used.has(s.submissionId));
  const choices = fresh.length ? fresh : pool;

  for (let attempt = 0; attempt < 3; attempt++) {
    const source = choices[Math.floor(Math.random() * choices.length)]!;
    const fit = new Map(
      [...weights].filter(
        ([k]) =>
          (k !== "overflow" || !NO_OVERFLOW.test(source.language ?? "")) &&
          (k !== "null-access" || HAS_POINTERS.test(source.code)),
      ),
    );
    const cls = pickWeighted(fit);
    if (!cls) continue;
    const out = await chatJson(
      SYSTEM,
      `Problem: ${source.title}\nBug class: ${BUG_CLASSES[cls].label}: ${PLANTABLE[cls]}.\n\nCode (${source.language ?? "unknown language"}), with line numbers:\n${numbered(source.code)}`,
      { maxTokens: 500, temperature: 0.5 },
    );
    if (!out) return { ok: false, reason: "ai" };
    const edit = applyEdit(source.code, out);
    if (!edit) continue;
    const [row] = await db()
      .insert(bugDrills)
      .values({
        userId,
        problemId: source.problemId,
        sourceSubmissionId: source.submissionId,
        language: source.language,
        bugClass: cls,
        brokenCode: edit.broken,
        bugLine: edit.line,
        failingInput: edit.failingInput,
        explanation: edit.explanation,
        model: aiModel(),
      })
      .returning({ id: bugDrills.id });
    return {
      ok: true,
      drill: {
        id: row!.id,
        title: source.title,
        language: source.language,
        code: edit.broken,
        failingInput: edit.failingInput,
      },
    };
  }
  return { ok: false, reason: "ai" };
}

/** Grades an answer (null line = time ran out) and returns the reveal. */
export async function gradeDrill(
  userId: string,
  id: string,
  pickedLine: number | null,
  ms: number,
): Promise<DrillReveal | null> {
  const [row] = (await db().execute(sql`
    select d.bug_line as "bugLine", d.bug_class as "bugClass", d.explanation,
           d.broken_code as broken, sc.code as original, d.answered_at as "answeredAt",
           d.picked_line as "pickedLine", d.correct, d.answer_ms as "answerMs"
    from bug_drills d
    left join submission_code sc on sc.submission_id = d.source_submission_id
    where d.id = ${id} and d.user_id = ${userId}`)) as unknown as {
    bugLine: number;
    bugClass: string;
    explanation: string;
    broken: string;
    original: string | null;
    answeredAt: string | null;
    pickedLine: number | null;
    correct: boolean | null;
    answerMs: number | null;
  }[];
  if (!row || !isBugClass(row.bugClass)) return null;
  let correct = row.correct ?? false;
  let picked = row.pickedLine;
  let spent = row.answerMs ?? 0;
  if (!row.answeredAt) {
    picked = pickedLine;
    correct = pickedLine === row.bugLine;
    spent = Math.round(Math.min(Math.max(ms, 0), 30 * 60_000));
    await db().execute(sql`
      update bug_drills set answered_at = now(), picked_line = ${picked},
             correct = ${correct}, answer_ms = ${spent}
      where id = ${id} and user_id = ${userId} and answered_at is null`);
  }
  return {
    correct,
    pickedLine: picked,
    bugLine: row.bugLine,
    bugClass: row.bugClass,
    explanation: row.explanation,
    was: row.original?.split("\n")[row.bugLine - 1]?.trim() ?? null,
    now: row.broken.split("\n")[row.bugLine - 1]?.trim() ?? "",
    ms: spent,
  };
}

/** "This isn't a bug": the drill is dropped and never counts. */
export async function discardDrill(userId: string, id: string): Promise<void> {
  await db().execute(sql`
    update bug_drills set answered_at = coalesce(answered_at, now()), correct = null
    where id = ${id} and user_id = ${userId}`);
}

export type DrillStats = {
  total: number;
  caught: number;
  /** Median time of the catches, ms. */
  medianMs: number | null;
  byClass: Partial<Record<BugClass, { caught: number; missed: number }>>;
};

export async function getDrillStats(userId: string): Promise<DrillStats> {
  "use cache";
  cacheTag(userTag(userId));
  cacheLife("minutes");
  const rows = (await db().execute(sql`
    select bug_class as "bugClass", correct, answer_ms as ms from bug_drills
    where user_id = ${userId} and answered_at is not null and correct is not null`)) as unknown as {
    bugClass: string;
    correct: boolean;
    ms: number | null;
  }[];
  const byClass: DrillStats["byClass"] = {};
  const times: number[] = [];
  for (const r of rows) {
    if (!isBugClass(r.bugClass)) continue;
    const c = (byClass[r.bugClass] ??= { caught: 0, missed: 0 });
    if (r.correct) {
      c.caught++;
      if (r.ms !== null) times.push(r.ms);
    } else c.missed++;
  }
  times.sort((a, b) => a - b);
  return {
    total: rows.length,
    caught: rows.filter((r) => r.correct).length,
    medianMs: times.length ? times[Math.floor(times.length / 2)]! : null,
    byClass,
  };
}
