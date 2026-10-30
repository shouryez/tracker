import assert from "node:assert/strict";
import { test } from "node:test";
import { localDate, localDay, localWeekStart, tzOffsetMs } from "./time.ts";

test("offsets", () => {
  assert.equal(tzOffsetMs("Asia/Kolkata", Date.UTC(2026, 9, 26)), 19_800_000);
  assert.equal(tzOffsetMs("UTC", Date.UTC(2026, 9, 26)), 0);
  assert.equal(tzOffsetMs("America/New_York", Date.UTC(2026, 0, 15)), -5 * 3_600_000);
});

test("local day in IST", () => {
  // 20:00 UTC on the 25th is 01:30 on the 26th in India.
  const { start, end } = localDay("Asia/Kolkata", Date.UTC(2026, 9, 25, 20));
  assert.equal(new Date(start).toISOString(), "2026-10-25T18:30:00.000Z");
  assert.equal(end - start, 86_400_000);
  assert.equal(localDate("Asia/Kolkata", Date.UTC(2026, 9, 25, 20)), "2026-10-26");
});

test("local week starts Monday", () => {
  // Wednesday 28 Oct 2026, 10:00 IST → Monday 26 Oct 00:00 IST = 25 Oct 18:30 UTC.
  const start = localWeekStart("Asia/Kolkata", Date.UTC(2026, 9, 28, 4, 30));
  assert.equal(new Date(start).toISOString(), "2026-10-25T18:30:00.000Z");
  // Sunday night stays in the same week.
  const sunday = localWeekStart("Asia/Kolkata", Date.UTC(2026, 10, 1, 17));
  assert.equal(sunday, start);
});

// DsaKaro
