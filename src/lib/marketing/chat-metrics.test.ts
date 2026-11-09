import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import { csvTable } from "@/lib/csv";
import { withinTolerance } from "@/lib/marketing/control-totals";
import { createChatTools } from "./chat-tools";
import type { ChatTools } from "./chat-tools";
import type { MetricCatalogue, MetricQuery } from "./chat-metrics";
import type { ModelCode } from "./data/manifest";
import type { Dataset } from "./engine/data";
import { windowScope } from "./engine/scope";
import { DEFAULT_FILTERS } from "./engine/selection";
import type { Filters } from "./engine/selection";
import { win } from "./engine/windows";
import { controlTotals, loadDataset } from "./test-utils/marketing-data";

// The chat's answer key, level 1 (plan 2026-11-07 §2, §4): every row of checks/control_totals_usd.csv whose metric code
// the catalogue carries is read through the catalogue (as get_metric reads it) and must equal the CSV within verify.py's
// tolerance, for every scope and period key the CSV has. Then the golden rows of data/marketing/checks/chat-golden.csv:
// cuts the CSV lacks (market, tier, network, custom windows, pages, segments, steps, terms, cohorts), computed by SQL
// straight from marketing_demo (data/marketing/checks/golden.sql), not from the engine.

const DATA = fileURLToPath(
  new URL("../../../data/marketing/checks/", import.meta.url),
);

let ds: Dataset;
let cat: MetricCatalogue;
let tools: ChatTools;
beforeAll(async () => {
  ds = await loadDataset();
  tools = createChatTools(ds);
  cat = tools.metrics;
});

/** A filters object → the campaign list, statuses never applied (the control scopes and the golden keys name campaigns directly). */
const scopeOf = (f: Partial<Filters>) =>
  windowScope(ds, { ...DEFAULT_FILTERS, ...f, statuses: null });

/** Control scope ("ALL", "CH:X", "PF:IOS+ANDROID+CH:PAID_SOCIAL", "CP:KEY") → filters; null for a scope the catalogue has no cut for. */
function controlScope(name: string): Partial<Filters> | null {
  if (name === "ALL") return {};
  const f: Partial<Filters> = {};
  let facet = "";
  for (const tok of name.split("+")) {
    const m = /^(CH|PF|CP):(.+)$/.exec(tok);
    const [prefix, code] = m ? [m[1]!, m[2]!] : [facet, tok];
    facet = prefix;
    if (prefix === "CH") f.channels = [...(f.channels ?? []), code];
    else if (prefix === "PF") f.platforms = [...(f.platforms ?? []), code];
    else if (prefix === "CP") f.campaigns = [...(f.campaigns ?? []), code];
    else return null;
  }
  return f;
}

/** Period key → window (as test-utils/control-engine.ts enumerates them); C- keys carry a cohort month instead. */
function periodOf(
  key: string,
): { w: ReturnType<typeof win>; cohort?: number } | null {
  const { cal } = ds;
  const m = /^(R30|R7|MTD|QTD|M|C|D)-(\d{4}-\d{2}(?:-\d{2})?)$/.exec(key);
  if (!m) return null;
  const kind = m[1]!;
  const date = m[2]!;
  const asOf = cal.asOf;
  if (kind === "M" || kind === "C") {
    const [y, mo] = date.split("-").map(Number) as [number, number];
    const mi = (y - cal.firstYear) * 12 + (mo - 1);
    if (kind === "C") return { w: win(asOf - 29, asOf), cohort: mi };
    return { w: win(cal.monthStart(mi), cal.monthStart(mi + 1) - 1) };
  }
  const end = cal.ix(date);
  switch (kind) {
    case "R30":
      return { w: win(end - 29, end) };
    case "R7":
      return { w: win(end - 6, end) };
    case "MTD":
      return { w: win(cal.monthStart(cal.monthOf(end)), end) };
    case "QTD":
      return { w: win(cal.quarterStart(end), end) };
    default:
      return { w: win(end, end) };
  }
}

