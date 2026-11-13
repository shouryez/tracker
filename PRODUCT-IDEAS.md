# DsaKaro product ideas, from the user's side

A walk through the product as a student uses it across a week and a placement season, and
what would make each moment simpler. These are for discussion, not a build plan. Nothing here
repeats FEATURES-PLAN.md (F1–F18, M1–M6); where an idea builds on one of those, it says so.

Tags on each idea:

- **Effort:** S (a day or two), M (a few days), L (a week or more).
- **Data:** "have it" means it runs on data we already store. "Migration" means a schema change you'd run.

---

## 1. The lens: a week in the life

Riya is a 3rd-year B.Tech student at a tier-2 college. She's on step 9 of Striver A2Z, has
about 180 problems solved on LeetCode, does the GFG problem of the day for the coins, and sometimes
enters Codeforces Div 3. Placements start in July.

Her tools today are LeetCode, GFG, takeUforward and YouTube (Striver). Notes live in Notion
or a paper notebook. She has a college coding WhatsApp group and a friends group, a Google
Sheet of applications, and the training and placement office's (TPO's) Excel file of company dates.

| Moment                           | What she does now                                     | What DsaKaro does today                                                         | The gap                                                                                            |
| -------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| In class, on her phone           | A "solve this" link lands in WhatsApp; she forgets it | Save for later works only from the desktop extension                            | No way to send things to DsaKaro from a phone; not much to do on a phone without coding            |
| 20 free minutes between lectures | Scrolls, because nothing feels worth 20 minutes       | Today's list, revisions and Recall exist, but she has to pick                   | Nothing turns "I have 20 minutes" into a plan                                                      |
| Evening coding                   | Watches the Striver video first, then "solves" it     | Timer, honest answer, hints, a pre-submit checklist and takeUforward (TUF) sync | Watching the solution first isn't counted as "saw solution"; the 40 seconds that mattered are lost |
| Stuck                            | Asks the WhatsApp group and waits                     | A generic hint ladder (topic, then key idea, then her own old note)             | Friends who solved it solo, and how they cracked it, are already in our data, unused               |
| Night contest                    | Plays the contest, forgets to upsolve                 | An upsolve list on Contests                                                     | No deadline, no plan, no look back at the contest                                                  |
| OA notice, 3 days out            | Googles "Amazon OA questions" and grabs random lists  | Mock interviews and readiness                                                   | No company crash plan, no OA simulation, no "what was asked at our campus"                         |
| Interview eve                    | Can't find her own code; notes are scattered          | Notebook and notes v2                                                           | We never keep her code                                                                             |
| Semester exams                   | Her streak dies and the revision pile explodes to 60  | Streak freezes and a revision cap                                               | No exam mode, and no way back from a big overdue pile                                              |
| Resume                           | Posts a LeetCode count screenshot                     | Public profile and share cards                                                  | No proof of _how_ she practises, which is the one thing we can verify                              |

---

## 2. Fusions: two features we already have, one new thing

These are the strongest ideas: each one joins pieces that already exist, so most are cheap.

### 2.1 "Watched it? Prove it"

**Joins:** the in-app video player log (`video_watches`, already linked to a sheet item) and the honest answer plus the revision ladder.

- If you watched a problem's solution video before your Accepted, the solve is recorded as
  "saw solution" by itself (one-tap undo), and a solo re-solve is booked for tomorrow.
- An optional "try first" gate: opening the video of a problem you haven't attempted yet asks
  "Give it 10 minutes first?" with a one-tap start. It never blocks the video.
- **Why it matters:** it cures tutorial hell and keeps stats honest without asking anything.
- **Effort** S–M · **Data:** have it.

### 2.2 "The 40 seconds that matter"

**Joins:** Save for later's video timestamp (`saved_items.at_seconds`) and revision cards.

- While watching an explanation, one button marks "this is the trick" at the current second.
- The clip lands on the problem's note as a `▶ 12:40` link.
- In revision, grading "shaky" or "forgot" offers "Re-watch the 40 seconds" (an embedded player
  with start and end times) instead of the whole 28-minute video.
- **Effort** M · **Data:** have it; it can reuse `saved_items` with a new `kind`.

