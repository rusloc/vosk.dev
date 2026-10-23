"use client";

import dynamic from "next/dynamic";

/**
 * The split point for the P&L report's client chunk (the engine, hyparquet and the Ledger UI), same reason as
 * <SalesDashboardLazy>: only the page that renders it downloads it. The data files load after that, in the browser.
 */
export const PnlReportLazy = dynamic(() =>
  import("./pnl/shell").then((m) => m.Shell),
);