const MODEL_OF: Record<string, ModelCode> = {
  dda: "DDA",
  last_click: "LAST_CLICK",
  first_touch: "FIRST_TOUCH",
  platform: "PLATFORM",
};
const STEP_OF: Record<string, string> = {
  verified: "VERIFY_EMAIL",
  workspace: "CREATE_WORKSPACE",
  connected: "CONNECT_SOURCE",
  first_dashboard: "FIRST_DASHBOARD",
  invited: "INVITE",
};
/** Plain control codes → catalogue ids (same scale). */
const PLAIN: Record<string, string> = {
  spend: "spend",
  plan: "plan",
  pacing: "pacing",
  impressions: "impressions",
  clicks: "clicks",
  ctr: "ctr",
  cpm: "cpm",
  cpc: "cpc",
  frequency_7d: "frequency_7d",
  ctr_slope_7d: "ctr_trend_7d",
  sessions: "sessions",
  store_views: "store_views",
  installs: "installs",
  signups: "signups",
  activated: "activated",
  trials: "trials",
  click_signup_rate: "click_signup_rate",
  landing_signup_rate: "landing_signup_rate",
  install_signup_rate: "install_signup_rate",
  store_cvr: "store_cvr",
  activation_rate: "activation_rate",
  trial_rate: "trial_rate",
  trial_to_paid: "trial_to_paid",
  cpl: "cpl",
  cost_per_activated: "cost_per_activated",
  paid_cac: "paid_cac",
  blended_cac: "blended_cac",
  arpa: "arpa",
  roas_90d: "roas_90d",
  ltv: "ltv",
  ltv_cac: "ltv_cac",
  payback_months: "payback_months",
  churn_monthly: "churn_monthly",
  refund_rate: "refund_rate",
  d7_retention: "d7_retention",
  d30_retention: "d30_retention",
  attribution_gap: "attribution_gap",
  brand_share: "brand_share",
  install_quality_delta: "install_quality",
  roas_delta: "roas_delta",
};
/** C- (cohort) control codes → catalogue ids. */
const COHORT: Record<string, string> = {
  customers: "cohort_size",
  cohort_cac: "cohort_cac",
  payback_month: "payback_month",
};
/** TM: (term) control codes → catalogue ids. */
const TERM: Record<string, string> = { cpc: "term_cpc", cvr: "term_cvr" };

interface Mapped {
  id: string;
  q: Partial<MetricQuery>;
  /** the CSV value scaled to the catalogue's unit (act_median_hours → days) */
  scale?: number;
}

/** A control row's metric code → the catalogue read that must reproduce it, or null when the catalogue has no such metric. */
function mapCode(scope: string, period: string, code: string): Mapped | null {
  if (period.startsWith("C-")) {
    if (COHORT[code]) return { id: COHORT[code], q: {} };
    const pb = /^payback\.m(\d+)$/.exec(code);
    if (pb) return { id: "payback_share", q: { offset: Number(pb[1]) } };
    const rt = /^retention\.d(\d+)$/.exec(code);
    if (rt) return { id: "retention", q: { day: Number(rt[1]) } };
    return null;
  }
  if (scope.startsWith("TM:"))
    return TERM[code] ? { id: TERM[code], q: { term: scope.slice(3) } } : null;
  const dotted = /^(paid_customers|new_mrr|cpa)\.(\w+)$/.exec(code);
  if (dotted) {
    const base = dotted[1]!;
    const k = dotted[2]!;
    const model = MODEL_OF[k];
    if (!model) return null;
    return {
      id: base === "cpa" ? "paid_cac" : base,
      q: { model },
    };
  }
  const page =
    /^page\.(\w+)\.(sessions|store_views|cvr|bounce_rate|lcp_ms)$/.exec(code);
  if (page) {
    const key = page[1]!;
    const what = page[2]!;
    const id =
      what === "cvr"
        ? "page_cvr"
        : what === "bounce_rate"
          ? "page_bounce"
          : what === "lcp_ms"
            ? "page_lcp"
            : "page_visits";
    return { id, q: { page: key } };
  }
  const seg = /^segment\.(\w+)\.activation_rate$/.exec(code);
  if (seg) return { id: "segment_activation", q: { segment: seg[1] } };
  const step = /^step_(\w+)_pct$/.exec(code);
  if (step) {
    const sc = STEP_OF[step[1]!];
    return sc ? { id: "onboarding_step", q: { step: sc } } : null;
  }
  if (code === "act_median_hours")
    return { id: "time_to_activation", q: {}, scale: 1 / 24 };
  const id = PLAIN[code];
  return id ? { id, q: {} } : null;
}

