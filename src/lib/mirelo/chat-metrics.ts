import type { Cube, FunnelSum, LoanSum, Snapshot, SubsSum } from "./cube";
import {
  fmtCount,
  fmtDays,
  fmtDeltaDays,
  fmtDeltaHours,
  fmtDeltaPct,
  fmtEur,
  fmtEur0,
  fmtEurDelta,
  fmtHours,
  fmtPct,
  fmtPp,
  MINUS,
} from "./format";
import type { Metrics } from "./metrics";
import type { MarketSel, ViewId } from "./types";
import { monthsOf, shift } from "./windows";
import type { Window } from "./windows";

// The Mirelo metric catalogue for the report chat (2026-11-07, `.log/report/2026-11-07-ai-chat-metrics-plan.md` §3):
// every figure the chat may name, with its formula, the cuts it takes and how it reads on the cube the cards use. The
// chat's `get_metric` tool computes and formats here, so the model quotes and never computes. `derived` = no card
// shows this figure; the answer says so. Answer key: data/mirelo/checks/chat-golden.csv (chat-metrics.test.ts).

export type Dim =
  "market" | "product" | "channel" | "client" | "stream" | "tier";
type Unit = "count" | "eur" | "eur0" | "eur2" | "pct" | "hours" | "days";
type Kind = "flow" | "stock"; // stock = month-end of the window's last month

/** One question's cut: the window, a market and at most one member per other dimension. */
export interface MetricQuery {
  w: Window;
  market: MarketSel;
  product?: string;
  channel?: string;
  client?: "NEW" | "RETURNING";
  stream?: string;
  tier?: string;
}

export interface MetricDef {
  id: string;
  name: string;
  aliases: string;
  unit: Unit;
  kind: Kind;
  view: ViewId; // where the "Show in the report" link lands
  formula: string;
  derived?: true;
  /** Cuts this metric takes (market always). */
  dims: readonly Dim[];
  /** "up" = higher is better, "down" = lower is better, null = no side. */
  better: "up" | "down" | null;
  value(q: MetricQuery): number | null;
  budget?(q: MetricQuery): number | null;
  /** Why the value is n/a when it is (e.g. medians exist only for a month, QTD, YTD or the last 12 months). */
  naNote?: string;
}

const LOAN_PRODUCTS = ["FLEX30", "FLEX90", "STEP6", "STEP12", "BIZ"] as const;
const PAYING = ["PLUS", "PRO"] as const;

const ratio = (n: number, d: number): number | null => (d > 0 ? n / d : null);
const sumOf = (xs: readonly (number | null)[]): number | null =>
  xs.some((x) => x === null)
    ? null
    : xs.reduce<number>((a, x) => a + (x ?? 0), 0);

/** A small EUR amount at fixed decimals, signed when asked: "€5.93", "−€18", "+€0.34". */
function euros(v: number, decimals: number, signed = false): string {
  const sign = v < 0 ? MINUS : signed && v > 0 ? "+" : "";
  return `${sign}€${Math.abs(v).toFixed(decimals)}`;
}

const FORMAT: Record<Unit, (v: number | null) => string> = {
  count: fmtCount,
  eur: fmtEur,
  eur0: fmtEur0,
  eur2: (v) => (v === null ? fmtEur0(v) : euros(v, 2)),
  pct: (v) => fmtPct(v),
  hours: fmtHours,
  days: fmtDays,
};

export const formatValue = (unit: Unit, v: number | null) => FORMAT[unit](v);

/** The change shown beside a comparator: pp for ratios, a signed amount and % for amounts and counts. */
export function formatDelta(unit: Unit, v: number, cmp: number): string {
  const d = v - cmp;
  const rel = cmp !== 0 ? fmtDeltaPct(d / Math.abs(cmp)) : null;
  switch (unit) {
    case "pct":
      return fmtPp(d);
    case "hours":
      return fmtDeltaHours(d);
    case "days":
      return fmtDeltaDays(d);
    case "eur":
      return `${fmtEurDelta(d)}${rel ? `, ${rel}` : ""}`;
    case "eur0":
    case "eur2":
      return `${euros(d, unit === "eur2" ? 2 : 0, true)}${rel ? `, ${rel}` : ""}`;
    case "count": {
      const sign = d > 0 ? "+" : d < 0 ? MINUS : "";
      return `${sign}${fmtCount(Math.abs(d))}${rel ? `, ${rel}` : ""}`;
    }
  }
}

