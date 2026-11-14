"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { aiEnabled } from "@/lib/ai";
import { getCurrentUser, isDemoUser } from "@/lib/auth";
import { userTag } from "@/lib/db";
import {
  discardDrill,
  gradeDrill,
  makeDrill,
  type DrillReveal,
  type MakeResult,
} from "@/lib/drills";

const Id = z.uuid();

/** Spot your bug: a fresh drill from one of your accepted solutions. */
export async function startDrill(): Promise<MakeResult> {
  const user = await getCurrentUser();
  if (isDemoUser(user) || !aiEnabled()) return { ok: false, reason: "ai" };
  return makeDrill(user.id);
}

/** Your pick (null when time ran out); returns the answer. */
export async function answerDrill(
  id: string,
  pickedLine: number | null,
  ms: number,
): Promise<DrillReveal | null> {
  const user = await getCurrentUser();
  if (isDemoUser(user) || !Id.safeParse(id).success) return null;
  const line = pickedLine === null || !Number.isInteger(pickedLine) ? null : pickedLine;
  const reveal = await gradeDrill(user.id, id, line, Number.isFinite(ms) ? ms : 0);
  updateTag(userTag(user.id));
  return reveal;
}

/** "This isn't a bug": drops the drill so it never counts. */
export async function dropDrill(id: string): Promise<{ ok: boolean }> {
  const user = await getCurrentUser();
  if (isDemoUser(user) || !Id.safeParse(id).success) return { ok: false };
  await discardDrill(user.id, id);
  updateTag(userTag(user.id));
  return { ok: true };
}