describe("control totals through the catalogue (AT-01 for get_metric)", () => {
  it("reproduces every control row the catalogue covers, and covers most of them", () => {
    const rows = controlTotals().filter((r) => !r.scope.startsWith("CR:"));
    let covered = 0;
    const bad: string[] = [];
    const missing: string[] = [];
    const metricsSeen = new Set<string>();
    for (const r of rows) {
      const m = mapCode(r.scope, r.periodKey, r.metric);
      if (!m) continue;
      const p = periodOf(r.periodKey);
      if (!p) continue;
      const f = r.scope.startsWith("TM:") ? {} : controlScope(r.scope);
      if (f === null) continue;
      const d = cat.byId.get(m.id);
      expect(d, m.id).toBeDefined();
      const q: MetricQuery = {
        w: p.w,
        scope: scopeOf(f),
        model: "DDA",
        cohort: p.cohort,
        ...m.q,
      };
      covered++;
      metricsSeen.add(m.id);
      const got = d!.value(q);
      const want = r.value * (m.scale ?? 1);
      if (got === null) {
        missing.push(`${r.scope} ${r.periodKey} ${r.metric}`);
        continue;
      }
      const tol = m.scale ? 1e-6 : undefined;
      const ok =
        tol === undefined
          ? withinTolerance(r.metric, want, got)
          : Math.abs(got - want) <= tol;
      if (!ok)
        bad.push(`${r.scope} ${r.periodKey} ${r.metric}: ${got} vs ${want}`);
    }
    expect({
      bad: bad.length,
      missing: missing.length,
      sample: [...bad.slice(0, 10), ...missing.slice(0, 10)],
    }).toEqual({ bad: 0, missing: 0, sample: [] });
    // the catalogue covers the metric rows (flags, verdicts, targets, alerts, story rows and shares are not metrics)
    expect(covered).toBeGreaterThan(14_000);
    expect(metricsSeen.size).toBeGreaterThanOrEqual(50);
  });
});

/** chat-golden.csv: key "metric|from|to|k=v;k=v" (lists comma-separated), expected (empty = n/a), question. */
const GOLDEN = [
  ...csvTable(
    readFileSync(`${DATA}chat-golden.csv`, "utf8"),
    ["key", "expected", "question"],
    "chat-golden.csv",
  ),
].map(([key = "", expected = ""]) => ({ key, expected }));

/** A golden key → the catalogue query (the same resolution get_metric performs from its arguments). */
export function goldenQuery(
  ds: Dataset,
  key: string,
): { id: string; q: MetricQuery } {
  const [id = "", from = "", to = "", filters = ""] = key.split("|");
  const kv = new Map(
    filters
      .split(";")
      .filter(Boolean)
      .map((x) => x.split("=") as [string, string]),
  );
  const list = (k: string) => kv.get(k)?.split(",");
  const f: Partial<Filters> = {
    channels: list("channels") ?? [],
    platforms: list("platforms") ?? [],
    networks: list("networks") ?? [],
    campaigns: list("campaigns") ?? [],
    market: kv.get("market") ?? null,
    tier: kv.get("tier") ?? null,
  };
  const cohort = kv.get("cohort");
  const [cy, cm] = cohort
    ? (cohort.split("-").map(Number) as [number, number])
    : [0, 0];
  return {
    id,
    q: {
      w: win(ds.cal.ix(from), ds.cal.ix(to)),
      scope: windowScope(ds, { ...DEFAULT_FILTERS, ...f, statuses: null }),
      model: (kv.get("model") as ModelCode | undefined) ?? "DDA",
      page: kv.get("page"),
      segment: kv.get("segment"),
      step: kv.get("step"),
      term: kv.get("term"),
      cohort: cohort ? (cy - ds.cal.firstYear) * 12 + (cm - 1) : undefined,
      day: kv.has("day") ? Number(kv.get("day")) : undefined,
      offset: kv.has("offset") ? Number(kv.get("offset")) : undefined,
    },
  };
}

describe("golden rows (SQL over marketing_demo, data/marketing/checks/golden.sql)", () => {
  it("has rows", () => expect(GOLDEN.length).toBeGreaterThan(40));

  it.each(GOLDEN)("$key", ({ key, expected }) => {
    const { id, q } = goldenQuery(ds, key);
    const d = cat.byId.get(id);
    expect(d, id).toBeDefined();
    const got = d!.value(q);
    if (expected === "") return expect(got).toBeNull();
    const want = Number(expected);
    expect(got).not.toBeNull();
    expect(Math.abs(got! - want)).toBeLessThanOrEqual(
      Math.max(1e-6, Math.abs(want) * 1e-9),
    );
  });
});

