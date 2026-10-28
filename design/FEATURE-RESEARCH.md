# DsaKaro: feature research and roadmap (Oct 2026)

What students say they need, what DsaKaro should add or cut, and in what order. Sources are at the end; Reddit was read through mirrors and search snippets, so treat single threads as anecdotes and repeated themes as signal.

## 1. What people are saying

| Theme                                     | What we found                                                                                                                                                                                                                                                                                                                                                                                | What it means for DsaKaro                                                                                                                                                                |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Forgetting is the #1 pain**             | Many threads and at least five tools (SpacedLeet, LeetRecur, Leet Repeet, DSAPrep, CodingInterviewHQ) exist because people "forget the solution a week later". The advice that works is **active recall**: rewrite from a blank file the next day, then again days later with only a one-line pattern note; learn the pattern, not the code; solve a close variant after reading a solution. | We already schedule reviews (1→3→7→16→35→90). The gap is the **review itself**: it's "re-solve or self-grade". Add recall drills and variant problems so a review actually tests memory. |
| **Social accountability beats willpower** | YPT's appeal is groups: "seeing a peer who studied only slightly longer pushes me to keep going"; live status of friends, realtime ranking by study time. Complaints: bugs, miscounted sessions.                                                                                                                                                                                             | We have study rooms and weekly boards. Missing: a **visible study timer**, live time leaderboards, and trustworthy (not miscounted) time.                                                |
| **Streaks help, then hurt**               | Duolingo reports freezes raised daily actives; loss aversion drives streaks. But r/leetcode's top advice is "burnout kills consistency faster than rejection", and missing weeks creates guilt that drains motivation. A 45-min/day routine story (8/10 interviews passed) is widely upvoted.                                                                                                | Keep streak + exam freezes, but make the **weekly consistency score** the headline, add rest-day awareness, and reward comebacks, not just unbroken chains.                              |
| **Wrong metric**                          | "People track problems solved and streaks; interviewers grade clarity, adaptability, edge cases."                                                                                                                                                                                                                                                                                            | Shift insights from volume to **quality**: solo rate, first-try AC, retention, time-to-AC trend, explaining out loud.                                                                    |
| **Interview pressure**                    | Advice: 45-min timer, no hints, talk out loud (approach → brute force → optimise → dry run), record yourself; freezing in front of people is a separate skill.                                                                                                                                                                                                                               | An **Interview mode** session (our DB already has `session_mode = interview`) with a rubric.                                                                                             |
| **Company / OA prep (India)**             | Students ask for company-wise tags, role-specific (intern vs new grad) lists, OA formats by country; many paid PYQ sites fill this.                                                                                                                                                                                                                                                          | A **placement-season layer**: company lists, drive calendar, readiness per company. Data licensing needs care.                                                                           |
| **Difficulty ratings**                    | zerotrac's Elo ratings for LeetCode contest problems are widely used (data refreshed after each contest; backend closed).                                                                                                                                                                                                                                                                    | Use rating bands (where licensing allows) to pick "a step up" problems and show a **difficulty ladder** instead of Easy/Medium/Hard only.                                                |
| **Badges**                                | Studies: badges raise engagement short-term; skill evidence is mixed; many GitHub users hide badges.                                                                                                                                                                                                                                                                                         | Achievements must reward **real learning behaviours**, be honest about what they mean, and be hideable.                                                                                  |

## 2. Insights: keep, replace, add

Current Analytics: Active days, Solved, First-try AC, Focus, Best hours, Verdict mix, How you solved, Time per difficulty, Time per topic, Mistakes, Topic mastery.

**Cut or merge**

- _Time per difficulty_ + _Time per topic_ → merge into one **"Where your time goes"** (topic × difficulty, minutes and median) — two cards say nearly the same thing today.
- _Verdict mix_ (global) → replace with **Mistake fingerprint**: WA/TLE/RE rate _per topic_ ("DP: 41% WA, mostly edge cases"). Global verdict share isn't actionable.
- _Best hours_ → keep but change the question: **"When you solve best"** = AC rate and solo rate by hour vs. volume, not just volume.

**Add (all computable from data we already store)**

1. **Retention rate**: pass rate of reviews per ladder step (1d, 3d, 7d …). Proves spaced repetition works and shows where memory breaks.
2. **Forgetting forecast**: problems likely to be forgotten this week (overdue + low mastery + solved with hint), with "review 3 now" action.
3. **Speed trend**: median time-to-AC for Mediums by week. "You're 23% faster at Mediums than a month ago" is the single most motivating line we can show.
4. **Hint dependence**: solo rate trend over 8 weeks.
5. **Coverage map**: topics never practised vs. sheet targets (gaps, not just strengths).
6. **Readiness score** (0–100, per goal: internship / placements / FAANG / CP): weighted coverage, retention, solo rate, speed on Mediums, contest rating. Explained like the consistency score so it never feels arbitrary.
7. **DsaKaro completion**: % of contest problems finished within 7 days of each contest.

## 3. New features (ranked)

### Now (next 2–3 weeks)

