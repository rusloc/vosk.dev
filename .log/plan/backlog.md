> **Backlog — the register (VOSK.DEV).** Since 10-23, per desk line 0's answer **(b)** (10-22 13:39): the
> day is driven by the short today list in `plan-<day>.md`; everything else lives here.
> - Built 10-23 by copying board twenty-three (`plan-2026-10-21.md`, from git) from its Owner's desk to the
>   end and editing it with a script that throws on any miss (18 edits). Its header, Targets and
>   10-21/10-22 status blocks stay in that file.
> - Markers in front of a desk line or after a T heading record the 10-22 outcome; the text after them is the
>   board as it stood. ✅ done · ✗ declined · ◐ partly / waiting · ⏸ parked by the owner · ↗ not this repo's.
> - Ages inside the sections are as of 10-21 and are not restated; re-derive them from their origins when used.

# Backlog

## New on 11-20

- **Ad landing pages at `/lp/*`** (owner, 11-20): one page per ad campaign, one-way links into the site, noindex, not in
  the sitemap (CLAUDE.md "Ad landing pages"). `/lp/fabric` built and re-fit to the 12:58 export, not pushed; landing #2
  waits for the owner's design. Open: real client logos for the Clients strip; Privacy placement; PSI after the push.
  **11-22:** landing #2 built, `/lp/ai-automation` (n8n flow + data chat); open: no price on it (the design has none,
  R-09 asks for one), PSI after the push.
- **Contact details block moved from /contact to /about** (owner, 11-20). Open: one of the two DP-600 links on /about;
  the /contact meta description still says "by form or email".

## New on 11-18

- **Google Analytics added to the site** (owner, 11-18) = Goal B go-live: code since 07-09, needs the GA4 + GTM ids and
  `NEXT_PUBLIC_GTM_ID` in Vercel; steps in `plan-2026-11-18.md` Today 1. Privacy page first or with it.

## New on 11-15

- **AI automation showcase on n8n** (owner, 11-15): two flows on the demo inbox n8n.opc@gmail.com (invoices to a sheet;
  finance requests to a tracker), public "Try it". Spec `docs/automation/README.md` (D1 answered, D4 = hosted n8n on
  Hostinger; D2, D3, D5 and the 11-15 review decisions open). Bluehost dropped: it cancelled the account.
