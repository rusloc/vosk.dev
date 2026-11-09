import type { ModelCode } from "./data/manifest";
import { cohort, cohortCustomers, cohortEnd } from "./engine/cohorts";
import { MODEL_KEY, RET_DAYS, sum } from "./engine/data";
import type { Dataset } from "./engine/data";
import {
  DASH,
  MINUS,
  money,
  num,
  pct,
  signed,
  times,
  usd,
} from "./engine/format";
import { ALL_CAMPAIGNS, installQuality, metrics } from "./engine/metrics";
import type { Metrics } from "./engine/metrics";
import { churnedByChannel, refundsByChannel } from "./engine/rank";
import { singleOf } from "./engine/scope";
import { lastYear, previous } from "./engine/windows";
import type { Win } from "./engine/windows";

// The ACME Marketing metric catalogue for the report chat (2026-11-08, plan .log/report/2026-11-07-ai-chat-metrics-plan.md
// §4, on the Mirelo recipe src/lib/mirelo/chat-metrics.ts): every figure the chat may name, with its formula, the cuts
// it takes and how it reads on the engine (metrics.ts, cohorts.ts, rank.ts: the same functions the cards use). The
// chat's `get_metric` tool computes and formats here, so the model quotes and never computes. `derived` = no card
// shows this figure; the answer says so. Comparator: the same dates last year (as the vitals), and the plan for spend.
// Answer key: data/marketing/checks/chat-golden.csv (chat-metrics.test.ts).

/** Cuts: the scope dimensions (a campaign list) and the member dimensions a metric is defined per member of. */
export type ScopeDim =
  "channel" | "platform" | "network" | "campaign" | "market" | "tier";
export type MemberDim = "page" | "segment" | "step" | "term";
export type Dim = ScopeDim | MemberDim;
export const SCOPE_DIMS: readonly ScopeDim[] = [
  "channel",
  "platform",
  "network",
  "campaign",
  "market",
  "tier",
];
export const MEMBER_DIMS: readonly MemberDim[] = [
  "page",
  "segment",
  "step",
  "term",
];

type Unit =
  | "count"
  | "usd"
  | "usd2"
  | "money"
  | "pct"
  | "pct0"
  | "pct2"
  | "spct"
  | "times"
  | "ratio1"
  | "ratio2"
  | "days"
  | "months"
  | "monthn"
  | "ms";

/** One question's cut: the window, the campaigns the filters keep, the attribution model and the member / cohort arguments. */
export interface MetricQuery {
  w: Win;
  /** campaign indices after the filters (every campaign when none) */
  scope: readonly number[];
  model: ModelCode;
  page?: string;
  segment?: string;
  step?: string;
  term?: string;
  /** cohort month index (cohort metrics); default the latest month with customers up to the window's end month */
  cohort?: number;
  /** retention day N (default 30) and payback offset (default 3) */
  day?: number;
  offset?: number;
}

export interface MetricDef {
  id: string;
  name: string;
  aliases: string;
  unit: Unit;
  formula: string;
  derived?: true;
  /** Cuts this metric takes: the scope dims it can be filtered or broken down by, plus at most one member dim. */
  dims: readonly Dim[];
  /** "up" = higher is better, "down" = lower is better, null = no side. */
  better: "up" | "down" | null;
  /** false = no "same dates last year" comparator (cohort and trailing-month metrics have their own anchor) */
  ly: boolean;
  /** the plan comparator (spend only) */
  plan?: true;
  value(q: MetricQuery): number | null;
  naNote?: string;
}

const FORMAT: Record<Unit, (v: number) => string> = {
  count: (v) => num(v),
  usd: (v) => usd(v),
  usd2: (v) => usd(v, 2),
  money: (v) => money(v),
  pct: (v) => pct(v),
  pct0: (v) => pct(v, 0),
  pct2: (v) => pct(v, 2),
  spct: (v) => `${signed(v * 100, 0)}%`,
  times: (v) => times(v),
  ratio1: (v) => num(v, 1),
  ratio2: (v) => num(v, 2),
  days: (v) => `${num(v, 1)} d`,
  months: (v) => num(v, 1),
  monthn: (v) => `month ${num(v)}`,
  ms: (v) => `${num(v)} ms`,
};

