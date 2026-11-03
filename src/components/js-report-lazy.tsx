"use client";

import dynamic from "next/dynamic";
import type { JsReport } from "@/lib/js-reports";

/**
 * The split point for each JS report's client chunk (its engine, hyparquet and its UI), same reason as
 * <SalesDashboardLazy>: only the page that renders a report downloads it, and only when the popup opens. The
 * report's data files load after that, in the browser.
 *
 * Browser-only (`ssr: false`): a report reads `window.location` as it mounts (its URL state, report-search.ts).
 * In the popup that was never on the server; the report's own window (app/report/[slug]) is prerendered, and
 * there the report mounts after hydration instead.
 */
const REPORTS: Record<JsReport, React.ComponentType> = {
  pnl: dynamic(() => import("./pnl/shell").then((m) => m.Shell), {
    ssr: false,
  }),
  mirelo: dynamic(() => import("./mirelo/sales-app").then((m) => m.SalesApp), {
    ssr: false,
  }),
  nordmark: dynamic(
    () => import("./nordmark/exec-app").then((m) => m.ExecApp),
    { ssr: false },
  ),
};

export function JsReportLazy({ report }: { report: JsReport }) {
  const Report = REPORTS[report];
  return <Report />;
}