- **Privacy page on vosk.dev** (`/privacy` 404): before the public inbox demo goes live.
- **ACME report labels** to the accounting and invoicing client (the showcase's client line since 11-15).
- **Nordmark:** `nordmark_demo` + Ask AI + 97-row key built, waiting on the owner's load and Vercel env; Power BI link pending.

## New on 11-03

- ⏸ **CLAUDE.md → md doorway + Neo4j rule/decision graph** (owner's brief 11-03 19:37; parked 19:57, "not a
  priority"). Assessment, 33-line doorway draft, 12-scope seed, missing tools and phases 0–5 in
  `.log/report/2026-11-03-md-to-graph-plan.md`; owner decisions A–E in its §8. Phase 2 (`/start-day`, `/close-day`,
  `/log` as skills, from the private memory procedure) needs no decision and stands on its own.

## New on 11-01

- **North Star (owner, 11-01 15:18): all three reports in both flavours,** Power BI and custom JS, on their `/work`
  pages. Custom is live since 10-31; the Power BI side waits on the owner's publish-to-web links
  (`plan-2026-11-01.md` items 1–3). The P&L's two flavours now differ (the JS one was reshaped 10-31 evening).
- **Mirelo on its own Supabase schema (owner, 11-01 23:51):** load the report's data into the shared project and
  relink the JS report to it. Today all three JS reports read static Parquet in `public/data/`. Owner's setup
  first (MCP login, load credential, the link option, all data or aggregates), then the build
  (`plan-2026-11-02.md` item 1; findings 20–23 in `daily-2026-11-01.md`).

## New on 10-31

- **The report packs arrived** (owner named `C:\__PBI\PNL\.sync` 10-31 10:50; entry note `2026-10-31-report-packs.md`,
  draft). Three reports × two flavours: standalone Next.js 16.4 apps (`pnl/js-app/`, `mirelo-sales/js-app/`,
  `nordmark-exec/js-app/`, data prebuilt, framed at 1440 × 810, `EMBED_ALLOWED_ORIGINS` at build) and PBIPs without
  data (`data-gen/` generates it; owner publishes from Desktop). Accepted here 10-31: `npm ci`, typecheck, tests
  (196 + 1 skipped / 92 + 4 skipped / 458) and builds green on Node 24.19. **Blocked on the hosting decision**
  (`plan-2026-10-31.md` question A) and on B–D. The pack's P&L lacks the Group view and slice filters the live
  showcase has. AI chat for the P&L is deferred (owner, 10-28, on the PNL side). ✅ _(11:52 → built the same
  afternoon: all three vendored into the site; `docs/{pnl,mirelo,nordmark}/README.md`; waiting: the owner's PBI
  embeds, and the PNL side's Group view + slices for the P&L.)_
- **Two new `/work` entries** (executive, sales) and the P&L replaced; every page gets "Power BI" + "Custom" buttons
  (owner, 10-31). `online-sales-cube` stays. The P&L's Fabric app becomes a video later (owner supplies it).

## New on 10-28

- **Showcase three reports** (owner, 10-28 23:43): the executive dashboard (new), the sales report
  (`online-sales-cube` today), the P&L report (update of `unified-management-pnl`). Code and artifacts come via
  `.sync`. On `plan-2026-10-29.md` as task 1. Extends Goal F / T.11 for the P&L.
- **text-writer skill** in `.claude/skills/text-writer/` (10-28): use it for posts, LinkedIn copy and outreach
  (T.12). Its `slop_check.py` needs Python, which is installed now.

## New on 10-22 (not on board twenty-three)

- **Supabase keep-alive** (`8bc1d1d`): GitHub Actions requests the Cube showcase every second day at 06:17 UTC.
  `cube_reader` queries: 1,031 at 10-22 ~13:2x → 1,094 at 10-23 11:3x. Builds and regenerations count too,
  so this does not single out the job; a Supabase pause warning is the backstop. Watch.
- **Showcase layout** (owner, 10-22): text page + one "Open the live report" button → popup, on every
  showcase. Done (`312f03b`, `3aa3fa1`).
- **P&L JS showcase** owned here since 10-22 (`docs/pnl/README.md`). Deferred by the spec: Excel / PDF
  export, drill-through, per-user memory, reference pages, phone layout (needs ≥ 1024 px).
- ✅ _(10-23 21:09, in the tree)_ **`/work` intro copy** ("Real client dashboards … Power BI and Apache Superset") no longer describes the
  list. Flagged 10-22, owner's call. Now: client work with figures altered + demos on synthetic data; the
  platform list is built from the visible showcases; the meta description says the same.
- **Showcase images via Claude Design:** option 2 chosen (brand first). `/design-sync` stopped at its first
  call: design-system authorization is missing; the owner runs `/design-login` in an interactive session.
  Standalone Claude Design closes 2026-12-14.
- **Owner to read before it went live:** the mining and P&L page texts. Both shipped with the pushes.

## ⭐ Owner's desk: what only the owner can move, cheapest first

**Board twenty-two's desk, 10-17 → 10-20:** lines 1, 11 and 16 done; 12–14 closed with the lead
engine on 10-20; the other ten did not move. Line 0's question is still open:

0. ✅ _(10-22 13:39: **(b)**, this split — `plan-<day>` is the short today list, this file the rest)_ **Decide what the board is for** (open since 10-01 → 20 days). The work that ships comes from
   requests, not from this file. Two honest options:
   - **(a) Keep it as a register.** It stays long and complete, nobody pretends it drives the day,
     and it is restated only when something on it changes.
   - **(b) Split it.** A three-line "today" that the day is actually measured against, and a backlog
     file for the rest.

   _Recommended: (b)._ Until answered, the board is restated in full.
1. ✅ _(ran 10-22 12:51 as `0414c57`)_ **Run tonight's git block.** It carries the 10-19 and 10-20 closes, this board and one 10-20 coms
   line. Trail only: the site doesn't change, though Vercel redeploys it (T.6.2). _Board
   twenty-two's line 1 ran the same day (10-17 16:30:37)._
2. ✅ _(10-22: all three URLs requested, queued)_ **Search Console: click "Request indexing"** on the home page and the post, if not done yet
   (T.0). Then look again: the ~10-09 check is 12 days overdue.
3. ✅ _(10-22: left as is, "minor diff")_ **`_name` or `_page`?** Two posts now disagree: the 10-01 post (`:79`) and the linked DDL say
   `_name`; the 10-17 post, in the owner's own text, says `_page` (T.8, T.10). Check the real
   `sql_source` table.
4. ✅ _(10-22: published)_ **Publish the LinkedIn post.** The text is written (10-01); use the `https://vosk.dev/…` link.
5. ✅ _(10-22: yes, `430f738`)_ **Say yes or no to `.gitattributes`** (T.3). One line, its own commit, and the 20 files leave
   `git status` for good. Offered 10-01 and 10-02.
6. ✅ _(10-22: yes, both, `d486036`)_ **Say yes or no to the two small fixes from the publish review** (T.8): the 2 px phone overflow,
   and drafts prerendered as routes.
7. ✅ _(10-23 21:09: re-logged; the MCP lists project `vosk-dev` in team `yaga` and reads its production deploys)_ **Re-auth the Vercel MCP to the team that owns vosk.dev** (T.6.1). About two minutes. It unblocks
   deploy reads and the cold-start evidence.
8. ✗ _(10-22: declined, closed — a trail-only build is cheap, a wrong skip is not)_ **Say yes or no to `vercel.json` `ignoreCommand`** (T.6.2). A repo change the assistant can build
   once approved. It stops trail commits from redeploying.
9. ✅ _(10-22: the post stays as it is, no amendment)_ **The Cube post's wording: approve it or decline it for good** (T.4). The post contradicts the
   live page.
10. ⏸ _(10-22: "leave as is" — parked by the owner)_ **Goal E's three:** rotate `CUBEJS_API_SECRET`, create `.env.local`, sign off the copy → lift
    `noindex` (T.2).
11. ✅ _(10-20)_ ~~**The `qbo` tenant:** amend `CLAUDE.md`'s "two tenants", and decide how `vosk_leads` treats five
    foreign migration versions (T.7.1).~~ `CLAUDE.md` names `qbo` as the second tenant; the
    engine's migration history went with it.
12. ~~**§0, what is a lead?** 50 days.~~ _Closed with the lead engine, 10-20._
13. ~~**`gh auth login`**, which gives the leads clone and unblocks T.1 step 4.~~ _Closed with the lead
    engine, 10-20._
14. ~~**Anthropic credits** (T.1). Not urgent while paused.~~ _Closed with the lead engine, 10-20._
15. ⏸ _(10-22: "leave as is, will come back")_ **Sign off the Services copy, or reword it** (T.9). The badges, "no surprises", "sorted this
    week" and the 15-item list are promises to clients, in the page and in its JSON-LD. _Appended
    on 10-06 so the other numbers hold, though it is among the cheapest._
16. ✅ _(pushed 10-18 15:34:53)_ **The new post's links** (T.10). Make `sqldev-mcp` and the anonymized SQL repo public, or say
    the post goes without them; then the three links and the video go in. The LinkedIn article
    links to the post, so the post goes live first. _New 10-17._ ◐ **16:54:** the SQL repo and its
    Pages site are public and linked in the post (in the tree, not yet pushed). Left: `sqldev-mcp`,
    the video, the LinkedIn link. ✅ **17:01:** the owner dropped the video and the `sqldev-mcp`
    link, and the LinkedIn article is live. It links to the post, and the post links back (in the
    tree, not yet pushed).
17. ↗ _(10-22: not this repo's — scope rule)_ **QBO: connect Power BI Desktop and refresh** (T.11). Run `reset-qbo-reader.ps1` (handed over
    10-20 in the QBO session), set `Server` to the project's `aws-1-eu-west-1` pooler (the PBIP's
    default `aws-0-…` is wrong), sign in as `qbo_reader.<ref>`, refresh. Then publish to the service
    and **Publish to web** (a tenant setting) for the site's embed URL. _New 10-21._
18. ↗ _(10-22: not this repo's — scope rule)_ **QBO: a Fabric capacity for the app flavor, and what "Ryfin" is** (T.11). _New 10-21._
19. ↗ _(11-09: moved to the job flow, `docs/job/README.md`)_ ◐ _(unblocked 10-23 11:32: the P&L showcase is live for the profiles to link)_ **Contra, Malt, Upwork; LinkedIn messages to HRs** (T.12). _New 10-21._

## T. Today

### T.0 🔎 Get the site and the new post indexed _(carried; not re-read since 10-02; the ~10-09 check is overdue)_

**State at the 10-02 close: registered, submitted, and waiting on Google.**

- **Done on 10-02, by the owner:** the site answers on one host (T.7.2 ✅); the Search Console
  Domain property `vosk.dev` is verified (a `google-site-verification` TXT record is in DNS, read
  21:39); `https://vosk.dev/sitemap.xml` is submitted (the inspections list it as the discovery
  source).
- **What the two inspections said, and why neither is a fault:**
  - **Home page: "Page with redirect".** Last crawl 09-25, when the apex still 308'd. Declared
    canonical `https://vosk.dev/`, Google-selected `https://www.vosk.dev/`.
  - **The post: "Discovered – currently not indexed".** Known from the sitemap, not crawled yet.
  - Fetched with a Googlebot smartphone user agent at 21:45: both `200`, self-canonical, `index,
    follow`.
- **Not known from here:** whether "Request indexing" was clicked on either URL (desk line 2).
- **Check around 10-09** (a week on; _overdue at 10-17_), in this order:
  1. URL inspection of `https://vosk.dev/`: the Google-selected canonical should now be the apex.
  2. URL inspection of the post: crawled, then indexed.
  3. The Pages report: `www` URLs should appear under "Page with redirect" (correct), the Cube
     showcase under "Excluded by 'noindex'" (deliberate), `/api/` under "Blocked by robots.txt".
  4. Anything under "Duplicate" or "Crawled – currently not indexed" is the real work list.
- ⚠️ **Google is moving the site from `www` to the apex.** That is a small migration. It takes days
  to weeks, and a dip in the meantime is not a fault.
- **This is §6's "post-deploy SEO verification never run"** (08-06) at last under way: the
  registration is done, the verification is step 3 above.
- The spam referring pages (`campaignquestions.de/…`) need no action and no disavow.
- **New 10-17:** after today's push, inspect `https://vosk.dev/blog/give-the-agent-eyes` and request
  indexing. The LinkedIn article will send people to it (T.10).

### T.1 ~~The engine: parked~~ _(closed 10-20: the lead engine is terminated; its text stays in board twenty-two)_

### T.2 Goal E: three owner-items, a cold start with thin evidence, and one idea _(carried, changed)_

- **Owner: rotate `CUBEJS_API_SECRET`.** The non-expiring JWT was exposed on 09-22 → **29 days**
  ago. Fresh 32-byte hex → Cube → Vercel `CUBE_API_SECRET` → redeploy.
- **Owner: create `.env.local`** with the two `CUBE_*` vars. It has to be the owner's edit because of
  the deny rule on `.env*`. Until then no local live build has ever run on this machine.
- **Owner: sign off the entry copy, then lift `noindex`** (`src/lib/work.ts:186`, _re-read 10-02_).
  Still served on 10-02.
- **The cold start: one probable regeneration, one ambiguous reading, no answer.**
  - **09-30 23:22:54 local:** the page turned from `PRERENDER` to `HIT` about 2 h 23 min after the
    revalidation window opened (`revalidate = 86400`, `work/[slug]/page.tsx:32`), with the real
    figures. No host change was involved. Probable regeneration.
  - **10-02 22:22:28 local:** `HIT` again. The window had been open since about 14:28 (24 h after the
    10-01 14:27 push), so this may be a regeneration. It may equally be the first fill of the apex's
    new cache entry after the host change. **Ambiguous.**
  - **Settled:** a server-side Cube fetch at regeneration time works in production.
  - **Not settled:** whether Cube was cold, and whether an earlier attempt failed first. A failed
    regeneration keeps the stale page up, so `Continue wait` is invisible over HTTP. The evidence is
    `get_runtime_errors` → T.6.1.
  - ⚠️ **Method correction (10-02):** `Age` is the time since the edge cache entry was filled, not
    since the build. It gives "the build was no later than", and it resets when the host changes.
  - ⚠️ **Every push resets the window again:** 10-03 13:08, 10-05 21:04 and 21:33, 10-17 16:30,
    10-18 15:34, 10-19 18:32, and six on 10-20 (the last 16:00:42).
    **No push from 10-05 21:33 to 10-17:** eleven days of open window, unobserved, and the logs
    that would show a failed regeneration are behind T.6.1.
- **#idea: cross-filtering by month** (09-27, offered, not approved). The library supports it: Tremor
  `onValueChange`, plus one shared `SalesFilter`. It needs two things:
  - wire `onValueChange` on the combo and add `month` to the filter;
  - move `byCategory` / `byCountry` from year to **month** grain. It stays 3 queries, with no model
    change, filtered client-side.

  Open questions: the "vs prior" rule for a single month, and whether to filter the other direction
  (category → months; orders are non-additive across category). **One component + two query edits.**

### T.3 Working tree: 19 files, 0 real _(carried; 20 until 10-20)_ — ✅ _closed 10-22: `.gitattributes` (`430f738`), the 19 files restored_

- **`.gitattributes`** (`* text=auto eol=lf`) as its own commit is the only thing that keeps the 20
  CRLF-only files out of `git status` (_re-read 10-02:_ no `.gitattributes`; `git diff
  --ignore-cr-at-eol` is empty for all 20). **08-06 → 76 days.**
  - The owner asked about these files on 10-01 ("do I need to commit and push them?"). Answer: no.
  - A read-only simulation with normalisation on lists **0** files instead of 20.
  - Offered on 10-01 and 10-02; not approved (desk line 5).
- `.gitignore` += `.claude/settings.local.json` (_re-read 10-01:_ not there). It's covered only by
  this machine's *global* ignore.

### T.4 Posts: three recent ones, one contradiction, and a first source of numbers _(carried, changed)_

- ⚠️ **The Cube post contradicts the live showcase** (`daily-2026-09-27.md`, Finding 11). The post
  `your-own-bi-front-end-with-cube.mdx` links to the page (line 21) and describes one that is gone
  (_lines re-read 10-01_):
  - Chart.js (line 43);
  - "four queries" (line 103);
  - a year-and-channel filter with AOV (lines 108–112).

  The live page is Tremor, 3 queries, year only. The wording update was proposed twice and **not
  approved**. It is the owner's call (desk line 9). #bug #decision
- **The new post is public** as "Centralized control of data served to Power BI & Excel" (slug
  `one-model-two-front-doors`). Its LinkedIn text was written on 10-01; publishing it is the owner's
  (desk line 4), with the link in the body and on the apex. The LinkedIn post drafted 09-22 for the
  Cube post is still unpublished.
- **Measurement:** still nothing on the site counts visitors (§5). **New 10-02:** Search Console's
  Performance report will show impressions and clicks from Google search once pages are indexed. It
  says nothing about LinkedIn or direct visits. #idea
- **New 10-17:** `give-the-agent-eyes`, the site leg of a LinkedIn post → article → post chain → T.10.

### T.5 ~~Make the engine free~~ _(closed 10-20 with the lead engine; text in board twenty-two)_

### T.6 ⚠️ Two tooling faults that block work _(carried)_

1. ✅ _(closed 10-23 21:09: after the owner's re-login, `list_projects` on team `yaga` returns `vosk-dev` and `list_deployments` reads production, `4086ef5` READY)_ **The Vercel MCP can't see the vosk.dev project**; 09-23 12:36 → **28 days**. _Re-read 10-17:_
   `list_teams` returns **team YAGA only**. Wrong team, not lost scope. Same on 10-20.

   **The owner has to re-auth and pick the right team** (desk line 7). Until then production is
   readable only over HTTP, deploys only by inference, and **the cold-start question (T.2) can't be
   closed**, because its evidence is `get_runtime_errors`.
2. **Skip builds for trail-only commits.** Carried as a `#idea` from 09-18 (**33 days**), promoted
   09-24.
   - `vercel.json` accepts **`ignoreCommand`** (exit 0 = skip, 1 = build; Vercel docs,
     *project-configuration/vercel-json*). _Re-read 10-02:_ still no `vercel.json` in the repo, so
     this is a repo change the assistant can build once approved.
   - ⚠️ **The docs' example is a trap here.** `git diff --quiet HEAD^ HEAD` looks at the **last
     commit only**. The 09-27 18:35 push was `16f9ebd` (the Tremor rebuild) → `2586848` → `a1b8d32`
     (agent memory only), and that command would have **skipped the Tremor deploy**. The 09-29 20:57
     push had the same shape, **and so did all three site pushes on 10-01** (13:51, 14:23, 14:27):
     each handed-over block put the site commit first and the log commit last. **10-05 21:33 again:**
     `2ea85ee` (site) then `a5941de` (trail).
   - Compare against **`$VERCEL_GIT_PREVIOUS_SHA`** instead: Vercel sets it to the last successful
     deployment's SHA, and only when an ignore step is configured. Exclude `.log/`, `docs/`,
     `.claude/` and `CLAUDE.md`, and check `article-src/` isn't read by the build.
   - Also check the clone depth reaches the previous SHA, and **fall back to building** if it
     doesn't. #idea
   - _09-30 showed what it buys:_ 40 hours without a push was enough for the first probable
     regeneration on record.

### T.7 The `qbo` tenant _(✅ closed 10-20)_ · the canonical redirect _(✅ closed 10-02)_

1. ✅ _(10-20: `CLAUDE.md` names `qbo` as the second tenant; the lead engine's migrations are gone, and
   5 remain, all `qbo`, re-read 10-21; 0 lints)_ **A third tenant in the shared Supabase project.** PBI-QBO applied five `qbo_*` migrations on
   09-25 (21:44 → 21:55): schema `qbo` with 10 tables, and roles `qbo_etl` / `qbo_reader`.
   - Verified read-only 09-27: 0 lints, and no new role can `SELECT` lead tables. _Re-read 10-17:_
     13 migrations, none newer; 0 lints.
   - **`CLAUDE.md` is false in two places:** "two tenants", and "its migration history is the lead
     engine's alone".
   - A future `supabase db push` from `vosk_leads` will meet five versions it has no files for.
   - **Owner's call** (desk line 11). The doc amendment is cheap once decided. #bug #decision
2. **✅ Every canonical URL was a redirect; fixed by the owner on 10-02.** Found 09-27, dated by
   Search Console to at least 09-25, closed in Vercel's domain settings with no env change and no
   redeploy: the apex answers `200` and `www` answers `308` → apex. The canonical, the sitemap and
   `robots.txt` all name the apex. What remains is Google catching up → T.0.

### T.8 From the publish review: two small bugs and seven calls on the text _(new; moved from nineteen's T.0)_ — ◐ _10-22: both bugs fixed (`d486036`); `_name`/`_page` left as is; the other text calls stay open_

**Nothing here was fixed on 10-01: the ask was to publish.** Both `#bug`s are small and buildable on
a yes (desk line 6). The two bugs' code pointers were _re-read 10-02_; post line numbers are as of
`bbc9370`.

- **2 px horizontal overflow on every post page at phone width.** `blog/title-bar.module.css:6`
  is `inset: -0.1em -0.6em`: at `text-3xl` that is 18 px against a 16 px gutter. Measured on all
  six posts at 360 / 390 / 430 px. The funnel post overflows 13 px at 360 px from another cause,
  not investigated (**10-17:** probably its table, which now scrolls in its own wrapper; at 390 px
  that page is back to the common 2 px). Candidate fix, untested: `inset: -0.1em -0.5em`. #bug
  _Re-measured 10-17 on the new post at 390 px: 392 vs 390._
  - The 10-05 Services cards use the same bar inside 24 px+ padding and measured no overflow at 320 /
    375 / 390 px.
  - ⚠️ **The 09-29 "no overflow" was a false pass**: under mobile emulation `innerWidth` grows with
    the content, so `scrollWidth === innerWidth` is trivially true. Compare with `clientWidth`.
- **Drafts are prerendered as routes.** `blog/[slug]/page.tsx:36` and `opengraph-image.tsx:8`
  build their params from `getPostSlugs()`, which doesn't filter drafts. A draft gets a
  prerendered `404` page and a `200` OG image with the generic site title. Nothing leaked. Fix:
  build both from `getAllPosts()`. #bug
- **The `power-bi` and `sql` tag pages paginate for the first time** (4 posts > `PAGE_SIZE` 3) and
  are 972 px tall at 1440×900; `/blog` is 932 px. Both are over the 900 px floor → §7 item 18.
- `/blog`'s sitemap `lastmod` is pinned to `SITE_UPDATED = 2026-08-02` (`sitemap.ts:10`), though
  the index changes with every post. Nit.
- Diagram text is ~4.5 CSS px on a phone, the same as the two older diagrams. House convention.
- **The owner's calls on the post's text** (reported, nothing rewritten):
  - `:79` `_name = 'DAX SRC'` vs the source article's `_page` (desk line 3). The linked post's DDL
    has `_name`, so the site is consistent as written. **10-17: no longer.** The new post (T.10)
    carries the owner's `_page = 'PO VIEW'` and links to that same DDL.
  - `:136` "these 113 columns" while the example shows five.
  - `:119–122` "the report and every copy of the workbook get the same view": the DAX row only
    defines the Excel view, so this slightly overclaims.
  - `:89` the XMLA endpoint needs Premium, PPU or Fabric capacity, and the post doesn't say so.
  - `:54–55` `"ETD"` ← `[_ptd]`, `"ETA"` ← `[_pta]`: a business rename, or a typo.
  - `two-front-doors-diagram.tsx:61,66`: the "2 · run it" arrow lands on `DAX_SOURCE`; step 2 runs
    against the flat tables.
  - **New 10-01:** `:149–150` "Strip the brackets … Clean them in M" describes a step the trimmed M
    sample no longer shows.
- **Three choices that were the assistant's, flagged and unanswered** (they stand until told
  otherwise): the publication date `2026-10-01`; "lands **in** Excel" for "lands into"; the trailing
  "But" left out of the reworded sentence.
- The title no longer says "two front doors"; the body (`:21`, `:161`) and the diagram still do. That
  was pointed out at the retitle and left.

### T.9 The Services redesign: live since 10-05, three things only the owner can settle _(carried)_

**Live since the 21:33 push** (`2ea85ee`; `0606324` at 21:04 was a first attempt, replaced).
Desktop: a featured maroon subscription card spanning two rows, with Project and Other stacked
beside it. Mobile: the pills and one square card. One forward-only, endless `>` per card. The tier
titles carry the blog's orange bar: ~~in the tree only~~ live since 10-17 16:30. **10-20:** the bar
no longer clips, and the subscription title sits right-aligned above its price, the bar fading in
from the maroon (`3f0da19` 15:16 misread the ask; `4a86026` 16:00 is the one asked for, live at
21:53 UTC).

- **The copy is a set of promises now** (desk line 15). Sign off or reword:
  - the badges "Billed monthly" (Subscription) and "Fixed scope" (Project);
  - "no surprises" (Long), "I'll get it sorted this week" (Urgent), "no slide decks" (Education);
  - the 15-item "Every subscription includes" list, which names dbt, Cube semantic layers, RLS and
    priority support.
  - The JSON-LD `Offer` descriptions are built from the same strings (`structured-data.ts`), so
    the informal copy is in the markup too. #decision
- **The conditions popup is still Lorem ipsum** (`src/lib/i18n/en.ts:151`, _re-read 10-21_), now
  one tap from every card's top row (→ §6, Blocked). #bug
- **The Russian copy was rewritten and isn't served:** `dictionaries.ts` registers `en` only.
  Nobody has read the new `ru.ts` strings as Russian copy.
- **Left on purpose, say if wrong:** no "Same week" chip on Other (its three tiers share no claim);
  on the maroon card the title bar fades transparent → cream → orange under dark text, because the
  stock bar washed out cream text. **→ Overtaken 10-20:** the cream stop is gone; the bar fades
  from the card into orange.
- §7 item 18's 900 px floor no longer applies to `/services`: the featured card alone ends at
  880 px at 1440 wide.

### T.10 The 10-17 post: "Give the agent eyes" _(✅ closed: live 10-17, links live 10-18 15:34:53)_

**Built 10-17, live with today's block** at `/blog/give-the-agent-eyes`. Source:
`.log/report/pub/2026-10-17-voskdev-article.md`, the site leg of the promo flow (LinkedIn post →
LinkedIn article → this post). The LinkedIn article is drier and links here.

- **Title, the assistant's pick:** "Give the agent eyes: 5 minutes to 15 seconds" (44 characters;
  the source H1 had 107). Tags `sql` · `power bi` · `js`, dated `2026-10-17`. **The slug is the
  contract** the LinkedIn article will link to: change it before that goes out, never after.
- **Added beyond the source:** a diagram (`agent-eyes-diagram.tsx`, same conventions as the other
  three), links to the Postgres workflow and two-front-doors posts, and the six tools and six
  findings set as lists. The owner's sentences are otherwise unchanged.
- **Site-wide side effect:** GFM tables now have styles (`mdx-components.tsx`: rules, padding, a
  scrolling wrapper). Only the funnel post had a table before. It gains rules and no longer pushes
  the page wider.
- **Held back, the owner's to supply** (desk line 16): the video, the tool repo, the anonymized SQL
  repo, the LinkedIn article link. None of `rusloc/sqldev-mcp`, `pbi-profiler`, `fab-admin-mcp` is
  public (GitHub API `404`, 10-17). The placeholders are out of the post, not commented out: an MDX
  comment is a JS expression, next-mdx-remote 6 blocks those, and the build failed on it.
  - **16:54, the SQL side is in:** the owner published `rusloc/SQL` (`SQL/PO_VIEW.sql`, 2,287
    lines raw; the Pages site says 2,288) and `rusloc.github.io/SQL`. Both `200` and public. The
    post now ends with a Links section pointing at the file and the Pages site. Its figures match
    the post's.
  - **Two things on the owner's Pages site, not fixed (not this repo):** "The story behind the PO
    view: vosk.dev" links to the home page, not to `/blog/give-the-agent-eyes`; and "sqldev-mcp"
    is `href="#"`, a dead link until that repo exists. #bug
  - The post says 2,200 lines; the published file is ~2,288. Close enough for prose, but say if
    it should match.
- **`_page` vs `_name`** → desk line 3. #decision
- Verified: typecheck, lint, 148 tests, build (33 pages), headless Edge at 1440 and 390.

### T.11 🎯 The QBO P&L showcase: one report, three flavors _(new 10-21; target 1)_ — ◐ _10-22: the JS flavour is built here and live (`3aa3fa1`, pushed 10-23 11:32:59, `/work/unified-management-pnl`); the Power BI and Fabric flavours are other repos' (scope rule) and arrive via `.sync`_

**Where it stands** (read 10-21 from `C:\__PBI\QBO`, its own repo, and its trail):
- **The pipeline ran end to end on synthetic data on 10-20:** 2,594 raw records → `dbt build` 113/113
  twice → five `vw_*` views. The P&L matches `demo_summary.py` to the cent. `qbo_reader` reads the
  five views only; 0 lints.
- **The Power BI project** (`PNL/QBO PnL.pbip`: 1 page, 12 visuals, 67 measures) is pushed
  (`fa7b7cb`). It has not been refreshed against the views: connecting Desktop is the owner's step
  (desk 17).
- **CSVs of the five views** for a Fabric Lakehouse upload sit in `exports/fabric/` (5 files, 10-20
  20:56).
- ⚠️ **QBO's tree is not clean:** its 10-20 coms, `.mcp.json` and `dbt/models/staging/_unit_tests.yml`
  are modified; `.docs/setup-overview.html`, `exports/` and two skill folders are untracked.
  `exports/` is data, and not ignored. Synthetic today, but it must never hold a client's rows.
  That repo's own block, from its own window. #decision

**The three flavors and what each needs:**
1. **Power BI report.** Refresh → publish to the service → **Publish to web**, which gives the `?r=`
   URL. The site's `power-bi` variant takes exactly that (`embedUrl` + `href`, `src/lib/work.ts:47`,
   _re-read 10-21_), so the site side is a `work.ts` entry, a card image and the details copy.
   Publish to web is public by design: fine for synthetic books, never for a client's.
2. **Fabric app** ("Ryfin" as written: name to confirm). Lakehouse from the CSVs → semantic model →
   report → app. It needs a Fabric capacity (trial or paid) on the owner's tenant. Whether a Fabric
   app can be shown publicly at all is open. On the site it is probably a link plus screenshots,
   not an embed.
3. **Custom JS dashboard.** ⚠️ **It can't read `qbo`.** Per `CLAUDE.md`: no Supabase credential in
   the site, `cube_reader` sees `demo_sales` only, and `qbo` must never be reachable from here. So
   the JS flavor runs on a **static snapshot**: monthly P&L aggregates cut from the synthetic views,
   committed as a small JSON file, drawn with the vendored Tremor components like the sales
   showcase. _Recommended._ The snapshot is cut once, from synthetic data, and never refreshed
   after real books go in. #decision

**The site entry needs a decision before code.** `ShowcasePlatform` is `"power-bi" | "superset" |
"cube"` (`work.ts:22`), one platform per entry (ADR-0002). Three flavors means three entries, or a
new variant that carries several. _Recommended for 10-21:_ ship a `power-bi` entry (no new code
path) that names the other two flavors in its details. Pick the variant once the JS flavor
exists. #decision

**Order, cheapest proof first:** desk 17 (refresh + Publish to web) → the `work.ts` entry → the JS
snapshot page → the Fabric app. Check each on the Vercel preview, not just localhost.

### T.12 🎯 Freelance accounts and LinkedIn outreach _(new 10-21; targets 2 and 3)_

The owner's acts. Nothing in the trail records how far they got before today.
- **Finish the profiles on Contra, Malt and Upwork.** Keep headlines and rates consistent with the
  Services page, whose copy is still not signed off (T.9, desk line 15). Link the site and, once
  live, the QBO showcase.
- **Message job HRs on LinkedIn.**
- On request: profile copy per platform and a short message template. Neither is drafted.

## 0–4. The lead engine _(closed 10-20: terminated by the owner)_

§0 (what is a lead?), §1–3 (the leads build) and §4 (Goal C's health check) went with the engine.
Their text is in board twenty-two (`plan-2026-10-17.md`). The companies list survives in
`.log/report/2026-10-20-lead-engine-companies-export.html`. **One item outlives the engine:**
- The agents' `tools:` lines name `mcp__supabase__get_logs`, but the server exposes `query_logs`.
  Unknown names drop silently, so the agents can't read logs. Four files: `db-chef`,
  `qa-test-hunter`, `product-manager`, `web-app-architect` (_re-read 10-21_). Moved here from §4.

## 5. From the 09-18 Vercel read: _carried_

- ⚠️ **No visitor measurement.** A showcase and three posts now deserve it (→ T.4). Web Analytics is
  a dashboard toggle + `@vercel/analytics`, **a new dependency that needs the owner's yes.** Goal B
  is the other route. Search Console (T.0) covers Google search only.
- **Ignored Build Step:** **T.6.2**, as `vercel.json` `ignoreCommand`.
- `package.json` `engines.node: ">=20"` → pin `24.x` (_re-read 10-21:_ still `>=20`).
- ✅ _(10-20: the `CLAUDE.md` rewrite left no `D:` path, re-read 10-21)_ ~~`CLAUDE.md`: every path says
  `D:\` on a machine with no `D:`. Which one moves is the owner's call.~~
  ⚠️ It's more than cosmetic, because T.1 step 4's blocker is written as `D:\__VOSK_LEADS__`.
  **10-05:** it broke the handed-over blocks themselves (`cd "d:/__VOSK__"`), and the owner banned
  folder-change lines from git snippets (`CLAUDE.md` § Git, `a5941de`). The drive itself is unfixed.
- ~~Phase 4: the Vercel MCP URL is project-scoped, so the admin UI needs its own entry.~~ _Closed
  with the lead engine, 10-20._

## 6. Site backlog: ages at 10-21

- **Contact-form fix:** `contact-config.ts:16` is still `z.string().min(1).optional()`, and the same
  trap is on `:20` (`CONTACT_FROM_EMAIL`) (_both re-read 10-21_).
  - The fix has been unchanged since 08-01: `.transform(v => v || undefined)`, with a test in the
    same commit.
  - **08-01 → 81 days. Twenty-third consecutive board:** 08-01, 08-03, 08-06, 08-07, 08-08, 08-12,
    08-25, 08-26, 08-28, 08-29, 09-16, 09-18, 09-19, 09-21, 09-22, 09-23, 09-24, 09-28, 10-01, 10-03,
    10-06, 10-17, 10-21 _(enumerated from the board files, not incremented)_.
- **08-06 → 76 days**, the three that are left: `.gitattributes` (→ T.3) · `.github/` absent · a
  privacy policy (no route under `src/app/[locale]/`). The fourth, post-deploy SEO verification, is
  now under way → T.0.
- `pnpm format` repo-wide: **07-31 → 82 days**. It covers a third diagram file
  (`two-front-doors-diagram.tsx`, flagged like the other two).
- **From the publish review** (detail in T.8): the 2 px phone overflow on every post page
  (`title-bar.module.css:6`) · drafts prerendered as routes (`getPostSlugs()`) · tag pages over
  the 900 px floor · `/blog` sitemap `lastmod` pinned to 08-02.
- **Services-cards conditions copy:** `src/lib/i18n/en.ts:151` is still placeholder Lorem ipsum **in
  production** (_file re-read 10-21; served page 10-17_ → T.9).
- **Cube showcase residue**, known and left as is at the 09-27 rebuild:
  - measures selected but unused (`units`, `orders_placed`, `orders_returned`,
    `new_customer_orders`);
  - English month names in `ru`;
  - the planted 2025-06/07 paid-search cut is now an unattributed dip;
  - two class helpers (`cn` and `cx`);
  - "Sports & Outdoors" wraps on the top-5 axis;
  - preview deploys hide the showcase, because the Cube env is Production-only.

## 7. Recovered 09-21: off-board 08-29 → 09-21

**Home: `plan-2026-08-26.md`** _(board eight)_, "Code items" 5–22 and "Dormant" D1–D4. They are
restated in full so the pointer can't drop again. ⚠️ **They are as of 08-26 and not re-verified**,
except where marked.

- **5** `/` browser sweep, never measured.
- **6** off-palette drift, four files. #bug
- **7** `docs/04-syndication.md` documents code that lives in `.archive/`. #bug
- **8** tests: `escapeHtml`, `content.ts` fail-loudly.
- **9** the `8.625rem` magic number.
- **10** orphaned dictionary keys.
- **11** RSS emits no `<category>`.
- **12** dead `alt` export in `blog/[slug]/opengraph-image.tsx`.
- **13** `three-numbers` 404.
- **14** iframe `sandbox` on `/work/[slug]`.
- **15** Turnstile: adopt or drop.
- **16** rate-limit `Map` → `lib/rate-limit.ts`, on a third caller.
- **17** audit "believed shipped but isn't".
- **18** the `/blog` + `/services` 900px floor held by `PAGE_SIZE = 3` (`blog-list.tsx:15`, _re-read
  10-01_). ⚠️ `/blog` has **7 posts with 10-17's, three pages**, and measured 932 px at 1440×900 in the
  publish review; the two tag pages measured 972 px. The floor no longer holds on any of the three. **10-05:**
  `/services` was redesigned and is past it on its own content (T.9).
- **19** ASCII portrait hidden.
- **20** `src/lib/metadata.ts` fails `prettier --check`.
- **21** `RETIRED_PREFIXES` permanent 308 for `/ru/*`; prune on deindex.
- **22** ⚠️ **Rotate the Vercel protection-bypass token.** It's in a `~/.claude/backups/` file on the
  *other* machine, so it can't be verified here. #bug
- **D1–D4, dormant:** revive only if `"ru"` returns to `locales`.
- **Standing decisions:**
  - `components/hero-cta.tsx` + `.module.css` are dead code, still present (_re-read 10-01_).
  - The two `Service` schema placeholder prices are ◐: Full-time was decided as `TBD` on 09-27, and
    tutoring `$50` is still a placeholder.

## Blocked: user-gated

The ranked version is the **Owner's desk** at the top. The full list:
- **The board's format (desk line 0).**
- **The Services copy sign-off (T.9, desk line 15).**
- **"Request indexing" in Search Console (T.0).**
- **`_name` vs `_page`, and the six other calls on the post's text (T.8).**
- **`.gitattributes`, yes/no (T.3).**
- **The two publish-review fixes, yes/no (T.8).**
- ✅ _(10-23)_ **Vercel MCP re-auth to the right team (T.6.1)**, 28 d.
- **`ignoreCommand` yes/no (T.6.2).**
- **The Cube post's wording (T.4).**
- **QBO: Desktop refresh + Publish to web; a Fabric capacity; what "Ryfin" is (T.11).**
- **Contra, Malt, Upwork; LinkedIn messages to HRs (T.12).**
- Rotate `CUBEJS_API_SECRET` (29 d) · `.env.local` · entry-copy sign-off → `noindex`.
- Cross-filtering, yes/no (T.2).
- Publish the LinkedIn posts (the Cube one drafted 09-22, the 10-01 one). The 10-17 chain is live.
- VPS + `bi.vosk.dev` DNS → all of Goal A, **07-31 → 82 d**.
- Portrait source asset, **07-22 → 91 d**, still the longest block in the trail.
- Resend domain verification (SPF+DKIM).
- GTM container + GA4 IDs → Goal B.
- Real conditions copy for the Services cards.

_Left the list on 10-02:_ ~~Canonical host (T.7.2)~~ ✅.
_Left 10-18 → 10-20:_ ~~the new post's links (T.10)~~ ✅ · ~~the `qbo` tenant (T.7.1)~~ ✅ ·
~~`gh auth login`, Anthropic credits, §0, Adzuna keys, the auth user~~ closed with the lead engine.

## Goals

- **Goal A: stand up Superset.** Unchanged since 07-31. `bi.vosk.dev` must resolve before first boot.
- ◐ _(11-18: on the day list, `plan-2026-11-18.md` Today 1)_ **Goal B: GA + Tag Manager go-live.** Code done since 07-09; ~15 min once the IDs exist. ⚠️ It's
  the cheapest route to T.4's unmeasured posts.
- **Goal C: the lead funnel.** ~~Phases 0–3 live since 08-28; paused 09-23.~~ **Terminated 10-20** by
  the owner. Leads are tracked by hand.
- **Goal D: syndication.** Archived 08-02. Shelved, not cancelled.
- **Goal E: Cube showcase. ✅ LIVE since 09-22 00:37, rebuilt on Tremor 09-27 (`16f9ebd`)**, verified
  live 10-05 22:11 UTC. It has three owner-items, one cold-start question that T.6.1 has to close,
  and one idea (cross-filtering).
- **Goal F: the QBO P&L showcase** _(new 10-21)_. One report in three flavors → T.11.

## Watch / risks

- ⚠️ **NEW: the site's no-database rule meets a data showcase.** T.11's JS flavor is the first
  showcase whose data lives in `qbo`. The answer is a snapshot, never a credential.
- ⚠️ **NEW: the shared project lost its scheduled traffic.** The 30-min fetcher was the deliberate
  guard against the free plan's inactivity pause, and it went with the engine on 10-20. What touches
  the database now: Cube when the showcase regenerates, QBO's ETL when it is run. If both go quiet for a
  week, the project pauses and the live Cube showcase fails. Unverified whether Cube's queries count. #idea
- ⚠️ **NEW: a position word in a design ask was read loosely, and shipped (10-20).** "Align to the
  right" became an indent at 15:16; the owner's screenshot got the real fix at 16:00. It was flagged
  at the time and pushed anyway. Confirm a reading, or show a screenshot, before pushing it.
- ⚠️ **NEW: QBO was driven from this window anyway (10-20 15:43 → 20:55)**, under three hours after
  the 14:23 advice to give it its own. Its transcript sits in this repo's project folder, and QBO's
  trail got estimated stamps for it. The advice stands.
- ⚠️ **A handed block sat eleven days, and production fell behind the tree without a sound.**
  10-06 01:16 → 10-17: the close and the Services title bars never shipped, and only the next
  session could notice. A session's first act is `git status -sb` and a look at what is untracked.
- ⚠️ **The coms-stamp rule broke again (10-05).** Four of five stamps were `date` at logging
  time, 3–11 min late. Corrected with the old values struck through. Read the transcript before
  writing a stamp, not after. **Again 10-20:** "~15:50" for a request made at 15:55:03.
- ⚠️ **"Suggest" was built, not suggested (10-05).** The first restyle was live 21:04 → 21:33
  before "that's awful". A design ask worded as a suggestion can be answered with a preview first.
- ⚠️ **An inference written down as a reading.** Twice on 10-02: "your block ran" from `git
  log -1` when the push had not, and a build time read off an `Age` header that measures cache
  fill. Say which one it is, and check a push with `git status -sb`.
- ⚠️ **Search Console shows the past.** An inspection is Google's last crawl, not the site as it
  is. Read the "Last crawl" date before reading the verdict.
- ⚠️ **A listed item moves when it stands in the way of something wanted.** T.7.2 sat five days
  on a list and was fixed in minutes once it blocked the Google registration. That is evidence for
  desk line 0, not against the backlog.
- ⚠️ **A request can die unanswered, and only the transcript knows** (09-29 21:00). Count transcript
  requests against coms entries in every close. Done for 10-01 (6/6), 10-02 (7/7), 10-05 (5/5) and 10-06 (1/1); 10-03,
  10-04 and 10-07 → 10-16 had none. Then 10-17 (4/4), 10-18 (2/2), 10-19 (3/3), 10-20 (14/14 here; 11
  more went to QBO's trail).
- ⚠️ **A correct push can still surprise.** When a commit deploys something invisible, say so in the
  owner's terms above the block.
- ⚠️ **A check made inside the two minutes after a push reads the old site** (10-01 14:24, 14:27).
- ⚠️ **The board doesn't drive the work.** 09-24 → 09-30: 12 requests, 10 commits, 0 board items
  moved. 10-01 → 10-02: 13 requests, 8 commits, T.0 and T.7.2 done, both through requests. 10-03 → 10-05:
  5 requests, 3 commits, 1 desk line (the block), 0 T items. 10-06 → 10-16: 1 request (the close), 0 commits, 0
  lines. 10-17 → 10-20: 23 requests here, 12 commits, desk lines 1, 11, 16 and T.10, plus the
  termination, which was on no board. #decision
- ⚠️ **A live page and a live post can drift apart silently.** A rebuild that changes what a post
  describes should carry the post, or an explicit decision not to (T.4).
- ⚠️ **A shared project's tenant list is a claim someone else can falsify.** `qbo` arrived without
  any migration of ours, and `CLAUDE.md` didn't notice. Every close reads `list_migrations` (§4 is gone; the read stays).
- ⚠️ **The documented fix can be the bug.** The docs' `ignoreCommand` example (`HEAD^ HEAD`) would
  have skipped the Tremor deploy, the 09-29 post and all three 10-01 site pushes (T.6.2).
- ⚠️ **Logging the work prevents testing the work.** Every `.log/` commit redeploys and resets the
  showcase's revalidation window → T.6.2.
- ⚠️ **A handed-over git block isn't a block that ran.** 09-22, 09-23, 17.5 h on 09-28 → 09-29, 31 h
  on 10-01 → 10-02, a commit without its push on 10-02, and on 10-05 a skipped block folded into the next (21:00 →
  21:04), and the 10-06 01:16 close's block, unrun for 11 days. **Verify per file with `git log -1 --
  <path>`, and the push with `git status -sb`.**
- ⚠️ **An MCP can report healthy while seeing the wrong tenant.** Vercel `status` says `enabled`,
  and the connection simply isn't looking at vosk.dev. Test the call, not the status.
- ~~⚠️ **Silence no longer means healthy.** `digest` was the heartbeat, and it's off. Health must be
  **pulled** (§4's reads), not pushed, for as long as the engine is parked.~~ _Retired 10-20._
- ~~⚠️ **A green dashboard isn't a working engine.** Proven and priced: 96 `enrich` runs on 09-22, 0
  not-succeeded, 0 leads, and a digest calling it healthy.~~ _Retired 10-20; the lesson is in
  `CLAUDE.md` as "succeeded is not health"._
- ⚠️ **A mock verifies the code against the mock.** A "verbatim" fixture is verbatim only for the
  query it came from. Until `.env.local` exists, this machine can't do better.
- ⚠️ **A coms stamp is the request's time, from the transcript.** Logging-time `date` drifted +4
  min and +1 h 55 min on 09-27. Estimates drifted +97 min on 09-21.
- ⚠️ Boards lose items at restatement, so diff against the last board that was *worked*. Done above,
  against twenty-two.
- **Closes, enumerated:** late from 09-18 through 10-01 (09-18→19, 09-19→21, 09-21→22, 09-22→23,
  09-23→24, 09-24→27, 09-25→27, 09-26→27 (null), 09-27→28, 09-28→10-01, 09-29→10-01, 09-30→10-01
  (null), 10-01→10-02). **10-02 closed on 10-02**, the first on its own date in that list. Then 10-03→10-06,
  10-04→10-06 (null), 10-05→10-06 (asked 01:08, after midnight), 10-06→10-17 (dull), 10-07…10-16→10-17
  (dull, ten days), 10-17→10-19, 10-18→10-19 (light), 10-19→10-21, 10-20→10-21 (asked 00:52, after
  midnight).
- ~~Free-plan inactivity pause on the leads project. The fetcher is the deliberate mitigation (T.1).~~
  → now the shared project's risk, see the top of this list.
- _Retired 10-20 with the engine, kept for the record:_
  - 243 unverified domains must not enter `sources`;
  - `_shared/supabase.ts:12` reads the legacy `SUPABASE_SERVICE_ROLE_KEY`;
  - `git log` under-reports 08-28 by two files;
  - Telegram cadence ≠ density;
  - the strongest conclusion of 08-28 rests on the unexamined premise in §0.
