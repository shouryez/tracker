"use server";

import { and, eq } from "drizzle-orm";
import { updateTag } from "next/cache";
import { z } from "zod";
import { sheetItems, sheetMarks, sheetStars, sheets, userSheets } from "@upsolve/db";
import { getCurrentUser, isDemoUser } from "@/lib/auth";
import { db, userTag } from "@/lib/db";

const Id = z.uuid();
const ItemKey = z.string().min(1).max(200);

export async function setSheetFollowed(sheetId: string, follow: boolean): Promise<void> {
  const user = await getCurrentUser();
  if (isDemoUser(user) || !Id.safeParse(sheetId).success) return;
  if (follow) {
    const [sheet] = await db().select({ id: sheets.id }).from(sheets).where(eq(sheets.id, sheetId));
    if (!sheet) return;
    await db().insert(userSheets).values({ userId: user.id, sheetId }).onConflictDoNothing();
  } else {
    await db()
      .delete(userSheets)
      .where(and(eq(userSheets.userId, user.id), eq(userSheets.sheetId, sheetId)));
  }
  updateTag(userTag(user.id));
}

/** Ticks or unticks an item by hand. */
export async function setSheetItemDone(
  sheetId: string,
  itemKey: string,
  done: boolean,
): Promise<void> {
  const user = await getCurrentUser();
  if (isDemoUser(user) || !Id.safeParse(sheetId).success || !ItemKey.safeParse(itemKey).success) {
    return;
  }
  if (done) {
    const [item] = await db()
      .select({ key: sheetItems.itemKey })
      .from(sheetItems)
      .where(and(eq(sheetItems.sheetId, sheetId), eq(sheetItems.itemKey, itemKey)));
    if (!item) return;
    await db()
      .insert(sheetMarks)
      .values({ userId: user.id, sheetId, itemKey })
      .onConflictDoNothing();
  } else {
    await db()
      .delete(sheetMarks)
      .where(
        and(
          eq(sheetMarks.userId, user.id),
          eq(sheetMarks.sheetId, sheetId),
          eq(sheetMarks.itemKey, itemKey),
        ),
      );
  }
  updateTag(userTag(user.id));
}

/** Stars or unstars an item to come back to. */
export async function setSheetItemStarred(
  sheetId: string,
  itemKey: string,
  starred: boolean,
): Promise<void> {
  const user = await getCurrentUser();
  if (isDemoUser(user) || !Id.safeParse(sheetId).success || !ItemKey.safeParse(itemKey).success) {
    return;
  }
  if (starred) {
    const [item] = await db()
      .select({ key: sheetItems.itemKey })
      .from(sheetItems)
      .where(and(eq(sheetItems.sheetId, sheetId), eq(sheetItems.itemKey, itemKey)));
    if (!item) return;
    await db()
      .insert(sheetStars)
      .values({ userId: user.id, sheetId, itemKey })
      .onConflictDoNothing();
  } else {
    await db()
      .delete(sheetStars)
      .where(
        and(
          eq(sheetStars.userId, user.id),
          eq(sheetStars.sheetId, sheetId),
          eq(sheetStars.itemKey, itemKey),
        ),
      );
  }
  updateTag(userTag(user.id));
}

// DsaKaro
