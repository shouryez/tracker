# DsaKaro: next features plan

> **Status:** proposal, waiting for the owner's pick. Working rules, codebase map and build
> checks are in `FRONTEND-PLAN.md` §1–2 and apply here unchanged (commit+push both remotes,
> no secrets, the owner runs every migration, design-only unless an item says otherwise).
> Written 2026-11-13.

The gap in the market (and in our app): the tools people actually use split tracking,
spaced revision, mock interviews and readiness across different products. We already own
tracking + revision; the features below close the loop from "I practise" to "I'm ready".

---

## Tier 1 — no migration, highest value

### F1. Mock interview mode

The `practice_sessions.mode` enum already has `"interview"`; nothing uses it. Build the room:

- **Route** `/dashboard/interview`. Setup card: length (30 / 60 / 90 min), mix (1E+1M, 2M,
  1M+1H, 2M+1H), source (my sheets' unsolved → weakest topics → random unsolved) via
  `getNextCandidates` + sheet data.
- **Start**: picks the set (hidden titles until start), opens a focus session labelled
  `Mock interview · <mix>`, split-flap countdown, problems listed with "open" buttons; the
  extension times each as usual. No hints UI, no notes, no peek cards (suppressed on this
  page).
- **End** (time up or Finish): scorecard — solved / total, per-problem time vs the B2 median
  when available, honesty answers, and "what an interviewer would say" line derived from the
  mix (e.g. solved the medium but 2× median time). Prints as a receipt variant; saved like
  any session so it shows on Sessions; `feel.milestone()` on a clean sweep.
- **Insights**: a "Mock interviews" row (count, pass rate) once ≥1 exists.
- Files: `app/dashboard/interview/page.tsx`, `components/interview/*`, one server action to
  draw the set; no schema change.

### F2. Interview readiness score

One explainable number, 0–100, on Insights (and the share card later):

- `lib/readiness.ts` (pure + tested):
  - 40 pts topic coverage: mean of `masteryOf` scores over the 10 core topics (missing topic = 0).
  - 20 pts revision health: pass rate last 30 days × (1 − overdue backlog share).
  - 15 pts consistency: active days in the last 28 (cap at 20) + current streak bonus.
  - 15 pts speed: your median medium solve time vs 35 min reference (and vs B2 medians where known).
  - 10 pts difficulty mix: mediums+hards share of the last 50 solves.
- Insights card: a dial (FocusOrb-style bezel, mint arc), the five bars with the exact
  arithmetic shown, and the **two cheapest next points** ("Clear 3 overdue revisions → +4").
- Nothing stored; computed from `getLearning`, `getAnalytics`, stats.

### F3. Practice calendar (month view)

A real calendar, on Insights (tab) — the heatmap shows the past, nothing shows the future:

- Month grid: past days = solved count + focus hours (tint by activity); future days = due
  revision load (from `queue.upcoming`) + contest chips (from `getContests`); today ringed.
- Click a day: a frosted popover with that day's solves / due list / contests.
- Pure render from existing data; `components/practice-calendar.tsx`.

### F4. Calendar subscribe (ICS feed)

Revisions and contests inside Google Calendar / phone calendars:

- `GET /api/calendar/[token]/feed.ics`, `token = HMAC-SHA256(userId, EXT_TOKEN_SECRET)`-style
  (derived from an existing server secret — **no migration**, revocation = changing the
  secret; stated in the UI). Events: one all-day "N revisions due · DsaKaro" per day for the
  next 30 days, plus upcoming contests for connected platforms.
- Settings → Reminders gains "Subscribe in your calendar" with copy button + Google link.

### F5. Log a solve by hand

For solves the extension can't see (phone, a friend's laptop, whiteboard):

- "Log a solve" in the problem page actions + command palette: minutes spent, solo/hint/
  solution, date (default today). Inserts a `practice_sessions` row (`source` stays honest:
  `clientId: "manual"`, `tracked: false` semantics kept) → feeds the ladder, streak and stats
  exactly like a synced solve. Table and columns already exist.