### 2.3 Friend hints

**Joins:** wrap-up takeaways, groups and the extension's hint ladder.

- Today's ladder goes from topic, to key idea, to your own old note. Add a top rung:
  **"How a friend cracked it"**. These are takeaways from group members who solved it solo,
  for example "sort by end time, then greedy".
- Opening it records your solve as "hint", so stats stay honest.
- Groups only, and a group can turn it off.
- **Effort** S · **Data:** have it.

### 2.4 Ask someone who solved it solo

**Joins:** the honest answer data, groups and nudges.

- On a problem you're stuck on: "Aman and 2 others in your groups solved this solo."
- One tap sends Aman a doubt ping with the problem. His one-line reply appears in your
  extension panel.
- Helpers get a "helped 12 people" line on their profile.
- **Why it matters:** the right person gets the doubt, instead of 200 people in a group chat.
- **Effort** M · **Data:** a small migration (`doubts`), or reuse nudges with a payload.

### 2.5 "I have 20 minutes"

**Joins:** your median times per difficulty, the revision queue, the next-problem picker and Recall.

- A time chip on Today and in Ctrl K: 10 / 20 / 45 / 90 minutes. It returns a playlist that
  fits your own pace, for example:
  - "3 revisions (about 12 minutes for you) and one Recall round", or
  - "One medium from step 9 (about 24 minutes at your pace)".
- One tap starts a study session with that as its goal (the F8 session goal).
- **Why it matters:** it is built for the gaps in a college day.
- **Effort** S–M · **Data:** have it.

### 2.6 Plan my week

**Joins:** your pace, the practice calendar (F3), the calendar feed (F4) and weekly targets.

- Say once when you're free, for example "evenings 9–11, weekend afternoons".
- It lays the week's revisions, sheet items, upsolves and contests into real time blocks,
  sized by your pace.
- The blocks appear in Google Calendar through the existing calendar feed. Missed blocks roll forward.
- **Effort** M · **Data:** browser storage first; a profile column later.

### 2.7 Contest debt

**Joins:** the upsolve list, the revision ladder and the session receipt.

- After a contest you get a **contest receipt**: for each problem, the time spent, the
  verdict timeline the extension saw, and where you stalled.
- Unsolved problems go to Today with a 48-hour "still fresh" badge.
- Upsolves done inside that window count double toward the weekly target.
- **Effort** M · **Data:** have it.

### 2.8 OA mode

**Joins:** the mock interview room and the study session's tab tracking.

- A HackerRank-style online assessment: 2–3 problems, 90 minutes, no hints panel, and the
  clock ends it.
- The extension counts tab switches the way a proctor would: "4 tab switches; a real OA
  might flag this."
- The report reads like a real OA score.
- **Why it matters:** OAs, not interviews, are the first filter in Indian placements.
- **Effort** S–M · **Data:** have it.

### 2.9 Pair mock

**Joins:** the mock interview, the live study room and groups.

- A friend becomes the interviewer. They see your clock, verdicts and idle state live.
- They get a console to drop the next hint at a moment they choose, and a rubric to fill
  (approach, communication, code, testing).
- You get a scorecard from a human.
- **Effort** M–L · **Data:** have it; live presence already exists.

### 2.10 Recall toll

**Joins:** the study session's off-task detection and Recall.

- During a study session, switching to Instagram or a non-study YouTube tab flips the
  pop-out timer to one recall card. Answer it and the session carries on.
- It turns a distraction into a revision. Opt-in only.
- **Effort** M · **Data:** have it.

### 2.11 Exam season mode and comeback triage

**Joins:** streak freezes, the revision cap and the calendar.

- **Exam season mode:**
  - Enter semester exam dates; those days are frozen automatically.
  - Revisions are cut to the three that would decay hardest, and the daily goal hides.
- **Comeback triage**, after exams or any break of 7 days or more:
  - The overdue pile is sorted into "still solid (retire)", "quick check" (F15) and "re-solve".
  - The work is spread over 7 days, so day one isn't 63 revisions.
- **Why it matters:** it keeps the streak from dying, and keeps the app from feeling like debt after a break.
- **Effort** M · **Data:** have it.

