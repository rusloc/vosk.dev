# Freight forwarding sales report: the web version

The custom JS report behind the **Web report** button of `/work/freight-sales-report`, beside its Power BI original
("Freight Sales Demo", published to web from Fabric). Built 2026-11-24 from the data in the owner's `.sync` folder
(`C:\__ISS__\__REPORTS\.sync\data`); that folder's README is kept here as
[`data-readme-2026-11-24.md`](data-readme-2026-11-24.md).

**The data is a client's report on anonymised data:** every company and person name, id and code is generated, and the
amounts are scaled per client and per shipment. Dates and geography are real. The site labels it "Client report,
anonymised data" (`data: "anonymised"` in `src/lib/work.ts`).

## Where it lives

| Path | What |
|---|---|
| `public/data/freight/` | `shipments.parquet` (66,131 rows) and `postings.parquet` (468,668 rows), **as delivered** (owner, 11-24). The six small lookup files of the delivery are not shipped: the report takes its lists from the data |
| `src/lib/freight/data.ts` | Which columns are read, and how they become typed arrays and dictionaries |
| `src/lib/freight/engine.ts` | Every number: filters, KPIs vs the previous period, flat and pivot tables, Top N clients, shipment detail |
| `src/lib/freight/format.ts` | Number and date formats as Power BI writes them |
| `src/lib/freight/engine.test.ts` | Parity with the published Power BI report (below), in `pnpm test` |
| `src/components/freight/` | The UI: `freight-app.tsx` (root, header, KPI cards, pop-overs), `data-table.tsx`, `top-clients.tsx`, `freight.module.css` |

## How the data loads

**Parquet in the build, no database** (owner, 11-24: an exception to the Supabase rule, written into `CLAUDE.md`). No
server route, no reader login, no env var: the Web report button is always on.

The browser reads only the columns the report uses, through HTTP range requests (`hyparquet`'s `asyncBufferFromUrl`):
about **14 to 16 MB** of the 20 MB, once per page view (the dataset is kept in memory after that). Loads in 1.3–2.6 s
on `localhost`; on a phone network it takes longer. The range requests skip the HTTP cache (`cache: "no-store"`):
Chromium fails parallel range requests on one cached URL with `ERR_CACHE_OPERATION_NOT_SUPPORTED` (seen 11-24).

Anyone can download these files, as anyone can open the Power BI publish-to-web link.

## The model

| | Source | Date axis | Rules |
|---|---|---|---|
| **Expected** | shipments | operational date | revenue and GP from the shipment's expected amounts; shipments = rows; clients = distinct client names |
| **Actual** | ledger postings | accounting date | revenue = Revenue postings; GP = all postings (costs are negative); shipments and clients counted on Revenue postings only |

Each KPI is compared with the period of the same length just before it (Power BI's "prev. 153d"). Good = up or flat, Off
track = down. A posting carries its own client, manager and company: 20 % of postings have no shipment row, and their
account managers often differ from the shipment's, so postings are never joined to shipments.

Views: **Operational date** and **Accounting date** (flat: one row per shipment with a column picker; pivot: totals per
attribute), **Top N clients** (by expected or actual revenue or GP, and by CBM, chargeable weight or TEU; a bar click
filters the page to that client). Filters: company, client, account manager, sales user, origin, destination, line of
business, service; the period with presets. A shipment id opens its fields and ledger postings.

## Parity with Power BI

The expected values come from the published Power BI report's own screen (company CO-FRA, 1 Jun – 31 Oct 2026, USD),
read 11-24, never from this engine: the 16 KPI values and changes, the accounting pivot's Total row, the first rows of
the shipment table, and the top of both Top 10 charts. All match (`engine.test.ts`).

## Not built

- **Ask AI** (owner, 11-24: not for now).
- Shared report links: the view does not travel in the URL (`REPORT_QUERY_KEYS.freight` is empty).