describe("the catalogue", () => {
  it("has unique ids, a formula and at least one cut for every metric", () => {
    expect(new Set(cat.defs.map((d) => d.id)).size).toBe(cat.defs.length);
    for (const d of cat.defs) {
      expect(d.formula.length, d.id).toBeGreaterThan(5);
      expect(d.dims.length, d.id).toBeGreaterThan(0);
    }
  });

  it("returns a number or null for every metric on the default window", () => {
    const w = win(ds.cal.asOf - 29, ds.cal.asOf);
    const q: MetricQuery = {
      w,
      scope: scopeOf({}),
      model: "DDA",
      page: "LP_PRICING",
      segment: "IOS_18",
      step: "INVITE",
      term: "SOC_META_LAL2-T1",
    };
    for (const d of cat.defs) {
      const v = d.value(q);
      expect(v === null || Number.isFinite(v), d.id).toBe(true);
    }
  });
});

describe("get_metric", () => {
  it("answers three metrics with last year, the plan and the formula", () => {
    const r = tools.run(
      "get_metric",
      { metrics: ["spend", "paid_cac", "roas_90d"] },
      tools.defaults,
    );
    expect(r.ok).toBe(true);
    expect(r.text).toMatch(/^Oct 5 – Nov 3/);
    expect(r.text).toMatch(
      /Spend: \$[\d.]+k · LY \$[\d.]+k \([^)]+\) · Plan \$[\d.]+k \(pacing \d+%\)/,
    );
    expect(r.text).toMatch(/CAC: \$\d+ · LY \$\d+ \(/);
    expect(r.text).toMatch(/ROAS 90 d: [\d.]+× · LY [\d.]+× \(/);
    expect(r.text).toContain("Formula: Spend ÷ paid customers");
  });

  it("breaks a metric down by channel and links to the Channels view", () => {
    const r = tools.run(
      "get_metric",
      { metrics: ["paid_customers"], by: "channel" },
      tools.defaults,
    );
    expect(r.ok).toBe(true);
    for (const c of ds.m.channels)
      expect(r.text).toContain(`  ${c.channel_name}: `);
    expect(tools.selectionFrom(r.link ?? "").view).toBe("channels");
  });

  it("lists every page when a page metric is asked without a page, and marks a derived metric", () => {
    const r = tools.run(
      "get_metric",
      { metrics: ["page_cvr", "arpa"] },
      tools.defaults,
    );
    expect(r.ok).toBe(true);
    expect(r.text).toContain("Page conversion by page:");
    for (const p of ds.m.pages) expect(r.text).toContain(`  ${p.page_name}: `);
    expect(r.text).toContain("ARPA [derived: not on a card]");
  });

  it("says when a metric does not take a cut instead of answering it uncut", () => {
    const r = tools.run(
      "get_metric",
      { metrics: ["install_quality"], channels: ["PAID_SEARCH"] },
      tools.defaults,
    );
    expect(r.ok).toBe(true);
    expect(r.text).toContain("cannot be cut by channel");
  });

  it("rejects an unknown metric, campaign, cohort or day with a reason", () => {
    const ctx = tools.defaults;
    expect(tools.run("get_metric", { metrics: ["nps"] }, ctx).text).toContain(
      'Unknown metric "nps"',
    );
    expect(
      tools.run("get_metric", { metrics: ["spend"], campaigns: ["NOPE"] }, ctx)
        .ok,
    ).toBe(false);
    expect(
      tools.run(
        "get_metric",
        { metrics: ["retention"], cohort: "2031-01" },
        ctx,
      ).ok,
    ).toBe(false);
    expect(
      tools.run("get_metric", { metrics: ["retention"], day: 45 }, ctx).ok,
    ).toBe(false);
    expect(
      tools.run("get_metric", { metrics: ["spend"], to: "2031-01-01" }, ctx).ok,
    ).toBe(false);
  });

  it("lists every catalogue id in the system prompt", () => {
    const prompt = tools.systemPrompt();
    for (const d of cat.defs) expect(prompt).toContain(`- ${d.id}: `);
  });
});
