# The job flow

**Set up 2026-11-09. The #1 priority every day, ahead of all site work.**

Goal: paying clients or a high-paid job. The site is the proof the outreach points to.

The method lives in the recruiter skill (`.claude/skills/recruiter/`): where to look, how to score a lead, the message
templates, call prep and the weekly review. This file only says how it runs day to day in this repo.

## The day

Say **"job"** (or "start <date>"). Each day has one sheet, `.log/job/job-<yyyy-mm-dd>.md`, built in this order:

| # | Step | Who | Rule |
|---|---|---|---|
| 1 | **Inbox** | owner pastes, agent drafts | recruiters first: answer within 2 hours in EU/UK working hours |
| 2 | **Due today** | agent | read `Next date` from earlier sheets: LinkedIn connect on day 3, email or follow-up on day 5–7, then stop |
| 3 | **New leads** | agent | 5–15 real leads, each page checked for still open and open to Turkey (`sources.md`) |
| 4 | **Qualify** | agent | score 0–12: Go / Go as contract pitch / Skip (`qualify-and-tailor.md`) |
| 5 | **Prepare** | agent | copy-ready CV pieces and messages for every Go (`outreach.md`), worded with the `text-writer` skill |
| 6 | **Send** | **owner only** | about 10 new personalised contacts a day; under ~100 LinkedIn requests a week; no automation tools |
| 7 | **Close** | owner tells, agent records | what went out, what came back; rows go to the owner's Excel |

**Friday:** the weekly review (`calls-close-review.md`): messages → replies → calls → proposals → won, the weakest stage,
one change for next week.

## Rules

- **The agent never sends, applies or signs up.** It prepares; the owner acts.
- **Never invent** experience, employers, metrics, postings or contacts. An unconfirmed posting is marked UNVERIFIED.
- **Site presence is tracked in `.claude/skills/recruiter/references/funnel-profiles.md`**: every site, registered or
  not, profile state. The owner reports; the row is updated the same turn. Setup comes first until the P1 rows are done.
- **The Excel is the lead tracker.** The sheet carries the skill's tracker row for the owner to paste; it is not a second
  tracker. A row is `prepared` until the owner says it went out.
- **Counts are derived from the rows**, never carried forward by hand.
- **Priority:** at the start of a day, job steps 1–5 come before any site task. Site work ranks by what it does for the
  funnel (below).
- Contact names and pay stay in `.log/job/`. The repo is private; if it ever goes public, that folder goes first.

## How the site serves it

Each message links the one page that matches the pitch, described the way the site describes it: client work with the
figures altered, or a demo. Never present a demo as a client project.

| The pitch | Link |
|---|---|
| Power BI developer / BI engineer | `/work/mining-time-utilization` (Power BI), `/work/online-sales-report` |
| Marketing / SaaS analytics | `/work/marketing-acquisition-dashboard` |
| Finance, FP&A, management reporting | `/work/pnl-suite` (**only once its report button is back**), `/work/executive-dashboard` |
| "Chat with your data", AI automation | Ask AI on `/work/online-sales-report` or `/work/marketing-acquisition-dashboard` |
| Prices, retainers | `/services` |

## Open gaps between the outreach and the site

Found 2026-11-09. The outreach promises things a visitor can't find on the page it links.

1. **No DP-600 anywhere on the site**, though every message leads with it. No Direct Lake either.
2. **The 300+ employees and hours-to-minutes proof is not on the site.**
3. **The fixed packages are not on the site** (Migration Assessment, Direct Lake migration, CI/CD setup and the rest). The
   site sells only monthly subscriptions, Urgent, Full-time and Education.
4. **Urgent is priced differently:** the site says $300+, the skill $450 (48 h).
5. **The Full-time card says "TBD"**, the first thing a hiring manager prices.

## P1 setup

`docs/job/p1-setup.md`: copy and steps for every P1 site, target 2026-11-09.

## Inputs still to come

- The owner's summary of the manual search so far (`docs/job/manual-start-2026-11-09.md` once received): who has been
  contacted, so nobody is messaged twice.
- The current resume arrived 2026-11-09: `docs/job/cv/`. Open points are in that day's log.
