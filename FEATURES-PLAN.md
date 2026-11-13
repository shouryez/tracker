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

Recommended order: **F1 → F2 → F3+F4 → F5+F7 → F6+F8**, then M1 as the first migration.
Each lands as its own commit with screenshots, per the FRONTEND-PLAN checklist.