### F6. Notes v2

- Render notes and takeaways with code fences: ``` blocks get a mono panel with a tiny
  built-in highlighter (keywords/strings/numbers/comments for C++, Java, Python, JS — regex,
  no library), inline `code`, and auto-linked URLs. Edit stays a plain textarea; a preview
  toggle appears only when the note contains markup.
- A "Template" button inserts: Approach / Complexity / Edge cases / Mistake to remember.
- Same renderer reused in the Library and session wrap-ups.

### F7. Search filters

`/dashboard/search` gains chips: difficulty (E/M/H), status (solved / unsolved / due),
topic (from `TOPICS`) — all GET params so results stay shareable; server filters in
`search-data.ts` (query tweaks only, no schema).

### F8. Small but sharp

- **Session goal**: starting a study session can take "aim for N problems"; the receipt and
  the notch show progress (localStorage, no schema).
- **Rest-day guard**: streak ≥ 14 and focus trending down ≥ 3 days → one quiet card on Today
  suggesting a planned freeze day (uses existing streak freezes; never a pop-up).
- **Palette**: "Log a solve", "Start a mock interview" actions.

## Tier 2 — needs a migration (owner runs it; ask per item)

| #   | Feature                                                                                                                                                         | Schema change                                 | Why it's worth it                                                                                   |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| M1  | **Placement countdown**: set a target date; Today shows the countdown, weekly targets auto-scale to the weeks left, readiness (F2) projects "on track / behind" | `profiles.target_date date` (1 column)        | Turns the whole app into a plan toward a date; cheapest migration with the biggest behaviour change |
| M2  | **Custom sheets**: paste LeetCode URLs (or pick from search) → a personal sheet with the same ticking, progress and covers                                      | `custom_sheets` + `custom_sheet_items` tables | The most-requested thing in every tracker community; we already have all the sheet UI               |
| M3  | **Duels**: challenge a group member to the same unsolved problem; first AC (extension-verified) wins; result on the group feed                                  | `duels` table                                 | Social retention; pairs with nudges (B9)                                                            |
| M4  | **Custom revision ladder**: choose intervals (e.g. 1·2·5·10·21·45 for a near exam)                                                                              | `profiles.intervals jsonb`                    | Power users + exam crunch; scheduler already takes intervals as input                               |

## Tier 3 — the inventive set (no one else can build these; our data makes them possible)

### F9. Ghost race: beat your past self

Every solved problem stores your best active time (`state.bestMs`). On a re-solve, race it:

- Revision rows and the deck show "your record: 18:42". Opening a re-solve arms the ghost;
  the extension timer page is untouched, but when the solve lands, DsaKaro compares times:
  beat it → "6:12 faster than March you", confetti pixel carries the delta into the toast.
- The problem page gets a tiny two-lane race bar (then vs now) in the attempt timeline.
- Pure read of existing data + one comparison at ingest display time. No schema change.

### F10. Plan-first gate

The habit that actually passes interviews: say the approach before touching the keyboard.

- On a problem page (and in mock interviews), "Plan first" box: one or two lines, 60-second
  soft timer, then the Solve buttons light up. Saved as a prefix in the problem note
  (`> Plan: …`), so after the solve you see your plan next to what actually worked.
- Weekly review counts "planned solves" vs blind ones and their pass rates — the data will
  show plans win, which teaches the habit better than any lecture. Note column exists.

### F11. Stuck rescue

The extension already knows you've been on one problem for 25+ minutes with no submits
(`NowSolving` has the live session). When that happens, the Today card offers a rescue path
instead of letting you rot:

- A structured de-stuck checklist, one step at a time: re-read constraints aloud → state the
  brute force and its complexity → name the pattern family (Recall-style multiple choice) →
  take the hint honestly → or bank it: "save and move on", which snoozes it onto Today with
  a "came back stuck" tag in the note.
- No nagging: appears once per session, dismissible, never a notification. Web-only read of
  the live session; no schema change.

### F12. Night-before sheet

One click before an interview or exam: a printable single page compiled from _your_ data —
your top takeaway per weak topic, your three most-repeated mistake tags with the one-line
fix you wrote, the problems that failed a review twice (titles only, as prompts), and the
pattern → signal table from Recall. Print CSS exists; this is a curated server component at
`/dashboard/notebook/crib`. No schema change.

### F13. Progress mirror

"You, 90 days ago" — replay `getLearning` history with a cutoff and diff it against today:
topics that went from 20 → 70 mastery, median medium time then vs now, ladder population
then vs now. One card on Insights with a slider (30/90/180 days) and a shareable
`api/share-card?mirror=90` variant. All derivable from event history; no schema change.

### F14. Warm-up button

Procrastination killer on Today: "Warm up (5 min)" opens the easiest problem you've already
solved and are due to see again anyway (or any old easy), with a 5-minute cap on the clock.
Finishing the warm-up triggers the "start a real session?" prompt. One picker function; no
schema change.

### F15. Quick-check revision (tiered re-solves)

Re-solving every ring-5 problem in full wastes hours. For rungs 4+ only: a "Quick check"
path on the deck and queue — recall the approach, reveal your own takeaway, self-grade.
Rungs 1–3 and anything that failed its last review still require a real re-solve (the
button simply isn't offered). Grades log through the existing events; the gate is UI logic.
Cuts revision time roughly in half at the top of the ladder without going soft on new
memories. No schema change.

### F16. LeetCode Daily on Today

Server-side fetch of LeetCode's public daily-challenge endpoint (no key), cached for the
day: a "Daily challenge" suggestion chip on Today with one-tap add. Small, loved, sticky.
No schema change.

### F17. Takeaway cards

After a solve with a written takeaway, offer "Share this insight": a next/og card — problem
title, your one-line takeaway, your handle, the DSA करो mark — sized for WhatsApp/X. Every
share is marketing with substance. Route only; no schema change.

### F18. Rubber-duck recorder (local only)

In mock interviews and on hard problems: "Explain your approach out loud — 90 seconds."
Records with MediaRecorder, plays back, and is **never uploaded** (kept in memory /
IndexedDB on that device, stated plainly). Communication is the half of interviews nobody
practises; this makes it a one-button habit. No schema change; mic permission prompt.

## Tier 3-M — inventive, but migration-gated

| #   | Feature         | Schema change                                   | Idea                                                                                                                                                                               |
| --- | --------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M5  | **Power hour**  | `sprints` table (group, starts_at, problem ids) | A group schedules a synced 60-minute sprint: same 3 problems for everyone, live room leaderboard while it runs, receipt for the group after. Rooms and presence already exist      |
| M6  | **Calibration** | `recall_answers.confidence smallint`            | Recall asks "sure / think so / guessing" before revealing; Insights draws your calibration curve ("when you say sure, you're right 94%") — the metacognition metric no tracker has |

Recommended order: **F1 → F2 → F3+F4 → F5+F7 → F6+F8**, then M1 as the first migration.
From tier 3, the highest value per effort: **F9, F15, F14, F12, F16** (all tiny-to-medium, no
migrations), then F10, F13, F17, F11, F18.
Each lands as its own commit with screenshots, per the FRONTEND-PLAN checklist.

## Build log

- F1 mock interview, F2 readiness score, F3 practice calendar, F4 ICS feed: shipped.
- F5 log a solve (problem page + palette), F7 search filters: shipped.
- F6 notes v2 (code fences, highlighter, inline code, links, template, preview; notebook and
  session notes), F8 session goal (notch + receipt), rest-day guard on Today, palette
  "Log a solve": shipped.
- Next: tier 3 in order F9, F15, F14, F12, F16, then F10, F13, F17, F11, F18. Tier 2 waits on
  migrations.
