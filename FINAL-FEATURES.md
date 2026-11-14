# Final feature list

The features we have agreed to build, picked from `PRODUCT-IDEAS.md`. Each one keeps its
idea number there for the full write-up. Items are added only once you confirm them.

## Accepted

| #   | Feature                  | Source     | Needs                                          |
| --- | ------------------------ | ---------- | ---------------------------------------------- |
| A1  | Watched it? Prove it     | 2.1        | No migration                                   |
| A2  | WA autopsy + bug profile | 7.1.3      | AI API; stores Wrong Answer code (migration)   |
| A3  | Spot your bug            | 7.1.4, 4.2 | AI API; stored accepted code (code vault, 3.5) |
| A4  | Proof it stuck           | 8.2.6      | No migration                                   |
| A5  | Revise the pattern       | 8.2.5      | No migration                                   |
| A6  | Badges v2: milestones    | new        | No migration                                   |

### A1. Watched it? Prove it

If you watched the solution video for a problem before your Accepted, the solve is counted
as "saw solution" automatically and a solo re-solve is booked for tomorrow. Uses
`video_watches` plus the honesty answer we already store.

### A2. WA autopsy + bug profile

- The extension captures the code of each Wrong Answer (and TLE/RE) submission.
- An AI model names the bug class: off-by-one, integer overflow, wrong base case, unhandled
  duplicate or empty input, wrong loop bound, and so on. It pre-fills the wrap-up mistake tags;
  you can accept or change them.
- **Bug profile:** a page that counts your bug classes over time, with trends and one line of
  advice for your top class ("You've overflowed on multiplication 7 times. Check constraints
  before you code."). The top classes also feed the existing pre-submit checklist.

### A3. Spot your bug

- AI takes one of your own accepted solutions and breaks it with one of your top bug classes
  from the bug profile (A2).
- You get the broken code and a failing input; find the bug in about 90 seconds. Works on
  the phone.
- Results feed back into the bug profile: classes you catch quickly fade, classes you miss
  come back more often.

### A4. Proof it stuck

The payoff of revision, shown from sessions we already store: "First solve: 42 min, with a
hint. Re-solve 7 days later: 11 min, solo." One line on the problem page (first session vs
latest revision), and a "stuck this week" count in the weekly review. Shown only once a
problem has a re-solve, so it never reads as empty.

### A5. Revise the pattern, not just the problem

When a revision is due, two choices:

- **Re-solve it** (as today): tests memory of this problem.
- **Solve a sibling**: an unseen problem with the same pattern, picked from the
  similar-problems data. A solo sibling solve clears the revision and moves it further up
  the ladder than a plain re-solve, because it proves transfer, which is what interviews test.

If the sibling goes badly (hint or saw solution), the original stays due and the sibling
joins revision too. Rules for picking: not solved before, same main pattern, difficulty no
higher than the original on the first try.

### A6. Badges v2: milestones you can read

What's wrong today (`lib/badges.ts`, `components/badges.tsx`):

- How to earn a badge lives only in a hover tooltip, so on phones and at a glance you
  can't tell what a badge is for.
- Tiered families collapse into one tile, so "100 Club" hides that 50 came before and 250
  comes next.
- Solved tiers jump 50 → 100 → 250 → 500 → 1000; the gaps after 100 are too long to feel.

What changes:

- **Visible description on every tile.** One short line under the name: locked tiles say
  how to earn it ("Solve 150 problems, any platform"), earned ones say what you did
  ("150 solved · Oct 12"). Plus "12 to go" on the nearest locked tile.
- **Problems-solved milestones, every 50 to 250:** 50, 100, 150, 200, 250, then 300, 400,
  500, 750, 1000 for long-term users. Total solves across all platforms. Each milestone is
  its own tile.
- **One consistent design per family.** Milestone tiles share a medal shape with the number
  large in the centre ("150"); the metal steps up with the tier (bronze 50–100, silver
  150–200, gold 250–500, holo foil 750+), so a row reads like a ladder. Streak (7, 30, 60,
  100, 365 days) and graduated-from-revision get the same treatment in their own tone.
- **Earned date** for solve milestones comes from the date of your Nth Accepted, so it
  needs no badge table.
- **Tap a tile** for a small sheet: what it is, how to earn it, progress, earned date.
- **Shelf order:** next-up (nearest locked) first, then earned, then the rest locked;
  families grouped in rows. The existing badge-earned celebration stays.

**Order:** A1, A4 and A6 first (no dependencies, no migration). A5 next. A2 before A3, since
A3 uses A2's bug classes and needs stored code.

## Status (14 Nov 2026)

- **Shipped** in 4aa8aca: A1, A4, A5, A6.
- **Waiting on decisions:** A2, A3 (AI provider, code storage, migration).

## Cut

- Plan my week (2.6).

## Decisions these need

1. **AI provider and cost:** A2 and A3 need a model API. Free for everyone, or part of a Pro plan?
2. **Code storage:** A2 and A3 store users' code. That needs a privacy-policy line and a delete button.
3. **Migration:** a table for captured submission code and bug classes. I'll write the SQL and
   you run it before any code that reads it is pushed.
