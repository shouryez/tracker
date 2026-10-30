"use server";

import { getCurrentUser, isDemoUser } from "@/lib/auth";
import { search } from "@/lib/search-data";

export type QuickResult = {
  id: string;
  title: string;
  difficulty: "easy" | "medium" | "hard" | null;
  solved: boolean;
};

/** Top problem matches for the command palette. */
export async function quickSearch(query: string): Promise<QuickResult[]> {
  const q = typeof query === "string" ? query.trim().slice(0, 100) : "";
  if (q.length < 2) return [];
  const user = await getCurrentUser();
  if (isDemoUser(user)) return [];
  const r = await search(user.id, q);
  return r.problems.slice(0, 8).map((p) => ({
    id: p.id,
    title: p.title,
    difficulty: p.difficulty,
    solved: p.solved,
  }));
}

// DsaKaro