export const formatValue = (unit: Unit, v: number | null): string =>
  v === null || !Number.isFinite(v) ? DASH : FORMAT[unit](v);

/** The change shown beside a comparator: points for rates, a signed amount for scales, a signed % for amounts and counts. */
export function formatDelta(unit: Unit, v: number, cmp: number): string {
  const d = v - cmp;
  switch (unit) {
    case "pct":
    case "pct0":
    case "pct2":
    case "spct":
      return `${signed(d * 100, 1)} pt`;
    case "days":
      return `${signed(d, 1)} d`;
    case "months":
    case "monthn":
      return `${signed(d, 1)} months`;
    case "times":
    case "ratio1":
    case "ratio2":
      return signed(d, 2);
    case "ms":
      return `${signed(d, 0)} ms`;
    default: {
      const rel = cmp !== 0 ? `${signed((v / cmp - 1) * 100, 1)}%` : null;
      const abs =
        unit === "count"
          ? signed(d, 0)
          : `${d < 0 ? MINUS : "+"}${FORMAT[unit](Math.abs(d)).replace(/^\$/, "$")}`;
      return rel ? `${abs}, ${rel}` : abs;
    }
  }
}

const ALL_DIMS: readonly Dim[] = SCOPE_DIMS;
const ratio = (n: number | undefined, d: number | undefined): number | null =>
  n !== undefined && d !== undefined && d > 0 ? n / d : null;
const orNull = (v: number | undefined): number | null =>
  v === undefined || Number.isNaN(v) ? null : v;

/** step_code → the metrics() key of its completion share (SIGNUP is the base, 100 %). */
const STEP_KEY: Record<string, string | null> = {
  SIGNUP: null,
  VERIFY_EMAIL: "step_verified_pct",
  CREATE_WORKSPACE: "step_workspace_pct",
  CONNECT_SOURCE: "step_connected_pct",
  FIRST_DASHBOARD: "step_first_dashboard_pct",
  INVITE: "step_invited_pct",
};

