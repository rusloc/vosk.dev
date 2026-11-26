import { URL_KEYS as CASHFLOW_KEYS } from "./cashflow/engine/url-state";
import {
  URL_KEYS as MARKETING_KEYS,
  VIEW_HASHES as MARKETING_HASHES,
} from "./marketing/engine/url-state";
import { URL_KEYS as MIRELO_KEYS } from "./mirelo/url-state";
import { URL_KEYS as NORDMARK_KEYS } from "./nordmark/engine/url-state";
import { SELECTION_KEYS } from "./pnl/state/selection-schema";
import { VIEW_STATE_KEYS } from "./pnl/state/view-state";
import { URL_KEYS as TRUCKS_KEYS } from "./trucks/engine/url-state";

/**
 * The reports built in this repo (`platform: "js"` showcases): each is a client component under
 * `components/<report>/` over a framework-free engine in `lib/<report>/`. Each loads its data through its own server
 * route (`/api/<report>/*`, from its `<report>_demo` schema; Nordmark from `public/data/nordmark/` until its go-live) and
 * computes every number in the browser. The freight report reads Parquet shipped in the build (public/data/freight/,
 * owner 11-24) and has no server route. They were handed over as standalone apps
 * (docs/<report>/) and are owned here since.
 */
export type JsReport =
  | "pnl"
  | "mirelo"
  | "nordmark"
  | "marketing"
  | "trucks"
  | "freight"
  | "cashflow";

/**
 * The query-string keys each report's state is encoded with. A showcase-page URL carrying one of them is a
 * shared report link (F-37): the page opens the popup on arrival, in that state.
 */
export const REPORT_QUERY_KEYS: Record<JsReport, readonly string[]> = {
  pnl: [...SELECTION_KEYS, ...VIEW_STATE_KEYS],
  mirelo: MIRELO_KEYS,
  nordmark: NORDMARK_KEYS,
  marketing: MARKETING_KEYS,
  trucks: TRUCKS_KEYS,
  freight: [], // no shared report links yet: its view does not travel in the URL
  cashflow: CASHFLOW_KEYS, // 2026-11-26
};

/** Reports whose view travels in the URL hash: a shared link with one of these opens the popup as well. */
export const REPORT_HASHES: Partial<Record<JsReport, readonly string[]>> = {
  marketing: MARKETING_HASHES,
};

/**
 * The env var a JS report's data needs on the server, for the reports that read Supabase through a server route
 * (CLAUDE.md § Supabase). Without it the route answers 503, so the page leaves the "Web report" button out rather
 * than open a report that cannot load. Mirelo is not listed: it has been live since 11-03.
 */
export const REPORT_DATA_ENV: Partial<Record<JsReport, string>> = {
  marketing: "MARKETING_DATABASE_URL",
  pnl: "PNL_DATABASE_URL", // 2026-11-09: the P&L rows moved to Supabase (pnl_demo)
  trucks: "TRUCKS_DATABASE_URL", // 2026-11-09
  cashflow: "CASHFLOW_DATABASE_URL", // 2026-11-26: cashflow_demo
  // nordmark: "NORDMARK_DATABASE_URL" returns with its Supabase go-live. Until then production reads the static
  // public/data/nordmark files, so the button stays on (11-16 hotfix: b539448 shipped this gate before the load).
};

/**
 * The reports with an AI chat (ADR-0005; Mirelo and ACME Marketing 11-06, the P&L and ACME Trucks 11-09). A report's chat
 * go-live is one line here. Nordmark joins with its Supabase go-live (its chat route ships then; 11-16 hotfix).
 */
export const CHAT_REPORTS: ReadonlySet<JsReport> = new Set<JsReport>([
  "mirelo",
  "marketing",
  "pnl",
  "trucks",
]);