### 2.12 Memory balance

**Joins:** the per-problem memory curve and the learning engine.

- One number on Today: "You remember about 142 of your 212 solves." It decays live, and
  each revision visibly pushes it back up.
- **Why it matters:** losing something you have pulls harder than keeping a streak.
- **Effort** S · **Data:** have it.

### 2.13 Sheet cohorts

**Joins:** sheet progress and college.

- "11 people at your college are on Striver A2Z step 9 this week."
- A cohort table, a shared study room for that step, and a "step done" moment every week.
- **Why it matters:** a lonely sheet starts to feel like a batch course.
- **Effort** M · **Data:** have it.

### 2.14 Chai pact

**Joins:** weekly targets and groups.

- Friends set a weekly pact, for example "everyone does 10 problems and clears revisions",
  with a playful forfeit ("the loser buys chai").
- Progress is tracked from verified solves. A Sunday verdict card is made for WhatsApp.
- **Effort** S–M · **Data:** a small migration (`pacts`).

### 2.15 Proof of practice

**Joins:** readiness, the public profile and share cards.

- A verified "DSA transcript" link and PDF for resumes and LinkedIn. It shows topics covered
  with grades, solo rate, consistency and contest rating, all timed by the extension.
- **Why it matters:** a LeetCode count can be padded; this shows how you practise.
- **Effort** M · **Data:** have it.

---

## 3. Big bets: bigger than a feature

### 3.1 Placement OS

- A board of companies moving through Applied → OA → Interview → Offer. It replaces the Google Sheet.
- Each company card holds:
  - its dates, in the calendar feed;
  - a **crash plan**: problems weighted to that company, crossed with your weak topics and the revisions due;
  - OA mode practice;
  - after the round, a one-minute "what was asked" form.
- **Effort** L · **Data:** migration (`applications`).

### 3.2 Campus intel

- The "what was asked" reports are matched to our problems (the cross-platform title
  matcher already exists) and grouped by college and company.
- Example: "Asked at your campus, Amazon OA 2025: two problems, one is in your Later list."
- Verified college emails already exist, so reports come from real students.
- **Why it matters:** this is a network effect no single-platform tracker can copy.
- **Needs:** moderation (report, hide, a minimum number of reports before showing).
- **Effort** L · **Data:** migration.

### 3.3 Follow a senior's path

- A placed senior (opt-in) publishes their journey: the problems they solved, in order and
  with their pace.
- Juniors follow it as a sheet, with the senior as a ghost: "Rahul was here 14 months
  before his Amazon offer."
- **Why it matters:** seniors' advice becomes something you can actually follow.
- **Effort** M–L · **Data:** have it, plus M2 custom sheets.

### 3.4 Paste anything into a sheet, and share to DsaKaro from a phone

- Paste a WhatsApp message, a LinkedIn post, a GFG interview experience or a YouTube
  playlist, and every problem in it is found (URLs and titles across LeetCode, GFG,
  Codeforces and TUF).
- One tap adds them to Later, to Today, or to a personal sheet (M2).
- On phones, DsaKaro becomes an installable app and a **share target**, so
  "Share → DsaKaro" from WhatsApp just works. We have no web app manifest yet, so this
  starts there.
- **Effort** M · **Data:** have it for Later; M2 for sheets.

### 3.5 Code vault

- The extension keeps your submitted code per attempt (LeetCode shows it to you on the
  submission page, which the extension already visits).
- That gives you:
  - your code on every problem page, and a diff against your last attempt;
  - "your binary search template", drawn from your 6 binary search solutions;
  - a printable code pack for the night before (F12);
  - the raw material for 4.2 and 4.3.
- Private to you, and deletable.
- **Effort** L · **Data:** migration, plus a privacy policy update.

### 3.6 Beyond DSA, on the same engine

- Every Indian interview round asks OS, DBMS, networks, OOP and SQL, and every OA has aptitude.
- Put them on the same revision ladder and Recall, as question and answer cards.
- Nobody revises these on a schedule; it makes DsaKaro the one place for placement prep.
- **Effort** M for the engine, ongoing for content · **Data:** migration.