export function createMetricCatalogue(cube: Cube, m: Metrics) {
  const match = (
    q: MetricQuery,
    r: { product?: string; channel?: string; stream?: string },
  ) =>
    (q.product === undefined || r.product === q.product) &&
    (q.channel === undefined || r.channel === q.channel) &&
    (q.stream === undefined || r.stream === q.stream);
  const repeatOf = (q: MetricQuery) =>
    q.client === undefined ? undefined : q.client === "RETURNING";

  const loans = (q: MetricQuery): LoanSum =>
    cube.loans(q.w, q.market, {
      product: q.product,
      channel: q.channel,
      repeat: repeatOf(q),
    });
  const funnel = (q: MetricQuery): FunnelSum | null =>
    cube
      .funnelBy(q.w, q.market, (r) => (match(q, r) ? "" : "x"), repeatOf(q))
      .get("") ?? null;
  const snap = (q: MetricQuery): Snapshot | null =>
    cube
      .snapshotBy(q.w.end, q.market, (r) => (match(q, r) ? "" : "x"))
      ?.get("") ?? null;
  const revenue = (q: MetricQuery): number =>
    cube.revenueBy(q.w, q.market, (r) => (match(q, r) ? "" : "x")).get("") ?? 0;
  const tiers = (q: MetricQuery): readonly string[] =>
    q.tier ? [q.tier] : PAYING;
  const subsAt = (month: number, q: MetricQuery): SubsSum | null =>
    month < cube.first || month > cube.closed
      ? null
      : cube.subs(month, q.market, tiers(q));
  const subsOver = (q: MetricQuery) => monthsOf(q.w).map((i) => subsAt(i, q));
  const interestFees = (q: MetricQuery) =>
    revenue({ ...q, stream: "INTEREST" }) + revenue({ ...q, stream: "FEE" });
  const avgOutstanding = (q: MetricQuery): number | null => {
    const xs = monthsOf(q.w).map(
      (i) => snap({ ...q, w: { start: i, end: i } })?.outstanding ?? null,
    );
    const ok = xs.filter((x): x is number => x !== null);
    return ok.length ? ok.reduce((a, x) => a + x, 0) / ok.length : null;
  };
  const budget = (q: MetricQuery, metric: string) =>
    q.channel || q.client
      ? null
      : cube.budget(q.w, q.market, metric, q.product ? [q.product] : undefined);
  const stat = (q: MetricQuery, field: Parameters<Metrics["median"]>[2]) =>
    q.product || q.channel || q.client ? null : m.median(q.w, q.market, field);
  const cohorts = (q: MetricQuery) => monthsOf(q.w);
  const cohortAt = (q: MetricQuery, day: number): number | null =>
    q.product || q.channel || q.client
      ? null
      : (m.cohortCurve(cohorts(q), q.market)[cube.cohortDays.indexOf(day)] ??
        null);
  const LOAN_DIMS = ["market", "product", "channel", "client"] as const;
  const MEDIAN_NOTE =
    "Medians exist for a month, a quarter to date, a year to date or the last 12 months, all markets or one, with no other filter.";

  const defs: MetricDef[] = [
    // ---- volume ----
    {
      id: "loans",
      name: "Loans disbursed",
      aliases: "loan count, originations count, выдачи",
      unit: "count",
      kind: "flow",
      view: "loans",
      dims: LOAN_DIMS,
      better: "up",
      formula: "Count of loans with a disbursed date in the window.",
      value: (q) => loans(q).loans,
      budget: (q) => budget(q, "LOANS"),
    },
    {
      id: "principal",
      name: "Principal disbursed",
      aliases: "originations, lending volume, disbursed amount, сумма выдач",
      unit: "eur",
      kind: "flow",
      view: "loans",
      dims: LOAN_DIMS,
      better: "up",
      formula: "Σ local principal ÷ the month's actual rate, in EUR.",
      value: (q) => loans(q).principal,
      budget: (q) => budget(q, "PRINCIPAL_LOCAL"),
    },
    {
      id: "principal_cc",
      name: "Principal at constant currency",
      aliases: "principal at Budget FX",
      unit: "eur",
      kind: "flow",
      view: "loans",
      dims: LOAN_DIMS,
      better: "up",
      derived: true,
      formula:
        "Σ local principal ÷ the Budget rate of the month: lending without the FX effect.",
      value: (q) => loans(q).principalBudFx,
      budget: (q) => budget(q, "PRINCIPAL_LOCAL"),
    },
    {
      id: "avg_ticket",
      name: "Average ticket",
      aliases: "average loan size, ticket size, средний чек",
      unit: "eur0",
      kind: "flow",
      view: "loans",
      dims: LOAN_DIMS,
      better: null,
      formula: "Principal ÷ loans.",
      value: (q) => ratio(loans(q).principal, loans(q).loans),
      budget: (q) => {
        const p = budget(q, "PRINCIPAL_LOCAL");
        const l = budget(q, "LOANS");
        return p !== null && l ? p / l : null;
      },
    },
    {
      id: "new_clients",
      name: "New clients",
      aliases: "first loans, acquisition, новые клиенты",
      unit: "count",
      kind: "flow",
      view: "clients",
      dims: ["market", "product", "channel"],
      better: "up",
      formula:
        "Σ first loans in the window (not first approval, not first account).",
      value: (q) => loans({ ...q, client: undefined }).first,
      budget: (q) =>
        q.product || q.channel
          ? null
          : cube.budget(q.w, q.market, "NEW_CLIENTS"),
    },
    {
      id: "repeat_loans",
      name: "Repeat loans",
      aliases: "loans to returning clients",
      unit: "count",
      kind: "flow",
      view: "clients",
      dims: ["market", "product", "channel"],
      better: "up",
      derived: true,
      formula: "Loans to clients with an earlier loan.",
      value: (q) => loans({ ...q, client: undefined }).repeat,
    },
    {
      id: "repeat_share",
      name: "Repeat share of loans",
      aliases: "returning % of loans, repeat rate",
      unit: "pct",
      kind: "flow",
      view: "clients",
      dims: ["market", "product", "channel"],
      better: "up",
      formula: "Repeat loans ÷ loans.",
      value: (q) =>
        ratio(
          loans({ ...q, client: undefined }).repeat,
          loans({ ...q, client: undefined }).loans,
        ),
    },
    {
      id: "borrowers",
      name: "Borrowers",
      aliases: "active borrowers, distinct clients with a loan",
      unit: "count",
      kind: "flow",
      view: "clients",
      dims: ["market"],
      better: "up",
      formula: "Distinct clients with a loan disbursed in the window.",
      naNote: MEDIAN_NOTE.replace("Medians", "Distinct counts"),
      value: (q) => m.stat(q.w, q.market)?.borrowers ?? null,
    },
    {
      id: "returning_clients",
      name: "Returning clients",
      aliases: "repeat borrowers",
      unit: "count",
      kind: "flow",
      view: "clients",
      dims: ["market"],
      better: "up",
      formula: "Distinct borrowers in the window with an earlier loan.",
      naNote: MEDIAN_NOTE.replace("Medians", "Distinct counts"),
      value: (q) => m.stat(q.w, q.market)?.returning ?? null,
    },
    {
      id: "returning_share",
      name: "Returning share of clients",
      aliases: "returning clients %, loyalty",
      unit: "pct",
      kind: "flow",
      view: "clients",
      dims: ["market"],
      better: "up",
      formula:
        "Distinct returning borrowers ÷ distinct borrowers (client-weighted). No Budget exists for this ratio.",
      naNote: MEDIAN_NOTE.replace("Medians", "Distinct counts"),
      value: (q) => m.returning(q.w, q.market),
    },
    {
      id: "share_of_loans",
      name: "Share of loans",
      aliases: "channel mix, product mix, доля",
      unit: "pct",
      kind: "flow",
      view: "revenue",
      dims: LOAN_DIMS,
      better: null,
      formula:
        "Loans in the cut (product, channel or client type) ÷ all loans of the market in the window. Use with a filter or a breakdown.",
      value: (q) => ratio(loans(q).loans, cube.loans(q.w, q.market).loans),
    },
    // ---- funnel ----
    ...(
      [
        [
          "leads",
          "Leads",
          "leads, заявки-лиды",
          (f: FunnelSum) => f.leads,
          "Σ leads in the window (funnel, by month).",
          false,
        ],
        [
          "applications_started",
          "Applications started",
          "started applications",
          (f: FunnelSum) => f.started,
          "Σ applications started in the window.",
          false,
        ],
        [
          "applications",
          "Applications submitted",
          "submitted applications, заявки",
          (f: FunnelSum) => f.submitted,
          "Σ applications submitted in the window.",
          false,
        ],
        [
          "kyc_passed",
          "KYC passed",
          "identity check passed",
          (f: FunnelSum) => f.kyc,
          "Σ applications that passed KYC in the window.",
          true,
        ],
        [
          "approved",
          "Applications approved",
          "approvals, одобрения",
          (f: FunnelSum) => f.approved,
          "Σ applications approved in the window.",
          false,
        ],
      ] as const
    ).map(([id, name, aliases, pick, formula, derived]): MetricDef => ({
      id,
      name,
      aliases,
      unit: "count",
      kind: "flow",
      view: "loans",
      dims: LOAN_DIMS,
      better: "up",
      formula,
      ...(derived ? { derived: true as const } : {}),
      value: (q) => {
        const f = funnel(q);
        return f ? pick(f) : 0;
      },
    })),
    {
      id: "approval_rate",
      name: "Approval rate",
      aliases: "acceptance rate, approve rate, уровень одобрения",
      unit: "pct",
      kind: "flow",
      view: "loans",
      dims: LOAN_DIMS,
      better: null,
      formula:
        "Approved ÷ submitted, cohorted by submission day. No Budget exists for this ratio. With client = NEW or RETURNING it is the Clients view's new / returning approval rate.",
      value: (q) => m.approval(funnel(q)),
    },
    {
      id: "kyc_pass_rate",
      name: "KYC pass rate",
      aliases: "verification pass rate",
      unit: "pct",
      kind: "flow",
      view: "loans",
      dims: LOAN_DIMS,
      better: "up",
      derived: true,
      formula: "KYC passed ÷ submitted.",
      value: (q) => {
        const f = funnel(q);
        return f ? ratio(f.kyc, f.submitted) : null;
      },
    },
    {
      id: "take_up",
      name: "Take-up",
      aliases: "approved to disbursed, offer acceptance",
      unit: "pct",
      kind: "flow",
      view: "loans",
      dims: LOAN_DIMS,
      better: "up",
      formula: "Disbursed ÷ approved.",
      value: (q) => m.takeUp(funnel(q)),
    },
    {
      id: "lead_to_loan",
      name: "Lead → loan",
      aliases: "lead conversion, конверсия лида в заём",
      unit: "pct",
      kind: "flow",
      view: "clients",
      dims: LOAN_DIMS,
      better: "up",
      formula: "Disbursed ÷ leads.",
      value: (q) => {
        const f = funnel(q);
        return f ? ratio(f.disbursed, f.leads) : null;
      },
    },
    {
      id: "start_rate",
      name: "Lead → started",
      aliases: "application start rate",
      unit: "pct",
      kind: "flow",
      view: "loans",
      dims: LOAN_DIMS,
      better: "up",
      derived: true,
      formula: "Applications started ÷ leads.",
      value: (q) => {
        const f = funnel(q);
        return f ? ratio(f.started, f.leads) : null;
      },
    },
    // ---- speed ----
    {
      id: "hours_to_cash",
      name: "Time to cash",
      aliases: "time to money, submission to payout",
      unit: "hours",
      kind: "flow",
      view: "loans",
      dims: ["market"],
      better: "down",
      naNote: MEDIAN_NOTE,
      formula: "Median hours from submission to cash over the window's loans.",
      value: (q) => stat(q, "median_hours_to_cash"),
    },
    {
      id: "hours_to_approve",
      name: "Time to approve",
      aliases: "decision time",
      unit: "hours",
      kind: "flow",
      view: "loans",
      dims: ["market"],
      better: "down",
      naNote: MEDIAN_NOTE,
      formula: "Median hours from submission to approval.",
      value: (q) => stat(q, "median_hours_to_approve"),
    },
    {
      id: "hours_payout",
      name: "Payout time",
      aliases: "approval to cash",
      unit: "hours",
      kind: "flow",
      view: "loans",
      dims: ["market"],
      better: "down",
      naNote: MEDIAN_NOTE,
      formula: "Median hours from approval to cash.",
      value: (q) => stat(q, "median_hours_payout"),
    },
    {
      id: "days_between_loans",
      name: "Days between loans",
      aliases: "repeat gap, time to next loan",
      unit: "days",
      kind: "flow",
      view: "clients",
      dims: ["market"],
      better: null,
      naNote: MEDIAN_NOTE,
      formula:
        "Median days between a repeat loan and the client's previous loan.",
      value: (q) => stat(q, "median_days_between"),
    },
    // ---- portfolio, month-end of the window's last month ----
    {
      id: "outstanding",
      name: "Outstanding balance",
      aliases: "portfolio, book, loan book, портфель",
      unit: "eur",
      kind: "stock",
      view: "portfolio",
      dims: ["market", "product"],
      better: null,
      formula: "Month-end outstanding at the month's actual rate.",
      value: (q) => snap(q)?.outstanding ?? null,
    },
    {
      id: "active_loans",
      name: "Active loans",
      aliases: "loans on book",
      unit: "count",
      kind: "stock",
      view: "portfolio",
      dims: ["market", "product"],
      better: null,
      formula: "Loans active at month-end.",
      value: (q) => snap(q)?.active ?? null,
    },
    {
      id: "dpd30_balance",
      name: "30+ DPD balance",
      aliases: "overdue balance, arrears 30+",
      unit: "eur",
      kind: "stock",
      view: "portfolio",
      dims: ["market", "product"],
      better: "down",
      formula: "30–59 + 60–89 + 90+ DPD balance at month-end.",
      value: (q) => {
        const s = snap(q);
        return s ? s.b30_59 + s.b60_89 + s.b90p : null;
      },
    },
    {
      id: "dpd30",
      name: "30+ DPD % (balance)",
      aliases: "PAR30, NPL 30, delinquency, просрочка 30+",
      unit: "pct",
      kind: "stock",
      view: "portfolio",
      dims: ["market", "product"],
      better: "down",
      formula:
        "(30–59 + 60–89 + 90+ DPD balance) ÷ outstanding at month-end. Budget per market only.",
      value: (q) => m.dpd30(snap(q)),
      budget: (q) => (q.product ? null : cube.budgetDpd30(q.w.end, q.market)),
    },
    {
      id: "dpd90",
      name: "90+ DPD % (balance)",
      aliases: "PAR90, NPL 90",
      unit: "pct",
      kind: "stock",
      view: "portfolio",
      dims: ["market", "product"],
      better: "down",
      formula: "90+ DPD balance ÷ outstanding at month-end.",
      value: (q) => m.dpd90(snap(q)),
    },
    {
      id: "dpd30_count",
      name: "30+ DPD % (loans)",
      aliases: "share of loans overdue",
      unit: "pct",
      kind: "stock",
      view: "portfolio",
      dims: ["market", "product"],
      better: "down",
      formula: "Loans 30+ DPD ÷ active loans at month-end.",
      value: (q) => m.dpd30Count(snap(q)),
    },
    ...(
      [
        [
          "balance_current",
          "Current balance (not overdue)",
          (s: Snapshot) => s.current,
        ],
        ["balance_1_29", "Balance 1–29 DPD", (s: Snapshot) => s.b1_29],
        ["balance_30_59", "Balance 30–59 DPD", (s: Snapshot) => s.b30_59],
        ["balance_60_89", "Balance 60–89 DPD", (s: Snapshot) => s.b60_89],
        ["balance_90p", "Balance 90+ DPD", (s: Snapshot) => s.b90p],
      ] as const
    ).map(([id, name, pick]): MetricDef => ({
      id,
      name,
      aliases: "DPD bucket balance",
      unit: "eur",
      kind: "stock",
      view: "portfolio",
      dims: ["market", "product"],
      better: null,
      formula: `${name} at month-end, in EUR.`,
      value: (q) => {
        const s = snap(q);
        return s ? pick(s) : null;
      },
    })),
    {
      id: "roll_30_60",
      name: "Roll rate 30→60",
      aliases: "roll rate",
      unit: "pct",
      kind: "stock",
      view: "portfolio",
      dims: ["market", "product"],
      better: "down",
      formula:
        "60–89 balance this month ÷ 30–59 balance last month (balances also amortise).",
      value: (q) => {
        const now = snap(q);
        const prev = snap({
          ...q,
          w: { start: q.w.end - 1, end: q.w.end - 1 },
        });
        return now && prev ? ratio(now.b60_89, prev.b30_59) : null;
      },
    },
    {
      id: "roll_1_30",
      name: "Roll rate 1–29→30+",
      aliases: "early roll rate",
      unit: "pct",
      kind: "stock",
      view: "portfolio",
      dims: ["market", "product"],
      better: "down",
      formula: "30–59 balance this month ÷ 1–29 balance last month.",
      value: (q) => {
        const now = snap(q);
        const prev = snap({
          ...q,
          w: { start: q.w.end - 1, end: q.w.end - 1 },
        });
        return now && prev ? ratio(now.b30_59, prev.b1_29) : null;
      },
    },
    {
      id: "provision",
      name: "Provision (month-end)",
      aliases: "loan loss provision, reserves",
      unit: "eur",
      kind: "stock",
      view: "portfolio",
      dims: ["market", "product"],
      better: null,
      formula: "Provision at month-end, in EUR.",
      value: (q) => snap(q)?.provision ?? null,
    },
    {
      id: "cost_of_risk",
      name: "Cost of risk",
      aliases: "CoR, credit cost",
      unit: "pct",
      kind: "flow",
      view: "portfolio",
      dims: ["market", "product"],
      better: "down",
      formula: "Σ provision ÷ months × 12 ÷ average month-end outstanding.",
      value: (q) => {
        const xs = monthsOf(q.w).map((i) =>
          snap({ ...q, w: { start: i, end: i } }),
        );
        const ok = xs.filter((s): s is Snapshot => s !== null);
        if (!ok.length) return null;
        return ratio(
          (ok.reduce((a, s) => a + s.provision, 0) / ok.length) * 12,
          ok.reduce((a, s) => a + s.outstanding, 0) / ok.length,
        );
      },
    },
    {
      id: "written_off",
      name: "Written off",
      aliases: "write-offs, списания",
      unit: "eur",
      kind: "flow",
      view: "portfolio",
      dims: ["market", "product"],
      better: "down",
      derived: true,
      formula: "Σ balance written off over the window's months, in EUR.",
      value: (q) =>
        sumOf(
          monthsOf(q.w).map(
            (i) => snap({ ...q, w: { start: i, end: i } })?.writtenOff ?? null,
          ),
        ),
    },
    {
      id: "early_default_6m",
      name: "Early default (90+ within 6 months)",
      aliases: "vintage bad rate, FPD",
      unit: "pct",
      kind: "stock",
      view: "portfolio",
      dims: ["market"],
      better: "down",
      formula:
        "Loans first 90+ DPD within 6 months on book ÷ loans disbursed; vintage = 6 months before the window's last month.",
      value: (q) => m.vintageBad6(q.w.end - 6, q.market),
    },
    // ---- revenue ----
    {
      id: "revenue",
      name: "Revenue",
      aliases: "total revenue, income, выручка",
      unit: "eur",
      kind: "flow",
      view: "revenue",
      dims: ["market", "product", "stream"],
      better: "up",
      formula:
        "Σ local revenue ÷ the month's actual rate; interest, fees, interchange and subscriptions.",
      value: (q) => revenue(q),
      budget: (q) => {
        if (q.stream === "INTEREST" || q.stream === "FEE") return null; // the Budget carries them together per loan product
        const products = q.product
          ? [q.product]
          : q.stream === "INTERCHANGE"
            ? ["CARD"]
            : q.stream === "SUBSCRIPTION"
              ? [...PAYING]
              : undefined;
        return cube.budget(q.w, q.market, "REVENUE_LOCAL", products);
      },
    },
    {
      id: "revenue_attainment",
      name: "Revenue vs Budget",
      aliases: "attainment, plan completion, выполнение плана",
      unit: "pct",
      kind: "flow",
      view: "revenue",
      dims: ["market"],
      better: "up",
      formula:
        "Revenue ÷ Budget revenue; ≥ 100% good, 95–99.9% watch, below off track.",
      value: (q) => {
        const b = cube.budget(q.w, q.market, "REVENUE_LOCAL");
        return b ? revenue(q) / b : null;
      },
    },
    {
      id: "revenue_lending",
      name: "Lending revenue",
      aliases: "interest and fees, loan revenue",
      unit: "eur",
      kind: "flow",
      view: "revenue",
      dims: ["market", "product"],
      better: "up",
      formula:
        "Interest income + fees (origination and late). Budget = revenue Budget of the loan products.",
      value: (q) => interestFees(q),
      budget: (q) =>
        cube.budget(
          q.w,
          q.market,
          "REVENUE_LOCAL",
          q.product ? [q.product] : LOAN_PRODUCTS,
        ),
    },
    {
      id: "revenue_per_loan",
      name: "Lending revenue per loan",
      aliases: "revenue per loan",
      unit: "eur0",
      kind: "flow",
      view: "revenue",
      dims: ["market", "product"],
      better: "up",
      derived: true,
      formula:
        "(Interest + fees) ÷ loans disbursed in the window (revenue also comes from loans of earlier months).",
      value: (q) =>
        ratio(
          interestFees(q),
          cube.loans(q.w, q.market, { product: q.product }).loans,
        ),
    },
    {
      id: "lending_yield",
      name: "Lending yield",
      aliases: "portfolio yield",
      unit: "pct",
      kind: "flow",
      view: "revenue",
      dims: ["market", "product"],
      better: "up",
      derived: true,
      formula:
        "(Interest + fees) ÷ months × 12 ÷ average month-end outstanding.",
      value: (q) => {
        const o = avgOutstanding(q);
        const n = monthsOf(q.w).length;
        return o ? ((interestFees(q) / n) * 12) / o : null;
      },
    },
    {
      id: "mrr",
      name: "MRR",
      aliases: "monthly recurring revenue",
      unit: "eur",
      kind: "stock",
      view: "revenue",
      dims: ["market", "tier"],
      better: "up",
      formula:
        "Paying subscribers (Plus + Pro, or the tier) at month-end × monthly price, in EUR.",
      value: (q) => subsAt(q.w.end, q)?.mrr ?? null,
    },
    {
      id: "subscribers",
      name: "Paying subscribers",
      aliases: "subscribers, paying accounts, подписчики",
      unit: "count",
      kind: "stock",
      view: "revenue",
      dims: ["market", "tier"],
      better: "up",
      formula: "Plus + Pro subscribers (or the tier) at month-end.",
      value: (q) => subsAt(q.w.end, q)?.end ?? null,
    },
    {
      id: "subscribers_new",
      name: "New subscribers",
      aliases: "subscription sign-ups",
      unit: "count",
      kind: "flow",
      view: "revenue",
      dims: ["market", "tier"],
      better: "up",
      formula: "Subscribers who started a paid tier in the window.",
      value: (q) => sumOf(subsOver(q).map((s) => s?.added ?? null)),
    },
    {
      id: "subscribers_churned",
      name: "Churned subscribers",
      aliases: "cancellations",
      unit: "count",
      kind: "flow",
      view: "revenue",
      dims: ["market", "tier"],
      better: "down",
      formula: "Subscribers who left a paid tier in the window.",
      value: (q) => sumOf(subsOver(q).map((s) => s?.churned ?? null)),
    },
    {
      id: "subscriber_churn_rate",
      name: "Subscriber churn rate",
      aliases: "churn, отток",
      unit: "pct",
      kind: "flow",
      view: "revenue",
      dims: ["market", "tier"],
      better: "down",
      formula:
        "Churned ÷ subscribers at the start of each month, pooled over the window's months.",
      value: (q) => {
        const xs = subsOver(q);
        if (xs.some((s) => !s)) return null;
        return ratio(
          xs.reduce((a, s) => a + (s?.churned ?? 0), 0),
          xs.reduce((a, s) => a + (s?.start ?? 0), 0),
        );
      },
    },
    {
      id: "mrr_per_subscriber",
      name: "MRR per subscriber",
      aliases: "ARPU, ARPPU",
      unit: "eur2",
      kind: "stock",
      view: "revenue",
      dims: ["market", "tier"],
      better: "up",
      derived: true,
      formula: "MRR ÷ paying subscribers at month-end.",
      value: (q) => {
        const s = subsAt(q.w.end, q);
        return s ? ratio(s.mrr, s.end) : null;
      },
    },
    // ---- cohorts and the sales force ----
    ...([30, 90, 180] as const).map((day): MetricDef => ({
      id: `second_loan_${day}d`,
      name: `Second loan within ${day} days`,
      aliases: "early repeat, cohort repeat",
      unit: "pct",
      kind: "flow",
      view: "clients",
      dims: ["market"],
      better: "up",
      formula: `Clients with a second loan ≤ ${day} days after the first ÷ clients whose first loan fell in the window's months; a month counts only once all its clients are ${day} days old.`,
      naNote: `No first-loan month of this window is ${day} days old yet.`,
      value: (q) => cohortAt(q, day),
    })),
    {
      id: "agent_attainment",
      name: "Agent quota attainment",
      aliases: "quota attainment, agents vs quota",
      unit: "pct",
      kind: "flow",
      view: "loans",
      dims: ["market"],
      better: "up",
      formula: "Loans by agents and partners ÷ their loan quota in the window.",
      value: (q) => {
        const market = new Map(
          cube.dims.agent.map((a) => [a.agent_code, a.market_code]),
        );
        let l = 0;
        let t = 0;
        for (const [agent, s] of cube.agents(q.w))
          if (q.market === "ALL" || market.get(agent) === q.market) {
            l += s.loans;
            t += s.target;
          }
        return ratio(l, t);
      },
    },
  ];

  const byId = new Map(defs.map((d) => [d.id, d]));

  /** The comparator window: the same months a year earlier, only when every month of it has data (as the cards). */
  function pyQuery(d: MetricDef, q: MetricQuery): MetricQuery | null {
    const w = shift(q.w, -12);
    const need = d.kind === "stock" ? { start: w.end, end: w.end } : w;
    return cube.available(need) ? { ...q, w } : null;
  }

  return { defs, byId, pyQuery };
}

export type MetricCatalogue = ReturnType<typeof createMetricCatalogue>;
