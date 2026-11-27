# ACME Cash Flow — "Cash flow demo" (`/work/cash-flow-demo`)

Status **2026-11-26 evening: built and verified (AT-01…AT-15, AT-17 measured), not committed, not loaded.** Waits on the
owner's load + Vercel env, and on the Power BI embed link (the page gets a "Power BI" button beside "Web report").

## Source

- Hand-off (read-only, owner named it): `C:\__PBI\PNL\.sync\acme cash flow\js-spec\` (README + `01`–`05`, 190 `CF-*`
  requirements, AT-01…AT-18; `mockup/` = the reference implementation, the mock wins over the spec). Entry note:
  `C:\__PBI\PNL\.sync\2026-11-26-acme-cash-flow-handoff.md`.
- Data generator: `C:\__PBI\PNL\.sync\data-gen\acme-cash-flow\` (Python 3.12, seed 42). Never write into `.sync`:
  generate with `--out` elsewhere (a venv + `generate.py --out <scratch>`; `verify.py --data <scratch> --no-rerun` = 73/73).

## Owner decisions (11-26)

Data in **Supabase `cashflow_demo`** (not Parquet in the build) · title **"Cash flow demo"**, slug `cash-flow-demo` · **no
Ask AI** · all open questions Q-01…Q-16 on the mock's defaults · Power BI flavour arrives later from rusloc/pnl.

## What exists

| Path | What |
| --- | --- |
| `scripts/cashflow-build.ts` | pack → `data/cashflow/parquet` (manifest + 4 Parquet, 65.7 kB) + `data/cashflow/checks/control_totals_usd.csv`; asserts AT-01 (1,554 control values / 38 periods), byte-identical rerun. `node --import tsx scripts/cashflow-build.ts --data <pack>` |
| `data/cashflow/sql/001-schema-and-roles.sql`, `002-schema.sql` | **applied 11-26** via MCP: schema, 5 tables, `cashflow_loader` / `cashflow_reader` NOLOGIN; 42501 proved on qbo, demo_sales, trucks_demo, mirelo_demo; advisors 0 lints; DB 65.3 % before |
| `scripts/cashflow-load.ts` | load + verify, as `CASHFLOW_LOAD_DATABASE_URL` (owner's machine) |
| `src/lib/cashflow/data/` | `manifest.ts` (FILES + strict Zod), `loader.ts` (errors name the file; `loader.test.ts`), `parquet-columns.ts` (the report's own vendored codec, ADR-0013 (h); was imported from trucks until 11-26 evening) |
| `src/lib/cashflow/engine/` | calendar, statement, direct (heat, ledger), quintile, metrics, format, self-check, nav (Esc stack), url-state (Zod codec, keys `p u v a l d c s pop g`; read once on open, never written back), copy, view (all view models) |
| `src/lib/cashflow/{artifacts,server}.ts`, `src/app/api/cashflow/[...path]/route.ts` | data route (reader, Session pooler 5432); `artifacts.test.ts` (whitelist, columns round trip) |
| `src/components/cashflow/` | `cashflow-app.tsx` (root: load, state from the URL on open, document keydown for Esc, pop-ups, tooltip), `views.tsx`, `popups.tsx`, `icons.tsx`, `cashflow.css` (mock CSS scoped to `.acme-cf`), `cashflow-fonts.ts` |
| `src/fonts/space-grotesk/`, `src/fonts/jetbrains-mono/` | self-hosted (`scripts/fonts-build.py`, two faces added; other fonts untouched) |
| Wiring | `js-reports.ts` (type, URL keys, `CASHFLOW_DATABASE_URL`), `js-report-lazy.tsx`, `work.ts` entry + gate (page hidden until the env var is set; other JS reports unchanged) |
| `package.json` | devDependency `hyparquet-writer` 0.18.0 exact (the build script only) |

Tests: `src/lib/cashflow/engine/engine.test.ts` (AT-02, AT-03 1,666/1,666, AT-04) and `units.test.ts` (AT-06…AT-10).

## Verified

**11-26 (first pass):** typecheck, lint, tests; headless walk-through on a mocked route (landing KPIs and statement = spec
02 § 4, Q3 2026 = 92 columns, Reconciliation 2025 44/44, palette 0 bad in 12 states).

**11-26 evening (subagents; harnesses in that session's scratchpad, not committed):**

| Check | Result |
| --- | --- |
| AT-01 build asserts | 1,554 / 1,554, byte-identical rerun |
| AT-03 self-check | 1,666 / 1,666 |
| AT-05 mock parity, 49 periods | 15,005 / 15,005 values (statement rows expanded + collapsed, 24 metrics + prior window, line totals, flows, heat cells and blocks); planted defects caught |
| AT-12 click-through | 36 / 36, 0 console errors or warnings |
| AT-13 layout at 1440 × 810 | 17 / 17 (Closing cash button vs delta: min gap 18.3 px over 98 states) |
| AT-14 palette | 20 / 20 states, 0 colours outside the set |
| AT-15 accessibility | 36 keyboard flows, focus returns to the opener, axe 0 violations in 14 states (contrast on the grain backgrounds comes back "incomplete", not judged), reduced motion 0 animated elements |
| Laptop, site popup | 1366 × 768 (scale 0.851) and 1440 × 900: no clipping, one scroll area per state |
| Showcase page | one screen, no scroll at 1440 × 900 and 1366 × 768; phone 390 × 844 scrolls 199 px |
| `pnpm build` | passes, no warnings |
| Security (read-only, MCP) | roles, settings, grants and schema ACL as trucks / nordmark; anon / authenticated no USAGE; advisors 0 lints |

Fixed on the way: 12 UI defects (duplicate banner / main landmarks, `aria-expanded` on a row → real toggle buttons, heat
grid role + live readout, focusable ledger region, focus into ⓘ pop-ups, focus after Expand / Collapse all and at the
calendar's ends, tooltips lost on scroll, Path step box width); the first mouse click on a scrolled heat grid was lost
(cursor moves on keyboard focus only now); the report no longer rewrites the showcase page's URL (utm_ keys kept);
`cleared` is checked, not cast; dead code removed (`tokens.ts`, `currentSec`, a re-export).

### AT-17 budgets

| Budget | Measured |
| --- | --- |
| CF-DAT-04 (≤ 150 kB) | pack 67.3 kB (ledger 45.5, manifest 11.5, control 5.6, month 2.7, statement-month 1.9); over the wire as columns 37.5 kB gzip |
| CF-NFR-01 | manifest, then the 4 tables in parallel (two round trips); `s-maxage=86400, stale-while-revalidate=604800`, names not content-hashed |
| CF-NFR-02 (≤ 300 kB gzip) | page first load 185.8 kB + report lazy JS 73.3 kB (Zod 31.3, hyparquet ~18–23, which the browser never runs) ≈ 259 kB, + 6.5 kB CSS |
| CF-NFR-03 (LCP ≤ 2.0 s, CLS ≤ 0.02) | dev: LCP 132 ms, CLS 0; click → statement painted 266 ms. **Measure on the deployed URL** |
| CF-NFR-04 (≤ 100 ms p95; largest ledger ≤ 1 s) | dev build (upper bound): p95 63 ms over 62 interactions; largest ledger (2025 Operating, 963 rows) 278–732 ms |
| CF-NFR-05 (5 / 10 / 500 ms) | one period's statement + metrics + flows median 0.019 ms; 2025 heat grid median 0.19 ms; full self-check ~21 ms |

## Not done

1. Owner, **in this order** (an empty table answers a cacheable 200, so env before load pins empty data on the CDN for a
   day): passwords for both roles (checked 11-27: both still NOLOGIN; SQL editor:
   `alter role cashflow_loader login password '<32+ chars>'; alter role cashflow_reader login password '<32+ chars>';`,
   then in `.env.local` `CASHFLOW_LOAD_DATABASE_URL` and `CASHFLOW_DATABASE_URL`, Session pooler, port 5432, users
   `cashflow_loader.howpxpdnjjzdwqrgxkee` / `cashflow_reader.howpxpdnjjzdwqrgxkee`) → `node --env-file=.env.local --import tsx scripts/cashflow-load.ts` ("verified 5
   artifacts, 0 differ") → Vercel `CASHFLOW_DATABASE_URL` (Session pooler, 5432) → redeploy. Redeploy after any re-run
   of `002-schema.sql` or reload.
2. After the load: row counts 1 / 34 / 578 / 2,838 / 777; `42501` denials on real rows (cashflow roles on qbo,
   demo_sales, trucks_demo; trucks_reader / anon / authenticated on `cashflow_demo.ledger`); reader cannot delete /
   truncate / update; `pg_stat_activity` shows only `cashflow_reader` from Vercel; `get_advisors(security)` zero lints.
3. Live: the five artifacts 200 with the cache header, unknown / traversal names 404, POST 405; CF-NFR-03 on the URL.
4. Power BI embed link (owner) → `powerBi` on the work entry; the `cashflow` special case in `work.ts`'s filter goes then.
5. ✅ 11-27 (`9c3249f`): hyparquet out of the popup chunk, the tooltip state out of the Board root, tables fetched with
   the manifest. Left (review notes): Board / ActivitiesView size, shared focus-trap and `routeSource` helpers.

**Deviation from CF-URL-03 (11-26 evening, review X2, as the other reports in the site popup):** the URL is read once
when the report opens and never written back, so the showcase page keeps the URL the visitor came with (utm_, gclid).
A deep link still opens the report in its state (verified: transactions, activities + sort, diagram groups, bad values
→ defaults); its query stays in the address bar while the visitor moves on. AT-12 #21 (a reload keeps `u=k`) and #33
(a bad query rewritten to `/`) cannot pass as written; their on-screen behaviour does. No "Copy link" (owner).

Not ported on purpose (spec): CSP / iframe embed contract (the report lives in the site popup), `localStorage` unit,
dead mock CSS. Deviation: `ledger.txn_date` is an ISO string, not date32.
