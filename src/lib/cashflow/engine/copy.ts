// Every user-facing string of the ACME Cash Flow report (CF-ARC-10). The ⓘ texts are verbatim from the accepted mock
// (`INFO` in mockup-v2-pops.js); How to read follows `howHtml()`.

export const TITLE = "ACME Cash Flow";

export type InfoId =
  | "close"
  | "net"
  | "cfo"
  | "fcf"
  | "conv"
  | "dso"
  | "pct"
  | "stmt"
  | "heat"
  | "ledger"
  | "diagram";

export interface Info {
  title: string;
  body: string;
  formula: string;
  source: string;
}

export const INFO: Record<InfoId, Info> = {
  close: {
    title: "Closing cash",
    body: "Bank accounts plus Undeposited Funds at the period end.",
    formula: "M02 = M01 + M03",
    source: "Spec M02",
  },
  net: {
    title: "Net change",
    body: "Closing less opening cash; equals operating + investing + financing.",
    formula: "M03 = M02 − M01",
    source: "Spec M03",
  },
  cfo: {
    title: "Operating cash flow",
    body: "Net income plus non-cash adjustments and working-capital changes; line of credit in financing (S01).",
    formula: "M06 = M04 + Σ M05 (operating)",
    source: "Spec M06, overrides on",
  },
  fcf: {
    title: "Free cash flow",
    body: "Operating cash flow less fixed-asset purchases, plus asset-sale proceeds.",
    formula: "M15 = M06 + purchases + proceeds",
    source: "Spec M15",
  },
  conv: {
    title: "Cash conversion",
    body: "How much of net income arrived as cash. n/m when net income is zero or a loss.",
    formula: "M16 = M06 ÷ M04",
    source: "Spec M16",
  },
  dso: {
    title: "DSO · days",
    body: "Days of revenue sitting in receivables at the period end.",
    formula: "A/R closing ÷ revenue × days in period",
    source: "fact_account_balance (A/R), Income accounts",
  },
  pct: {
    title: "% of net income",
    body: "Each row as a share of net income for the period; net income = 100 %. Sign kept: (12%) is a cash outflow. n/m on every row when net income is zero or a loss. Opening and closing cash have none.",
    formula: "row ÷ net income × 100",
    source: "M04 (net income)",
  },
  stmt: {
    title: "Statement",
    body: "Indirect method in the order of the classic statement: opening cash, three activities, net change, closing cash. One row per balance-sheet account, as QBO shows them. Rows with no movement in the period are hidden.",
    formula: "Bar = absolute amount of the row on one shared axis",
    source: "Overrides on: M06 / M07 / M08",
  },
  heat: {
    title: "Activities",
    body: "One row per direct-method line, one column per calendar date. Cells: each block holds 20 % of the days with cash moved (in + out, absolute), ranked within this activity and period; orange = the top 20 %; hover a legend swatch for its block's bounds. Right column: each row's net total on the same five colours, blocks by quintile of this activity's row totals (few rows: ties go to the higher block). Sort toggles above the names and the totals reorder whole rows. Internal transfers excluded.",
    formula: "Row total = DIRECT_LINE (overrides on)",
    source: "fact_cash_posting.direct_line_code",
  },
  ledger: {
    title: "Transactions",
    body: "Every cash movement behind the row or day, one line per transaction and counterparty. A payment that settles an invoice shows the invoice number as memo.",
    formula: "Total = heatmap row or cell",
    source: "fact_cash_posting × fact_txn",
  },
  diagram: {
    title: "Diagram",
    body: "Management pop-up: net change in cash split into the three activities, each with its KPI groups. Click a group to expand it; click an activity to close the pop-up and open its activities (Esc returns).",
    formula: "Net change = Operating + Investing + Financing",
    source: "M03, M06–M08, M15–M17",
  },
};

export const STEPS = ["Statement", "Activities", "Transactions"] as const;

export const KPI_TITLES = {
  close: "Closing cash",
  net: "Net change",
  cfo: "Operating cash flow",
  fcf: "Free cash flow",
  conv: "Cash conversion",
  dso: "DSO · days",
} as const;

export const S01_TIP = {
  title: "Override S01",
  body: "Line of credit is typed Other Current Liability in QBO (operating); the mapping override moves it to financing. Net change does not move.",
};

export const CLEARED_TITLE = {
  R: "Reconciled",
  C: "Cleared",
  U: "Uncleared",
  N: "Not applicable (Undeposited Funds)",
} as const;

export const TEXT = {
  statementCard: "Statement of cash flows",
  legendLine: "Line amount, absolute",
  legendBalance: "Balance",
  pctHeader: "% of NI",
  noPrior: "no prior period",
  nm: "n/m",
  noCash: "No cash moved",
  loading: "Loading the report…",
  loadFailed: "The report could not load",
  recNoKey:
    "Control totals exist per month and per year. Pick a month, a year or YTD.",
  recFooter: (key: string) =>
    `checks/control_totals_usd.csv · ${key} · M06–M08 with overrides on · DIRECT_LINE = overrides on`,
  /** How to read, after "…the orange [arrow] opens its activities." */
  howPathTail:
    "A heatmap row or day opens its transactions. Esc steps back. On Closing cash, the orange button shows the cash balance and the three activities. Two management pop-ups sit in the menu: Diagram (the period's cash KPIs as a tree) and Reconciliation (every figure tied to the control totals).",
} as const;

export const HOW_STEPS: [string, string][] = [
  ["Statement", "sections · bars · % of NI"],
  ["Activities", "days × lines"],
  ["Transactions", "ledger"],
];

export const HOW_KEYS: [string, string][] = [
  ["↑ ↓", "section rows · Enter expands"],
  ["← → ↑ ↓", "heatmap days and lines"],
  ["Enter", "open"],
  ["Esc", "back or close"],
];
