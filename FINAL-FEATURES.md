# Final feature list

The features we have agreed to build, picked from `PRODUCT-IDEAS.md`. Each one keeps its
idea number there for the full write-up. Items are added only once you confirm them.

## Accepted

| #   | Feature                  | Source     | Needs                                          |
| --- | ------------------------ | ---------- | ---------------------------------------------- |
| A1  | Watched it? Prove it     | 2.1        | No migration                                   |
| A2  | WA autopsy + bug profile | 7.1.3      | AI API; stores Wrong Answer code (migration)   |
| A3  | Spot your bug            | 7.1.4, 4.2 | AI API; stored accepted code (code vault, 3.5) |

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

**Order:** A1 first (no dependencies). A2 before A3, since A3 uses A2's bug classes and needs
stored code.

## Cut

- Plan my week (2.6).

## Decisions these need

1. **AI provider and cost:** A2 and A3 need a model API. Free for everyone, or part of a Pro plan?
2. **Code storage:** A2 and A3 store users' code. That needs a privacy-policy line and a delete button.
3. **Migration:** a table for captured submission code and bug classes. I'll write the SQL and
   you run it before any code that reads it is pushed.