**A. Focus timer, YPT-style ("Lab mode")**

- A big timer on Sessions (and a floating mini-timer in the dashboard shell): stopwatch or Pomodoro (25/5, 50/10), daily goal ring, today's total.
- The extension already times problems; extend it to a **focus session**: while Lab mode runs, time on _coding sites_ (LeetCode, GFG, Codeforces, takeUforward, NeetCode, YouTube DSA videos via allow-list) counts as **focus**; any other tab counts as **away**. Show "Focus 1h 42m · Away 18m · 3 tab switches".
- **Privacy**: never store URLs or titles of non-coding tabs; only the category ("away") and duration. Off-task tracking is opt-in and the user can see/delete it.
- Group layer: live "in Lab now" list and **today's focus leaderboard** in study rooms (we already have rooms + presence).
- Anti-miscount (YPT's main complaint): idle detection already exists; add "you were away 20 min, keep or discard?" on resume.

**B. Today plan: a to-do list that checks itself**

- Each morning DsaKaro proposes 3–6 quests: due revisions, 1 next sheet problem, 1 weak-topic stretch problem, a contest if one is today. The user can add their own tasks (e.g. "OS notes ch. 4").
- **Auto-complete**: when the extension or sync sees an Accepted on a quest's problem, the quest ticks itself (with pixel confetti). No other to-do app can do this.
- Time-block view: drag quests onto a day strip; Lab mode can start from a quest.
- Carry-over and "too much today?" trim when the user is behind (burnout guard).

**C. Achievements v1 (honest badges)**

- Reward learning, not grinding: _First 90-day pass_ (memory proven), _Solo streak_ (10 solo Mediums), _Comeback_ (back after 7+ days off), _Upsolver_ (cleared a whole contest), _Section cleared_, _Night owl / Early bird_, _Pattern hunter_ (all topics in a sheet touched), streak and consistency milestones.
- Each badge shows **rarity** (% of users who have it) and what it measures. Display on the public profile and share card; user can hide any of them.
- Pixel-art badge set matching the logo.

**D. Insight swap** from section 2 (cut/merge/add 1–4).

### Next (1–2 months)

**E. Recall drills.** A review shows the problem statement; before re-solving, the user types the pattern and key idea in two lines. The note is compared with their saved note and hidden until submitted. Also "Which pattern?" flash rounds from their own solved problems (5 cards, 2 minutes). Research-backed active recall, and quick on mobile.

**F. Variant after hint.** When a session ends with "saw the solution", queue a **redemption problem**: a similar unsolved problem (we already compute similar), due in 2–3 days.

**G. Interview mode.** 45-min session on a random unseen problem from weak topics; hints hidden; a checklist to talk through (clarify, brute force, optimise, complexity, dry run); self-score rubric afterwards; optional mic recording kept locally. Tracked separately in analytics ("interview mode solve rate").

**H. Contest companion.** Calendar of upcoming LeetCode / Codeforces / CodeChef / AtCoder contests with reminders (email / extension badge), "virtual contest" mode, and the upsolve list we already have, now with a 7-day upsolve challenge.

**I. Rest-day intelligence.** Detect overload (several late-night sessions, falling solo rate, rising WA rate) and suggest a planned rest day that doesn't hurt the weekly score.

### Later

- **Placement season layer**: company lists (intern vs new grad), campus drive calendar per college (crowd-sourced by opted-in students), "readiness for company X". Needs a licensed or community dataset.
- **Pattern notebook**: auto-built from notes and mistakes; export to PDF for the night before an interview.
- **AI weekly review (Pro)**: summarises the week from real data (no code upload) and suggests next week's plan.
- **PWA + home-screen widgets**: streak, today's plan, Lab timer.
- **Accountability buddy**: pair with one friend; both see each other's Today plan progress.
- **WhatsApp / Telegram daily digest** (India-first channel).

## 4. What each "Now" item needs (engineering)

| Feature         | Data / backend                                                                  | Extension                                                                  | UI                                                 |
| --------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------- |
| A. Lab mode     | `focus_sessions` (start, end, focus_ms, away_ms, switches, mode)                | allow-list classifier, idle + away buckets, start/stop from web via bridge | timer page, mini timer, room leaderboard           |
| B. Today plan   | `plan_items` (date, kind, problem_id?, title, status, source) + daily generator | report Accepted (already does)                                             | quest list, day strip, confetti                    |
| C. Achievements | `achievements` (user, key, earned_at, hidden) + evaluator job                   | none                                                                       | badge grid on profile, share card, toast on unlock |
| D. Insights     | queries only                                                                    | none                                                                       | analytics cards                                    |

## 5. Positioning

Other tools pick one thing: a timer (LeetCode Time Tracker), spaced repetition (SpacedLeet, LeetRecur), a study timer with friends (YPT), or company question lists (paid PYQ sites). **DsaKaro's edge is that it already sees the whole loop**: what you open, how long you take, every verdict, how you solved it, and when you forget. "A study timer that knows you solved it, a to-do list that checks itself, and revision that proves you remember" is something none of them can copy without the extension and the data model.

## Sources

- [SpacedLeet (Chrome Web Store)](https://chrome.google.com/webstore/detail/spacedleet/dfhagjnahejiapmfkmmbkheikldoahch/reviews) · [LeetRecur](https://chromewebstore.google.com/detail/lmidmepgdbipmebgdalghmbehpiobiie) · [Leet Repeet](https://chrome.google.com/webstore/detail/leet-repeet/odpadfgphijikfmdaefmhpjdebahnmde/reviews?hl=en) · [DSAPrep launch post](https://hashnode.com/forums/thread/i-built-a-spaced-repetition-leetcode-tracker-and-launched-it-solo) · [Show HN: Spaced Repetition for LeetCode](https://hn.svelte.dev/item/45436942) · [CodingInterviewHQ](https://codinginterviewhq-marketing.pages.dev) · [Red-Green-Code: planning a spaced repetition schedule](https://www.redgreencode.com/leetcode-tip-10-planning-a-spaced-repetition-schedule/)
- [LeetCode Discuss: forgetting solutions after a few months](https://leetcode.com/discuss/post/8313816/am-i-the-only-one-who-forgets-leetcode-s-0or4/) · [r/leetcode snapshot (retention advice)](https://reddit.sentinel-team.org/posts/1peitsp/snapshots/2025-12-05T09%3A50%3A29.473939Z) · [dev.to: why you forget LeetCode solutions](https://dev.to/alex_hunter_44f4c9ed6671e/why-do-i-keep-forgetting-leetcode-solutions-after-solving-them-and-how-to-actually-remember-1f68)
- [YPT on the App Store](https://apps.apple.com/us/app/yeolpumta/id1441909643) · [r/GetStudying thread on YPT](https://cal1.lr.ggtyler.dev/r/GetStudying/comments/1h1t4lf/tell_me_the_best_phone_thing_to_study_and) · [Raffles Press: On YPT](https://rafflespress.com/2025/02/13/yawns-pains-and-tears-on-ypt/)
- [r/leetcode: breaks and burnout](https://reddit.sentinel-team.org/subreddits/leetcode/snapshots/2026-01-28T22%3A40%3A12.941543Z) · [r/leetcode: 45 minutes a day](https://reddit.sentinel-team.org/posts/1s32tbx/snapshots/2026-03-25T21%3A22%3A54.334467Z) · [dev.to: LeetCode burnout guide](https://dev.to/alex_hunter_44f4c9ed6671e/when-leetcode-burnout-hits-a-realistic-guide-to-getting-unstuck-2bej) · [Blind: tired of leetcoding](https://www.teamblind.com/post/tired-of-leetcoding-everyday-bhnpb5yk)
- [Duolingo: how the streak builds habit](https://blog.duolingo.com/how-duolingo-streak-builds-habit) · [CMU UX: streaks as performative progress](https://cmu-uxa.notion.site/Performative-Progress-Strava-Mules-Duolingo-Streaks-1c18eb2b3ca480f59cd2e4123ac0d7d2) · [Mobbin: study of 859 streak designs](https://mobbin.com/blog/streaks-are-about-losing-a-study-of-859-streak-designs)
- [GitHub achievements study (arXiv 2303.14702)](https://arxiv.org/abs/2303.14702v5) · [Gamifying DevOps practices (arXiv 2208.05860)](https://arxiv.org/pdf/2208.05860) · [Gamification in programming education](https://redi.cedia.edu.ec/document/253961)
- [r/leetcode: talking out loud / mock interviews](https://reddit.sentinel-team.org/posts/1q81asa/snapshots/2026-01-09T21%3A20%3A21.827194Z) · [dev.to: solo mock interviews](https://dev.to/alex_hunter_44f4c9ed6671e/how-to-run-mock-coding-interviews-by-yourself-with-leetcode-3a42)
- [LeetCode feature request: position field for company questions](https://leetcode.com/discuss/interview-question/1400289/new-feature-request-add-position-field-in-company-questions) · [leetcode-patterns issues](https://issues.ecosyste.ms/hosts/GitHub/repositories/seanprashad%2Fleetcode-patterns/issues) · [LeetCode Discuss: fresher OA bar in India](https://leetcode.com/discuss/career/1465449/fresher-oa-bar-in-india) · [PerCoder (company tags request)](https://www.producthunt.com/products/percoder)
- [zerotrac LeetCode problem rating](https://www.github.com/zerotrac/leetcode_problem_rating)
- [LeetCode timer logger (open source)](https://github.com/NefariousNiru/leetcode-timer-logger) · [Leetcode Auto Timer](https://github.com/yogendrasinghx/Leetcode-Auto-Timer) · [LeetCode Time Tracker](https://chromewebstore.google.com/detail/leetcode-time-tracker/minocemndbbiabdpijinjcolnkecodho) · [Focus Tracker: blocker and timer](https://chromewebstore.google.com/detail/pcfhdhbhbigiebfahbgepbpaidnmfele)
