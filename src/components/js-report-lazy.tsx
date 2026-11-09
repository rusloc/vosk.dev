"use client";

import dynamic from "next/dynamic";
import type { JsReport } from "@/lib/js-reports";

/**
 * The split point for each JS report's client chunk (its engine, hyparquet and its UI), same reason as
 * <SalesDashboardLazy>: only the page that renders a report downloads it, and only when the popup opens. The
 * report's data files load after that, in the browser.
 */
const REPORTS: Record<
  JsReport,
  React.ComponentType<{ chat?: boolean; chatOpen?: boolean }>
> = {
  pnl: dynamic(() => import("./pnl/shell").then((m) => m.Shell)),
  mirelo: dynamic(() => import("./mirelo/sales-app").then((m) => m.SalesApp)),
  nordmark: dynamic(() => import("./nordmark/exec-app").then((m) => m.ExecApp)),
  marketing: dynamic(() =>
    import("./marketing/marketing-app").then((m) => m.MarketingApp),
  ),
};

/**
 * `chat`: the report shows the site's Ask AI button (Mirelo, ACME Marketing and the P&L; Nordmark ignores it). `chatOpen`: its chat
 * opens as soon as the report is up (the page's Ask AI button, 11-06).
 */
export function JsReportLazy({
  report,
  chat = false,
  chatOpen = false,
}: {
  report: JsReport;
  chat?: boolean;
  chatOpen?: boolean;
}) {
  const Report = REPORTS[report];
  return <Report chat={chat} chatOpen={chatOpen} />;
}
