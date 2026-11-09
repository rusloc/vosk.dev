# ACME Marketing — the JS showcase (paid acquisition console)

The custom-JavaScript flavour of the ACME paid-acquisition dashboard (ACME is a fictional SaaS analytics product:
web, iOS, Android; 6 channels, 8 networks, 19 campaigns; USD; generated data), built in rusloc/pnl (`js-marketing/`,
ADR-0015) and hosted here as the showcase `/work/marketing-acquisition-dashboard`. Brought in on 2026-11-05 from the
`.sync` pack **`acme-marketing/js-app/`** (its README is `pack-readme-2026-11-05.md` here; the hand-over note is
`.sync/2026-11-04-acme-marketing-handoff.md`) and **owned by this repo from then on**, like Mirelo and Nordmark. The
Power BI flavour is the owner's, published to web from Fabric; its URL is the entry's `powerBi`.

## Where things are

| What | Path |
|---|---|
| Engine (framework-free: every number and string; calendar, scope, windows, metrics, rules, movers, cohorts, copy, view models, URL codec) | `src/lib/marketing/engine/` |
| Data contract (strict Zod manifest, column specs), loader + the source seam, Parquet columns | `src/lib/marketing/data/` |
| Control-total reader and tolerance | `src/lib/marketing/control-totals.ts` (CSV parser: the site's `src/lib/csv.ts`) |
| UI: client root, the five views, layers (ⓘ, How to read, dynamics, Filters), SVG charts | `src/components/marketing/`, root `marketing-app.tsx` |
| Stylesheet (the pack's global sheet), **scoped under `.acme-marketing`** | `src/components/marketing/marketing.css` |
| Fonts: Inter (shared `src/components/inter-font.ts`), Manrope (`manrope-font.ts`) | CSS variables on the report root |
| Logo | `public/images/reports/marketing/acme-marketing-logo.svg` |
| Showcase entry | `src/lib/work.ts` → `marketing-acquisition-dashboard`, platform `js`, report `marketing` |
| Server side: artifact → query, reader connection, route | `src/lib/marketing/artifacts.ts`, `server.ts`, `src/app/api/marketing/[...path]/route.ts` |
| Schema, roles, loader | `data/marketing/sql/001-schema-and-roles.sql`, `002-schema.sql`, `scripts/marketing-load.ts` |
| Data the tests and the loader read (the pack's `public/data`, 1.55 MB, tracked) | `data/marketing/parquet/` |
| Test fixtures | `data/marketing/checks/control_totals_usd.csv` (28,660 rows), `src/lib/marketing/test-utils/parity/` |
| Tests (88 + 3 skipped: the source manifest and the two PBIP mirror checks need rusloc/pnl) | `src/lib/marketing/**/*.test.ts`, `src/components/marketing/layers.test.tsx` |
| AI chat (11-06, ADR-0005): the tools over the engine, its route, the Ask AI button in the header | `src/lib/marketing/chat-tools.ts` (+ test), `src/app/api/chat/marketing/route.ts`, `marketing-app.tsx` |

## Decisions taken here (2026-11-05)

- **The data lives in Supabase, schema `marketing_demo`** (owner: "the acme marketing backend data must live inside
  supabase as well"; CLAUDE.md § Supabase). One table per artifact the report reads, named after the file
  (`campaign-day.parquet` → `campaign_day`), the file order in `seq`, plus `document` for `manifest.json`. Roles:
  `marketing_loader` (loads, from the owner's machine) and `marketing_reader` (the site's only credential for this
  data, `MARKETING_DATABASE_URL`, Session pooler, port 5432), both hardened like `mirelo_reader`, created NOLOGIN.
- **A table travels as columns, not rows.** `term-day` (81,584 rows) is 7.2 MB as JSON rows, over a Vercel
  Function's 4.5 MB response limit; as one array per column it is 1.8 MB, and `campaign-day` 1.1 MB. The route sends
  `{ column: [values…] }`; `columnsSource` (`data/loader.ts`) rebuilds the rows and checks every value against its
  column kind, as Mirelo's `checkRows` does. The engine and the loader's groups (first paint, Journey, Campaigns) did
  not change.
- **The "Web report" button waits for the data.** `isJsReportLive` (`src/lib/work.ts`) leaves it out while
  `MARKETING_DATABASE_URL` is unset, so the page shows the Power BI flavour only and never a report that cannot load.
- **The Parquet stays in git** (`data/marketing/parquet/`, 1.55 MB): small enough, and the 88 tests and the loader's
  verify need it on a fresh clone. Mirelo's 28 MB is ignored instead (11-03). Nothing under `data/` ships in the build.
- **State in React, view in the hash.** The pack's URL contract (hash = view, query = 18 keys) is the report's state
  inside the popup, seeded from the page URL; "Copy link" hands out the showcase page's URL plus the canonical state;
  a page URL with one of the keys (`URL_KEYS`) or a view hash (`#channels` … `#cohorts`, `VIEW_HASHES`) opens the
  popup in that state (`ReportDialog` `openOnQuery` / `openOnHash`). No history entries: the popup has none.
- **The board fills the popup** (`report-board.tsx` `fill`, as Mirelo: 1440 × 810 scaled to fit, ≤ 1.25×, taller when
  the popup is; the views keep their fixed rows and the root's ground fills the rest), which makes it the containing block of the
  fixed layers; the ⓘ pop-up's position is computed in board coordinates (`onInfo`).
- **The global sheet is scoped, not converted** (the Nordmark recipe): every selector prefixed with `.acme-marketing`,
  `:root` / `html` / `body` became the root itself, `100dvh` → `100%`, the How-to-read panel's `100vw` arithmetic →
  `right: 16px`. The theme attribute (`theme=light|dark`, else the system) sits on that root, not on `<html>`; the
  channel hues are injected for the same root.

## AI chat (2026-11-06)

The Mirelo chat's recipe (`docs/mirelo/ai-chat.md`): the same loop, panel, limits and switch (`CHAT_ENABLED`), its own
closed tools. **Four tools**: `report_snapshot` (a view: the six vitals and that view's cards and tables, for a window and
the platform / channel / market filters), `metric_trend` (one vital week by week or month by month, each vs the same
dates last year), `campaign_detail` (one campaign: settings, vitals, its table row, top keywords or placements) and
`explain_metric` (a card's ⓘ text, spec references dropped). Every figure is a string the engine formats for the board.
The tools need the full dataset, so the route loads all eight artifacts once per instance (Journey and Campaigns too).
The report state travels as the report's own `<query>#<view>` (url-state.ts), up to 1,200 characters; a figures card's
"Show in the report" applies it in place. The button sits at the right of the header, after Copy link: 32px with 9px
corners like Filters, on the report's surface and ink in both themes. `marketing_reader` is released when no read is
in flight (`server.ts`, as Mirelo's), so frozen instances do not hold its 10 slots.

### The metric catalogue and the answer key (2026-11-08)

The four tools only quote cards, so a figure on no card ("CPM on LinkedIn", "conversion into paid for North America
under last click", "the May cohort's size") had no answer. A fifth tool, **`get_metric`**, reads a **metric catalogue**
(`src/lib/marketing/chat-metrics.ts`): 60 metrics, each with an id, a name, other names (EN + RU), the formula in words
and the cuts it takes. Every metric can be filtered or broken down (`by`) by channel, platform, network, campaign, market
and tier; page, segment, step and term metrics take one member (or list them all); cohort metrics take an acquisition
month (`cohort`), a retention day (`day`) or a payback offset (`offset`). One call asks for up to four metrics and gets
back each value, the same dates last year with the change (as the vitals compare), the plan and pacing for spend, and
the formula, formatted the way the report formats them. Every value comes from the engine's own functions
(`metrics.ts`, `cohorts.ts`, `rank.ts`); nothing is computed twice. A metric no card shows (ARPA, LTV) is marked
**derived**, and the answer says so. The catalogue (ids, names, cuts) is in the cached system prompt (≈ 2k tokens).

**The answer key** keeps the chat honest; visitors do not see it:

| Level | What | Where | Cost |
|---|---|---|---|
| 1. numbers | every row of the generator's control totals whose code the catalogue carries (about 14,500 rows: 50+ metrics × every scope and period key, cohort and term rows too), and 58 golden rows computed by SQL straight from `marketing_demo` for the cuts the control totals lack (market, tier, network, custom windows, pages, segments, steps, terms, cohorts; five traps that must read n/a), written from the formulas and not from the engine | `src/lib/marketing/chat-metrics.test.ts`; `data/marketing/checks/golden.sql` → `chat-golden.csv` | free, in `pnpm test` |
| 2. the model | every golden question through the real chat loop; passes when the answer quotes the expected figure and `get_metric` asked for that metric | `scripts/chat-eval.ts marketing` → `.log/report/<day>-chat-eval-marketing.md` | ≈ $0.001 a question, run by hand |

Adding a metric: a definition in `chat-metrics.ts`, a query in `golden.sql`, its frozen row in `chat-golden.csv`
(with a visitor-style question), then both levels.

## Loading the data (owner)

1. In the Supabase SQL editor, give both roles a password (32+ characters, generated):
   `alter role marketing_loader login password '…';` and `alter role marketing_reader login password '…';`
2. Put the two Session-pooler URLs (host `aws-1-eu-west-1.pooler.supabase.com`, port **5432**) in `.env.local`:
   `MARKETING_LOAD_DATABASE_URL` (user `marketing_loader.howpxpdnjjzdwqrgxkee`) and `MARKETING_DATABASE_URL`
   (`marketing_reader.howpxpdnjjzdwqrgxkee`).
3. `node --env-file=.env.local --import tsx scripts/marketing-load.ts` truncates, loads in one transaction and verifies
   all 8 artifacts against the Parquet, through the route's columnar round trip as well; `--verify` checks only.
4. Add `MARKETING_DATABASE_URL` to Vercel (Production + Preview) and redeploy: the "Web report" button appears.

## Rebuilding the data

The data is built in rusloc/pnl (`js-marketing/scripts/build-marketing-data.ts`, from `data-gen/acme-marketing`, seed
20261104) and re-issued with the pack. Copy the new `public/data/*` into `data/marketing/parquet/`, run the tests, then
the loader. A changed column spec needs `002-schema.sql` regenerated from `FILES` first (the loader fails loudly).

## Open items from the pack (the app runs on the defaults)

Board taller than 810 px (q A), creatives card (q D), the movers fallback for a 31-day window from 2025-01-01 (H),
first-load JS 262 kB gzip (full Zod on the client). The Power BI and JS flavours differ where Power BI cannot follow
the spec (the handoff's "Platform differences" list).