export function createMetricCatalogue(ds: Dataset) {
  const { cal } = ds;
  const all = ALL_CAMPAIGNS(ds);

  // Window metrics of a scope, cached per (scope, window, model): a breakdown asks for many cuts of one window.
  const cache = new Map<string, Metrics>();
  const r = (q: MetricQuery): Metrics => {
    const key = `${q.scope.join(",")}|${q.w.a}|${q.w.b}|${q.model}`;
    let m = cache.get(key);
    if (!m) {
      if (cache.size > 500) cache.clear();
      m = metrics(ds, q.scope, q.w.a, q.w.b, {
        single: singleOf(q.scope),
        model: q.model,
      });
      cache.set(key, m);
    }
    return m;
  };
  const paid = (q: MetricQuery) => r(q)[`paid_customers.${MODEL_KEY[q.model]}`];
  const mrr = (q: MetricQuery) => r(q)[`new_mrr.${MODEL_KEY[q.model]}`];
  const rich = (q: MetricQuery, key: string) => orNull(r(q)[key]);

  const pageIx = (code: string | undefined) =>
    ds.m.pages.findIndex((p) => p.page_key === code);
  const segIx = (code: string | undefined) =>
    ds.m.segments.findIndex((x) => x.segment_code === code);
  const termIx = (code: string | undefined) =>
    ds.m.terms.findIndex((t) => t.term_key === code);
  const pageMetric = (q: MetricQuery, key: string): number | null => {
    const p = ds.m.pages[pageIx(q.page)];
    return p ? rich(q, `page.${p.page_key}.${key}`) : null;
  };
  const segMetric = (q: MetricQuery, key: string): number | null => {
    const sg = ds.m.segments[segIx(q.segment)];
    return sg ? rich(q, `segment.${sg.segment_code}.${key}`) : null;
  };
  /** One term's window sums (P5): its campaign must be in the scope. */
  const term = (q: MetricQuery) => {
    const ti = termIx(q.term);
    const T = ds.terms;
    const t = ds.m.terms[ti];
    if (!T || !t) return null;
    const c = ds.campIndex.get(t.campaign_key) ?? -1;
    if (!q.scope.includes(c)) return null;
    const col = (k: keyof typeof T.t) => sum(T.t[k], ds.ND, [ti], q.w.a, q.w.b);
    return {
      clicks: col("clicks"),
      spend: col("spend_usd"),
      signups: col("signups"),
      impressions: col("impressions"),
    };
  };

  /** The cohort month of a question: the argument, else the latest month up to the window's end month with customers in the scope. */
  function cohortMonth(q: MetricQuery): number | null {
    if (q.cohort !== undefined) return q.cohort;
    for (let m = cohortEnd(ds, q.w.b); m >= 0; m--)
      if ((cohortCustomers(ds, q.scope, m) ?? 0) > 0) return m;
    return null;
  }
  const co = (q: MetricQuery) => {
    const m = cohortMonth(q);
    return m === null ? undefined : cohort(ds, q.scope, m);
  };
  const perChannelSum = (xs: (number | undefined)[]) => {
    const ok = xs.filter((x): x is number => x !== undefined);
    return ok.length ? ok.reduce((a, x) => a + x, 0) : null;
  };

  const COHORT_NOTE =
    "Cohort metrics take an acquisition month (cohort); the default is the latest month with customers.";

  const defs: MetricDef[] = [
    // ---- delivery ----
    {
      id: "spend",
      name: "Spend",
      aliases: "media spend, ad spend, расходы",
      unit: "money",
      formula:
        "Σ paid media spend of the window (agency fee and team cost excluded).",
      dims: ALL_DIMS,
      better: "down",
      ly: true,
      plan: true,
      value: (q) => r(q).spend,
    },
    {
      id: "plan",
      name: "Planned spend",
      aliases: "budget, media plan, бюджет",
      unit: "money",
      formula:
        "Σ daily plan of the window: each campaign's monthly budget ÷ the days of that month.",
      dims: ALL_DIMS,
      better: null,
      ly: false,
      value: (q) => r(q).plan,
    },
    {
      id: "pacing",
      name: "Pacing",
      aliases: "spend vs plan",
      unit: "pct0",
      formula: "Spend ÷ planned spend of the window.",
      dims: ALL_DIMS,
      better: null,
      ly: false,
      value: (q) => orNull(r(q).pacing),
    },
    {
      id: "spend_share",
      name: "Spend share",
      aliases: "share of spend",
      unit: "pct",
      formula: "Spend of the cut ÷ spend of every campaign in the window.",
      dims: ALL_DIMS,
      better: null,
      ly: false,
      value: (q) => ratio(r(q).spend, r({ ...q, scope: all }).spend),
    },
    {
      id: "impressions",
      name: "Impressions",
      aliases: "показы",
      unit: "count",
      formula: "Σ impressions.",
      dims: ALL_DIMS,
      better: "up",
      ly: true,
      value: (q) => r(q).impressions,
    },
    {
      id: "clicks",
      name: "Clicks",
      aliases: "клики",
      unit: "count",
      formula: "Σ clicks.",
      dims: ALL_DIMS,
      better: "up",
      ly: true,
      value: (q) => r(q).clicks,
    },
    {
      id: "ctr",
      name: "CTR",
      aliases: "click-through rate",
      unit: "pct2",
      formula: "Clicks ÷ impressions.",
      dims: ALL_DIMS,
      better: "up",
      ly: true,
      value: (q) => orNull(r(q).ctr),
    },
    {
      id: "cpm",
      name: "CPM",
      aliases: "cost per mille",
      unit: "usd2",
      formula: "Spend ÷ impressions × 1,000.",
      dims: ALL_DIMS,
      better: "down",
      ly: true,
      value: (q) => orNull(r(q).cpm),
    },
    {
      id: "cpc",
      name: "CPC",
      aliases: "cost per click",
      unit: "usd2",
      formula: "Spend ÷ clicks.",
      dims: ALL_DIMS,
      better: "down",
      ly: true,
      value: (q) => orNull(r(q).cpc),
    },
    {
      id: "frequency_7d",
      name: "Frequency, last 7 days",
      aliases: "ad frequency",
      unit: "ratio1",
      formula:
        "Impressions of the window's last 7 days ÷ 7-day reach on its last day; needs a window of 14 days or more.",
      dims: ALL_DIMS,
      better: "down",
      ly: false,
      naNote: "Needs a window of at least 14 days.",
      value: (q) => rich(q, "frequency_7d"),
    },
    {
      id: "ctr_trend_7d",
      name: "CTR 7-day trend",
      aliases: "CTR slope, fatigue signal",
      unit: "spct",
      formula:
        "CTR of the window's last 7 days ÷ CTR of the 7 days before − 1; needs a window of 14 days or more.",
      dims: ALL_DIMS,
      better: "up",
      ly: false,
      naNote: "Needs a window of at least 14 days.",
      value: (q) => rich(q, "ctr_slope_7d"),
    },
    // ---- funnel ----
    {
      id: "sessions",
      name: "Web sessions",
      aliases: "web visits, сессии",
      unit: "count",
      formula: "Σ web sessions from paid media.",
      dims: ALL_DIMS,
      better: "up",
      ly: true,
      value: (q) => r(q).sessions,
    },
    {
      id: "store_views",
      name: "Store views",
      aliases: "app store views",
      unit: "count",
      formula: "Σ App Store and Play Store page views.",
      dims: ALL_DIMS,
      better: "up",
      ly: true,
      value: (q) => r(q).store_views,
    },
    {
      id: "installs",
      name: "Installs",
      aliases: "app installs, установки",
      unit: "count",
      formula: "Σ installs.",
      dims: ALL_DIMS,
      better: "up",
      ly: true,
      value: (q) => r(q).installs,
    },
    {
      id: "signups",
      name: "New clients (sign-ups)",
      aliases: "registrations, sign-ups, регистрации",
      unit: "count",
      formula: "Σ sign-ups by sign-up day; never re-attributed.",
      dims: ALL_DIMS,
      better: "up",
      ly: true,
      value: (q) => r(q).signups,
    },
    {
      id: "activated",
      name: "Activated",
      aliases: "activations, активации",
      unit: "count",
      formula: "Σ sign-ups activated within 7 days, by sign-up day.",
      dims: ALL_DIMS,
      better: "up",
      ly: true,
      value: (q) => r(q).activated,
    },
    {
      id: "trials",
      name: "Trials",
      aliases: "trial starts",
      unit: "count",
      formula: "Σ trials started.",
      dims: ALL_DIMS,
      better: "up",
      ly: true,
      value: (q) => r(q).trials,
    },
    {
      id: "paid_customers",
      name: "Paid customers",
      aliases: "paying customers, conversions, платящие клиенты",
      unit: "count",
      formula: "Σ paid customers of the attribution model, by conversion day.",
      dims: ALL_DIMS,
      better: "up",
      ly: true,
      value: (q) => orNull(paid(q)),
    },
    {
      id: "conversion_paid",
      name: "Conversion into paid",
      aliases: "sign-up to paid rate, конверсия в оплату",
      unit: "pct",
      formula:
        "Paid customers ÷ sign-ups, both in the window (a period rate, not a cohort).",
      dims: ALL_DIMS,
      better: "up",
      ly: true,
      value: (q) => ratio(paid(q), r(q).signups),
    },
    {
      id: "click_signup_rate",
      name: "Click → sign-up",
      aliases: "click to sign-up",
      unit: "pct",
      formula: "Sign-ups ÷ clicks.",
      dims: ALL_DIMS,
      better: "up",
      ly: true,
      value: (q) => orNull(r(q).click_signup_rate),
    },
    {
      id: "landing_signup_rate",
      name: "Landing → sign-up",
      aliases: "landing page conversion",
      unit: "pct",
      formula: "Web sign-ups ÷ web sessions.",
      dims: ALL_DIMS,
      better: "up",
      ly: true,
      value: (q) => orNull(r(q).landing_signup_rate),
    },
    {
      id: "install_signup_rate",
      name: "Install → sign-up",
      aliases: "install to sign-up",
      unit: "pct",
      formula: "Mobile sign-ups ÷ installs.",
      dims: ALL_DIMS,
      better: "up",
      ly: true,
      value: (q) => orNull(r(q).install_signup_rate),
    },
    {
      id: "store_cvr",
      name: "Store view → install",
      aliases: "store conversion",
      unit: "pct",
      formula: "Installs ÷ store views.",
      dims: ALL_DIMS,
      better: "up",
      ly: true,
      value: (q) => orNull(r(q).store_cvr),
    },
    {
      id: "activation_rate",
      name: "Activation rate",
      aliases: "7-day activation",
      unit: "pct",
      formula: "Activated within 7 days ÷ sign-ups.",
      dims: ALL_DIMS,
      better: "up",
      ly: true,
      value: (q) => orNull(r(q).activation_rate),
    },
    {
      id: "time_to_activation",
      name: "Time to activation",
      aliases: "median days to first dashboard",
      unit: "days",
      formula:
        "Median of the seven activation-time bins, linear inside the median bin, ÷ 24 (days).",
      dims: ALL_DIMS,
      better: "down",
      ly: true,
      value: (q) => {
        const h = rich(q, "act_median_hours");
        return h === null ? null : h / 24;
      },
    },
    {
      id: "trial_rate",
      name: "Trial rate",
      aliases: "sign-up to trial",
      unit: "pct",
      formula: "Trials ÷ sign-ups.",
      dims: ALL_DIMS,
      better: "up",
      ly: true,
      value: (q) => orNull(r(q).trial_rate),
    },
    {
      id: "trial_to_paid",
      name: "Trial → paid",
      aliases: "trial conversion",
      unit: "pct",
      formula: "Paid customers ÷ trials.",
      dims: ALL_DIMS,
      better: "up",
      ly: true,
      value: (q) => orNull(r(q).trial_to_paid),
    },
    {
      id: "onboarding_step",
      name: "Onboarding step completion",
      aliases:
        "step completion (verify, workspace, connect, dashboard, invite)",
      unit: "pct0",
      formula: "Sign-ups reaching the step ÷ sign-ups (SIGNUP = 100 %).",
      dims: [...ALL_DIMS, "step"],
      better: "up",
      ly: true,
      value: (q) => {
        const st = ds.m.steps.find((x) => x.step_code === q.step);
        if (!st) return null;
        const key = STEP_KEY[st.step_code];
        if (key === undefined) return null;
        return key === null ? (r(q).signups > 0 ? 1 : null) : rich(q, key);
      },
    },
    // ---- cost and return ----
    {
      id: "cpl",
      name: "Cost per sign-up (CPL)",
      aliases: "cost per lead, cost per registration",
      unit: "usd",
      formula: "Spend ÷ sign-ups.",
      dims: ALL_DIMS,
      better: "down",
      ly: true,
      value: (q) => orNull(r(q).cpl),
    },
    {
      id: "cost_per_activated",
      name: "Cost per activated",
      aliases: "cost per activation",
      unit: "usd",
      formula: "Spend ÷ activated.",
      dims: ALL_DIMS,
      better: "down",
      ly: true,
      value: (q) => orNull(r(q).cost_per_activated),
    },
    {
      id: "paid_cac",
      name: "CAC",
      aliases: "CPA, cost per acquisition, стоимость привлечения",
      unit: "usd",
      formula:
        "Spend ÷ paid customers of the attribution model (no team cost).",
      dims: ALL_DIMS,
      better: "down",
      ly: true,
      value: (q) => orNull(r(q).paid_cac),
    },
    {
      id: "blended_cac",
      name: "Blended CAC",
      aliases: "CAC with team cost",
      unit: "usd",
      formula:
        "(Spend + paid-team cost allocated by spend share) ÷ paid customers.",
      dims: ALL_DIMS,
      better: "down",
      ly: true,
      value: (q) => orNull(r(q).blended_cac),
    },
    {
      id: "new_mrr",
      name: "New MRR",
      aliases: "new monthly recurring revenue",
      unit: "money",
      formula: "Σ new MRR of the attribution model's paid customers.",
      dims: ALL_DIMS,
      better: "up",
      ly: true,
      value: (q) => orNull(mrr(q)),
    },
    {
      id: "arpa",
      name: "ARPA",
      aliases: "revenue per account",
      unit: "usd",
      formula: "New MRR ÷ paid customers.",
      dims: ALL_DIMS,
      better: "up",
      ly: true,
      derived: true,
      value: (q) => orNull(r(q).arpa),
    },
    {
      id: "roas_90d",
      name: "ROAS 90 d",
      aliases: "return on ad spend, окупаемость",
      unit: "times",
      formula:
        "New MRR × R90 ÷ spend; R90 = first-3-month revenue ÷ month-1 revenue of the newest complete cohort (campaign → channel → all).",
      dims: ALL_DIMS,
      better: "up",
      ly: true,
      value: (q) => orNull(r(q).roas_90d),
    },
    {
      id: "ltv",
      name: "LTV",
      aliases: "lifetime value",
      unit: "usd",
      formula: "ARPA × gross margin ÷ monthly churn.",
      dims: ALL_DIMS,
      better: "up",
      ly: true,
      derived: true,
      value: (q) => orNull(r(q).ltv),
    },
    {
      id: "ltv_cac",
      name: "LTV:CAC",
      aliases: "LTV to CAC",
      unit: "ratio1",
      formula: "LTV ÷ blended CAC.",
      dims: ALL_DIMS,
      better: "up",
      ly: true,
      value: (q) => orNull(r(q).ltv_cac),
    },
    {
      id: "payback_months",
      name: "Payback months",
      aliases: "CAC payback",
      unit: "months",
      formula: "Blended CAC ÷ (ARPA × gross margin).",
      dims: ALL_DIMS,
      better: "down",
      ly: true,
      value: (q) => orNull(r(q).payback_months),
    },
    {
      id: "churn_monthly",
      name: "Monthly churn",
      aliases: "logo churn, отток",
      unit: "pct",
      formula:
        "Customers lost ÷ customers at month start, pooled over the trailing 3 complete months to the window's end.",
      dims: ALL_DIMS,
      better: "down",
      ly: false,
      value: (q) => orNull(r(q).churn_monthly),
    },
    {
      id: "refund_rate",
      name: "Refund rate",
      aliases: "refunds share",
      unit: "pct",
      formula:
        "Refunds ÷ customers acquired, 12 acquisition months to the window's end month.",
      dims: ALL_DIMS,
      better: "down",
      ly: false,
      value: (q) => orNull(r(q).refund_rate),
    },
    {
      id: "d7_retention",
      name: "D7 retention",
      aliases: "day-7 retention guardrail",
      unit: "pct0",
      formula:
        "Active on day 7 ÷ matured, latest cohort month with a reportable D30 cell at the window's end.",
      dims: ALL_DIMS,
      better: "up",
      ly: false,
      value: (q) => rich(q, "d7_retention"),
    },
    {
      id: "d30_retention",
      name: "D30 retention",
      aliases: "day-30 retention guardrail",
      unit: "pct0",
      formula:
        "Active on day 30 ÷ matured, latest cohort month with a reportable D30 cell at the window's end.",
      dims: ALL_DIMS,
      better: "up",
      ly: false,
      value: (q) => rich(q, "d30_retention"),
    },
    {
      id: "attribution_gap",
      name: "Attribution gap",
      aliases: "platform vs DDA over-reporting",
      unit: "spct",
      formula:
        "Platform-reported paid customers ÷ first-party (model) paid customers − 1.",
      dims: ALL_DIMS,
      better: "down",
      ly: true,
      value: (q) => orNull(r(q).attribution_gap),
    },
    {
      id: "brand_share",
      name: "Brand share of search spend",
      aliases: "brand vs non-brand search",
      unit: "pct0",
      formula:
        "Brand search spend ÷ paid search spend (paid search campaigns in the cut only).",
      dims: ALL_DIMS,
      better: "down",
      ly: true,
      naNote:
        "Only cuts that contain paid search campaigns have a brand share.",
      value: (q) => orNull(r(q).brand_share),
    },
    {
      id: "install_quality",
      name: "Install quality Δ",
      aliases: "install quality change",
      unit: "spct",
      formula:
        "Install → sign-up of the window's last 7 days − the previous period's, for one install campaign.",
      dims: ["campaign"],
      better: "up",
      ly: false,
      naNote: "Defined for one install campaign at a time.",
      value: (q) => {
        const c = singleOf(q.scope);
        if (c === null || ds.campaigns[c]?.objective_code !== "INSTALL")
          return null;
        return orNull(installQuality(ds, q.scope, q.w.a, q.w.b));
      },
    },
    {
      id: "roas_delta",
      name: "Δ ROAS 90 d vs the previous period",
      aliases: "ROAS change, top movers",
      unit: "ratio2",
      formula:
        "ROAS 90 d of the window − ROAS 90 d of the same number of days before it.",
      dims: ALL_DIMS,
      better: "up",
      ly: false,
      value: (q) => {
        const now = r(q).roas_90d;
        const before = r({ ...q, w: previous(q.w) }).roas_90d;
        return now === undefined || before === undefined ? null : now - before;
      },
    },
    {
      id: "churned_customers",
      name: "Churned customers",
      aliases: "customers lost",
      unit: "count",
      formula:
        "Customers lost in the trailing 3 complete months to the window's end (DDA cohorts).",
      dims: ALL_DIMS,
      better: "down",
      ly: false,
      value: (q) => perChannelSum(churnedByChannel(ds, q.scope, q.w.b)),
    },
    {
      id: "refunds",
      name: "Refunds",
      aliases: "refund count",
      unit: "count",
      formula:
        "Refunds of the 12 acquisition months to the window's end month (DDA cohorts).",
      dims: ALL_DIMS,
      better: "down",
      ly: false,
      value: (q) => perChannelSum(refundsByChannel(ds, q.scope, q.w.b)),
    },
    // ---- cohorts (an acquisition month) ----
    {
      id: "cohort_size",
      name: "Cohort size",
      aliases: "customers acquired in a month",
      unit: "count",
      formula: "Paid customers (DDA) acquired in the cohort month.",
      dims: ALL_DIMS,
      better: "up",
      ly: false,
      naNote: COHORT_NOTE,
      value: (q) => orNull(co(q)?.customers),
    },
    {
      id: "cohort_cac",
      name: "Cohort CAC",
      aliases: "acquisition cost of a cohort",
      unit: "usd",
      formula:
        "Spend of the acquisition month × (1 + team pool ÷ all spend of the month) ÷ cohort customers.",
      dims: ALL_DIMS,
      better: "down",
      ly: false,
      naNote: COHORT_NOTE,
      value: (q) => orNull(co(q)?.cac),
    },
    {
      id: "payback_month",
      name: "Payback month",
      aliases: "months to pay back a cohort",
      unit: "monthn",
      formula:
        "First month since acquisition where cumulative (revenue − refunds) × gross margin ≥ cohort cost.",
      dims: ALL_DIMS,
      better: "down",
      ly: false,
      naNote: `${COHORT_NOTE} Not paid back yet = n/a.`,
      value: (q) => orNull(co(q)?.paybackMonth),
    },
    {
      id: "payback_share",
      name: "Cumulative payback by month N",
      aliases: "share of CAC recovered by month N",
      unit: "pct0",
      formula:
        "Cumulative (revenue − refunds) × gross margin to month N (offset, default 3) ÷ cohort cost.",
      dims: ALL_DIMS,
      better: "up",
      ly: false,
      naNote: `${COHORT_NOTE} Month N must have a row.`,
      value: (q) => {
        const k = q.offset ?? 3;
        return orNull(co(q)?.payback.find((p) => p.offset === k)?.value);
      },
    },
    {
      id: "retention",
      name: "Retention day N",
      aliases: "cohort retention D1…D90, удержание",
      unit: "pct0",
      formula:
        "Active on day N (default 30) ÷ matured customers of the cohort month.",
      dims: ALL_DIMS,
      better: "up",
      ly: false,
      naNote: `${COHORT_NOTE} Days: ${RET_DAYS.join(", ")}; blank until reached.`,
      value: (q) => orNull(co(q)?.retention[q.day ?? 30]),
    },
    // ---- pages, segments, keywords ----
    {
      id: "page_visits",
      name: "Page visits",
      aliases: "landing sessions, store page views",
      unit: "count",
      formula: "Sessions of a landing page, or store views of a store page.",
      dims: [...ALL_DIMS, "page"],
      better: "up",
      ly: true,
      value: (q) => {
        const p = ds.m.pages[pageIx(q.page)];
        return p
          ? pageMetric(q, p.page_type === "WEB" ? "sessions" : "store_views")
          : null;
      },
    },
    {
      id: "page_cvr",
      name: "Page conversion",
      aliases: "landing page CVR, store CVR",
      unit: "pct",
      formula:
        "Sign-ups ÷ sessions of a landing page; installs ÷ store views of a store page.",
      dims: [...ALL_DIMS, "page"],
      better: "up",
      ly: true,
      value: (q) => pageMetric(q, "cvr"),
    },
    {
      id: "page_bounce",
      name: "Bounce rate",
      aliases: "bounces, отказы",
      unit: "pct",
      formula:
        "Bounced sessions ÷ sessions of a landing page (web pages only).",
      dims: [...ALL_DIMS, "page"],
      better: "down",
      ly: true,
      naNote: "Store pages have no bounce rate.",
      value: (q) => pageMetric(q, "bounce_rate"),
    },
    {
      id: "page_lcp",
      name: "LCP",
      aliases: "largest contentful paint",
      unit: "ms",
      formula:
        "Sessions-weighted p75 largest contentful paint of a landing page (web pages only).",
      dims: [...ALL_DIMS, "page"],
      better: "down",
      ly: true,
      naNote: "Store pages have no LCP.",
      value: (q) => pageMetric(q, "lcp_ms"),
    },
    {
      id: "segment_activation",
      name: "Activation rate by platform segment",
      aliases: "activation by OS",
      unit: "pct",
      formula: "Activated within 7 days ÷ sign-ups of a platform / OS segment.",
      dims: [...ALL_DIMS, "segment"],
      better: "up",
      ly: true,
      value: (q) => segMetric(q, "activation_rate"),
    },
    {
      id: "term_cpc",
      name: "Keyword / placement CPC",
      aliases: "keyword cost per click",
      unit: "usd2",
      formula: "Spend ÷ clicks of one keyword, placement or audience.",
      dims: ["campaign", "term"],
      better: "down",
      ly: true,
      value: (q) => {
        const t = term(q);
        return t ? ratio(t.spend, t.clicks) : null;
      },
    },
    {
      id: "term_cvr",
      name: "Keyword / placement CVR",
      aliases: "keyword conversion rate",
      unit: "pct",
      formula: "Sign-ups ÷ clicks of one keyword, placement or audience.",
      dims: ["campaign", "term"],
      better: "up",
      ly: true,
      value: (q) => {
        const t = term(q);
        return t ? ratio(t.signups, t.clicks) : null;
      },
    },
  ];

  const byId = new Map(defs.map((d) => [d.id, d]));

  /** The comparator window: the same calendar dates a year earlier, only when it starts inside the data (as the vitals). */
  function lyQuery(d: MetricDef, q: MetricQuery): MetricQuery | null {
    if (!d.ly) return null;
    const w = lastYear(cal, q.w);
    return w.a >= 0 ? { ...q, w } : null;
  }

  return { defs, byId, lyQuery };
}

export type MetricCatalogue = ReturnType<typeof createMetricCatalogue>;
