import type { Manifest } from "../data/manifest";
import { periodSummary } from "./period";
import type { Selection } from "./types";
import type { ViewContext } from "./view-context";
import type { HowToReadVM, InfoValue } from "./view-types";

// "How to read", one per view (ADR-0012 §2.3; copy after the v4 reference HOWTO object, shortened to one line per
// item). Built from the selection (parity rules 6, 7, 13). The statement view keeps its own page top.

const LEGEND =
  'Status vs Budget only: grey on track (±1 % / ±0.3 pp), amber watch (to 3 % / 1 pp), red off track beyond, green ahead; "lower is better" inverts on Opex %. ⓘ on each card holds its definition and sources.';

const BODY: Readonly<
  Record<
    Exclude<Selection["view"], "statement">,
    readonly [string, readonly InfoValue[]]
  >
> = {
  kpi: [
    "Vitals",
    [
      {
        label: "Results",
        value:
          "Net revenue, Adj. EBITDA and Operating profit, then Gross margin % and Opex % revenue.",
      },
      {
        label: "Drivers & health",
        value:
          "Five cards whose content follows the company (L-10); FY outlook for every company.",
      },
      {
        label: "Card face",
        value:
          "Value, Δ vs Compare A and Compare B ($ and %, pp for ratios), “on plan” for a zero Δ, status chip vs Budget.",
      },
    ],
  ],
  analysis: [
    "Analysis",
    [
      {
        label: "Top",
        value:
          "Every line to operating profit ranked by |Δ|, prior-year Δ and of which FX. The funnel filters by region, channel, category and price tier, alone or combined.",
      },
      {
        label: "Bottom",
        value:
          "Net revenue bridge (drivers at constant currency → CC subtotal → FX → actual) and profit bridge (comparison Adj. EBITDA → actual → operating profit).",
      },
      {
        label: "Colours",
        value:
          "Bridges: increase green, decrease orange, totals company colour, subtotals dark, FX hatched; axes do not start at zero. Variance bars: right helps profit, left hurts, one scale.",
      },
    ],
  ],
  profitability: [
    "Profitability",
    [
      {
        label: "Top",
        value:
          "Table by region at constant currency (status dot on CM Δ only) and concentration bars (share of revenue, contribution and Adj. EBITDA; hover a segment for its region).",
      },
      {
        label: "Below",
        value:
          "Revenue and margin by month: net revenue as bars (left axis), contribution margin % as the line (right axis), quarters past 12 months. Next to it the mix of region × {line}. Scroll for them.",
      },
      {
        label: "Basis",
        value:
          "Constant currency by default when comparing; by region nothing is allocated (opex is booked by region, C-31).",
      },
    ],
  ],
};

export function howToRead(
  m: Manifest,
  sel: Selection,
  ctx: ViewContext,
): HowToReadVM {
  const view = sel.view === "statement" ? "kpi" : sel.view;
  const [title, lines] = BODY[view];
  const compare =
    [ctx.compareA?.name, ctx.compareB?.name].filter(Boolean).join(" and ") ||
    "Prior year";
  return {
    title: `How to read - ${title}`,
    lines: [
      {
        label: "Showing",
        value: `${periodSummary(m, sel)} - ${sel.currency} ${ctx.unitLabel} - vs ${compare}`,
      },
      ...lines.map((l) => ({
        ...l,
        value: l.value.replace(
          "{line}",
          ctx.entity === "S" ? "service line" : "category",
        ),
      })),
      { label: "Legend", value: LEGEND },
    ],
  };
}