### 3.7 Everywhere they practise

- Add CodeChef (contests and profile), Code360 (Coding Ninjas), InterviewBit, HackerRank and AtCoder.
- Time Codeforces problems in the page; today Codeforces data comes only from its public
  API, so those problems are never timed.
- Later, a VS Code extension for people who practise locally.
- **Effort** M each.

---

## 4. The crazy ones

1. **Solve replay.** Every timed solve is already a timeline: open, idle, away, Wrong
   Answer, Wrong Answer, Accepted. Draw it as a replay you can scrub, and race a friend's
   replay on the same problem. This extends F9 ghost race to friends.
2. **Spot your bug.** Built on the code vault: a quiz shows your own Wrong Answer code and
   asks where the bug is. Debugging your past self teaches more than any editorial.
3. **Dry-run drills ("read code").** A snippet of your own accepted code and a small input:
   predict the output in 60 seconds. It trains the dry run interviewers ask for, on code you wrote.
4. **Follow-up drills.** After an Accepted, the classic interviewer follow-ups as
   30-second cards per pattern: "What if it's a stream?", "O(1) space?", "Sorted input?".
   Rule-based from our topic guide, with AI optional later.
5. **Pattern spotting on the bus.** Swipe through statements of problems you haven't
   solved yet (from your sheets) and guess the pattern. The answer is revealed and the
   problem gets scheduled. Spotting the pattern is the real interview skill, and it needs no keyboard.
6. **Telegram (then WhatsApp) companion.** `/today` returns your plan, `/done 875` logs a
   solve, and the group leaderboard is posted on Sundays. Reminders go where students
   actually look; Telegram first because its bot API is free.
7. **Interview-day kit.** On the morning of an interview date (from Placement OS):
   a 15-minute warm-up (F14), your code pack, your top 5 mistakes, and a two-minute breathing timer.
8. **Batch dashboard for placement cells.** With students' consent, a TPO or professor sees a
   batch's readiness, topic gaps and who needs help; DSA lab classes get class sheets.
   This is how colleges would pay for DsaKaro.
9. **POTD hub.** The LeetCode, GFG and CodeChef problems of the day in one row, ticked
   automatically. It extends F16.
10. **Problem families.** Each pattern's siblings: "same trick, you've done 2 of 5."
    Solving one offers the next sibling while the idea is warm.

---

## 5. How I'd rank them

| Rank | Idea                                     | Value for students                       | Effort | Migration       |
| ---- | ---------------------------------------- | ---------------------------------------- | ------ | --------------- |
| 1    | I have 20 minutes (2.5)                  | Daily, for everyone                      | S–M    | No              |
| 2    | Watched it? Prove it (2.1)               | Fixes the most common bad habit          | S–M    | No              |
| 3    | Friend hints (2.3)                       | Unique, since only we have the data      | S      | No              |
| 4    | Memory balance (2.12)                    | Strong reason to revise                  | S      | No              |
| 5    | OA mode (2.8)                            | Right before the first filter            | S–M    | No              |
| 6    | Comeback triage and exam mode (2.11)     | Saves users we'd otherwise lose          | M      | No              |
| 7    | Contest debt (2.7)                       | Makes upsolving actually happen          | M      | No              |
| 8    | Paste anything and share target (3.4)    | Fits how students already share problems | M      | For sheets (M2) |
| 9    | Code vault (3.5)                         | Unlocks 4.2, 4.3 and the code pack       | L      | Yes             |
| 10   | Placement OS and campus intel (3.1, 3.2) | The moat and the reason to switch        | L      | Yes             |

The first seven need no migration and can ship one after another like the F series.

---

## 6. To settle when we discuss

1. **AI:** are we open to a language model (cost per user, privacy)? Every idea here works
   rule-based, but 4.4, the crash plan and campus report matching get much better with one.
2. **Code storage:** are we comfortable keeping users' code? It needs a privacy policy line and a delete button.
3. **Campus intel:** who moderates reports, and what is the minimum before anything shows?
4. **Phone:** an installable web app with a share target first, or a native app later?
5. **Colleges:** is a paid batch dashboard part of the plan?
