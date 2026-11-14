import "server-only";
import { sql } from "drizzle-orm";
import { bugFindings } from "@upsolve/db";
import { aiModel, chatJson } from "@/lib/ai";
import { BUG_CLASSES, isBugClass } from "@/lib/bug-classes";
import { db } from "@/lib/db";

// WA autopsy (FINAL-FEATURES A2): one model call per failed submission names the bug class,
// the line and what went wrong, from the code and the failing test the judge reported.

const FAILED = new Set(["WA", "TLE", "RE", "MLE"]);
const VERDICT_TEXT: Record<string, string> = {
  WA: "Wrong Answer",
  TLE: "Time Limit Exceeded",
  RE: "Runtime Error",
  MLE: "Memory Limit Exceeded",
};

const SYSTEM = `You review one failed competitive-programming submission and name its bug.
Reply with one JSON object and nothing else:
{"bug_class": "<one of: ${Object.keys(BUG_CLASSES).join(", ")}>",
 "line": <1-based line number of the bug, or null>,
 "explanation": "<one or two short sentences, second person, about this code only>"}
Rules: pick the single most likely class. Never write corrected code or the full solution, and never name the approach or data structure that would fix it: say what is wrong, not what to use instead.
Never reveal the intended algorithm beyond naming what this code does wrong.`;

export async function runAutopsy(userId: string, submissionId: string): Promise<boolean> {
  const [row] = (await db().execute(sql`
    select s.verdict, s.language, sc.code, sc.failing_input as "failingInput",
           sc.expected, sc.actual, coalesce(p.title, pp.title) as title
    from submissions s
    join submission_code sc on sc.submission_id = s.id
    join platform_problems pp on pp.id = s.platform_problem_id
    left join problems p on p.id = pp.problem_id
    where s.id = ${submissionId} and s.user_id = ${userId}
      and not exists (select 1 from bug_findings bf where bf.submission_id = s.id)`)) as unknown as {
    verdict: string;
    language: string | null;
    code: string;
    failingInput: string | null;
    expected: string | null;
    actual: string | null;
    title: string;
  }[];
  if (!row || !FAILED.has(row.verdict)) return false;

  const numbered = row.code
    .split("\n")
    .map((l, i) => `${String(i + 1).padStart(3)}| ${l}`)
    .join("\n");
  const user = [
    `Problem: ${row.title}`,
    `Verdict: ${VERDICT_TEXT[row.verdict] ?? row.verdict}`,
    row.failingInput ? `Failing input:\n${row.failingInput}` : null,
    row.expected ? `Expected output:\n${row.expected}` : null,
    row.actual ? `Your output:\n${row.actual}` : null,
    `Code (${row.language ?? "unknown language"}), with line numbers:\n${numbered}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const out = await chatJson(SYSTEM, user, { maxTokens: 300 });
  if (!out || !isBugClass(out.bug_class) || typeof out.explanation !== "string") return false;
  const lines = row.code.split("\n").length;
  const line =
    typeof out.line === "number" && Number.isInteger(out.line) && out.line >= 1 && out.line <= lines
      ? out.line
      : null;
  await db()
    .insert(bugFindings)
    .values({
      submissionId,
      userId,
      bugClass: out.bug_class,
      explanation: out.explanation.trim().slice(0, 400),
      line,
      model: aiModel(),
    })
    .onConflictDoNothing();
  return true;
}
