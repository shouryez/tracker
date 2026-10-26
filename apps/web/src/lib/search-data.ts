import "server-only";
import { sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { TOPICS, type Difficulty } from "@upsolve/core";
import { db, userTag } from "@/lib/db";

// Header search. Callers pass a session-resolved user id.

export type SearchResults = {
  problems: {
    id: string;
    title: string;
    difficulty: Difficulty | null;
    solved: boolean;
    sheets: number;
  }[];
  sheets: { slug: string; name: string; author: string | null }[];
  topics: { id: string; label: string }[];
};

/** Escapes LIKE wildcards so "%" and "_" are matched literally. */
const likeEscape = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

export async function search(userId: string, query: string): Promise<SearchResults> {
  "use cache";
  cacheTag(userTag(userId), "sheets");
  cacheLife("minutes");

  const q = query.trim().toLowerCase();
  const like = `%${likeEscape(q)}%`;
  const [problems, sheets] = await Promise.all([
    db().execute(sql`
      select p.id, p.title, p.difficulty,
             exists (
               select 1 from submissions s join platform_problems pp on pp.id = s.platform_problem_id
               where s.user_id = ${userId} and s.verdict = 'AC' and pp.problem_id = p.id
             ) as solved,
             (select count(distinct si.sheet_id)::int from sheet_items si where si.problem_id = p.id) as sheets
      from problems p
      where lower(p.title) like ${like}
      order by (lower(p.title) = ${q}) desc, (lower(p.title) like ${`${likeEscape(q)}%`}) desc,
               sheets desc, length(p.title)
      limit 30`),
    db().execute(sql`
      select slug, name, author from sheets
      where lower(name) like ${like} or lower(coalesce(author, '')) like ${like}
      order by position`),
  ]);

  return {
    problems: problems as unknown as SearchResults["problems"],
    sheets: sheets as unknown as SearchResults["sheets"],
    topics: TOPICS.filter((t) => t.label.toLowerCase().includes(q)).map((t) => ({
      id: t.id,
      label: t.label,
    })),
  };
}
