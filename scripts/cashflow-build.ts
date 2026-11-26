import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parquetReadObjects } from "hyparquet";
import { parquetWriteBuffer } from "hyparquet-writer";
import {
  FILES,
  manifestSchema,
  type AccountGroup,
  type FileKey,
  type Manifest,
  type Section,
} from "@/lib/cashflow/data/manifest";
import type { ColumnSpec } from "@/lib/cashflow/data/parquet-columns";

// Pre-aggregation build of the ACME Cash Flow report (handoff js-spec 02 § 2; model: mockup/build-mock-v2-data.py).
// Reads six tables of the generator pack (seed 42) and its control totals, writes data/cashflow/parquet (manifest + four
// Parquet files) and the control CSV fixture, after recomputing every control value from its own output (AT-01). Any
// failed assert: exit 1, nothing written. Run by the author, not by `next build`:
//
//     node --import tsx scripts/cashflow-build.ts --data <pack folder>      (or CF_DATA_DIR=<pack folder>)
//
// The pack folder holds parquet/ and checks/control_totals_usd.csv (.sync/data-gen/acme-cash-flow, generated with
// `generate.py --out <folder>`).

const OUT = resolve(__dirname, "../data/cashflow/parquet");
const FIXTURE = resolve(__dirname, "../data/cashflow/checks");
const BUDGET_BYTES = 150 * 1024; // CF-DAT-04
const TOL = 0.005;
const COMPANY = "ACME Advisory Services LLC"; // a build constant (CF-DAT-14)

const fail = (msg: string): never => {
  console.error(`FAIL ${msg}`);
  process.exit(1);
};

// ---------- input ----------

const argIx = process.argv.indexOf("--data");
const dataDir = argIx > 0 ? process.argv[argIx + 1] : process.env.CF_DATA_DIR;
if (!dataDir) fail("pass --data <pack folder> or set CF_DATA_DIR");
const PACK = resolve(dataDir as string);

type Row = Record<string, unknown>;

interface SourceManifest {
  engine_version: string;
  seed: number;
  preset: string;
  as_of: string;
  start_date: string;
  end_date: string;
  currency: string;
  tables: { table: string; rows: number; columns: Record<string, string> }[];
}
const src = JSON.parse(
  readFileSync(join(PACK, "parquet", "manifest.json"), "utf8"),
) as SourceManifest;
console.log(
  `source: engine ${src.engine_version}, seed ${src.seed}, preset ${src.preset}, ${src.currency}, ${src.start_date} … ${src.end_date}, as of ${src.as_of}`,
);
if (src.seed !== 42 || src.preset !== "typical" || src.currency !== "USD")
  fail("source manifest is not seed 42 / preset typical / USD (CF-DAT-02)");
if (src.start_date !== "2024-01-01" || src.end_date !== "2026-10-31")
  console.warn(
    "WARN span differs from 2024-01-01 … 2026-10-31; allowed only if every assert passes",
  );

const TYPE_CHECK: Record<string, (v: unknown) => boolean> = {
  int32: (v) => v === null || Number.isInteger(Number(v)),
  int64: (v) => v === null || Number.isInteger(Number(v)),
  string: (v) => v === null || typeof v === "string",
  bool: (v) => v === null || typeof v === "boolean",
  double: (v) => v === null || typeof v === "number",
  "date32[day]": (v) => v === null || v instanceof Date,
  "timestamp[ms]": (v) => v === null || v instanceof Date,
};

async function table(name: string): Promise<Row[]> {
  const spec = src.tables.find((t) => t.table === name);
  if (!spec) return fail(`${name}: not in the source manifest`);
  const b = readFileSync(join(PACK, "parquet", `${name}.parquet`));
  const file = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
  const rows = (await parquetReadObjects({ file })) as Row[];
  if (rows.length !== spec.rows)
    fail(`${name}: ${rows.length} rows, source manifest says ${spec.rows}`);
  for (const [col, type] of Object.entries(spec.columns)) {
    const ok = TYPE_CHECK[type];
    if (!ok) fail(`${name}.${col}: unknown source type ${type}`);
    for (const r of rows)
      if (!(col in r) || !ok!(r[col]))
        fail(`${name}.${col}: value ${String(r[col])} is not ${type}`);
  }
  return rows;
}

const num = (v: unknown) => (v === null || v === undefined ? 0 : Number(v));
const str = (v: unknown) => (v === null || v === undefined ? "" : String(v));
const iso = (v: unknown) => (v as Date).toISOString().slice(0, 10);

/** CF-DAT-05: USD → integer cents, exact to 1e-6, inside int32. */
function cents(x: number, where: string): number {
  const c = Math.round(x * 100);
  if (Math.abs(x * 100 - c) > 1e-6) fail(`${where}: ${x} is not whole cents`);
  if (Math.abs(c) > 2 ** 31 - 1) fail(`${where}: ${x} does not fit int32`);
  return c;
}
const int32 = (c: number, where: string) =>
  Math.abs(c) > 2 ** 31 - 1 ? fail(`${where}: ${c} does not fit int32`) : c;

async function main() {
  const [dimAccount, dimLine, dimCp, balances, postings, txns] =
    (await Promise.all(
      [
        "dim_account",
        "dim_cf_line",
        "dim_counterparty",
        "fact_account_balance",
        "fact_cash_posting",
        "fact_txn",
      ].map(table),
    )) as [Row[], Row[], Row[], Row[], Row[], Row[]];

  // ---------- months ----------

  const months: string[] = [];
  {
    let [y, m] = src.start_date.split("-").map(Number) as [number, number];
    const [ey, em] = src.end_date.split("-").map(Number) as [number, number];
    while (y < ey || (y === ey && m <= em)) {
      months.push(`${y}-${String(m).padStart(2, "0")}`);
      [y, m] = m === 12 ? [y + 1, 1] : [y, m + 1];
    }
  }
  const N = months.length;
  const monthIx = new Map(months.map((k, i) => [k, i]));

  // ---------- account roles by attribute (D-8, CF-DAT-07) ----------

  interface Account {
    id: number;
    name: string;
    fqn: string;
    parent: number | null;
    type: string;
    subtype: string;
    isPl: boolean;
    isCash: boolean;
    section: string;
    override: boolean;
    sort: number;
  }
  const accounts: Account[] = dimAccount.map((a) => ({
    id: num(a.account_id),
    name: str(a.account_name),
    fqn: str(a.fully_qualified_name),
    parent: a.parent_account_id === null ? null : num(a.parent_account_id),
    type: str(a.account_type),
    subtype: str(a.account_subtype),
    isPl: a.is_pl === true,
    isCash: a.is_cash === true,
    section: str(a.override_section) || str(a.default_section),
    override: str(a.override_section) !== "",
    sort: num(a.sort_order),
  }));
  const byId = new Map(accounts.map((a) => [a.id, a]));

  function role(name: string, pick: (a: Account) => boolean, expected: number) {
    const ids = accounts.filter(pick).map((a) => a.id);
    if (ids.length !== expected)
      fail(`role ${name}: ${ids.length} accounts, expected ${expected}`);
    return ids;
  }
  const cashIds = role("cash", (a) => a.isCash, 4);
  const plIds = accounts.filter((a) => a.isPl).map((a) => a.id);
  const revenueIds = accounts
    .filter((a) => a.type === "Income")
    .map((a) => a.id);
  const [arId] = role("A/R", (a) => a.type === "Accounts Receivable", 1);
  const [apId] = role("A/P", (a) => a.type === "Accounts Payable", 1);
  const [interestId] = role("interest", (a) => a.subtype === "InterestPaid", 1);
  const [depreciationId] = role(
    "depreciation",
    (a) => a.subtype === "Depreciation",
    1,
  );
  const locIds = role("line of credit", (a) => a.subtype === "LineOfCredit", 1);
  const ltlIds = role(
    "long-term debt",
    (a) => a.type === "Long Term Liability",
    2,
  );
  const debtIds = [...locIds, ...ltlIds];
  const spendIds = role(
    "spend",
    (a) =>
      (a.type === "Cost of Goods Sold" || a.type === "Expense") &&
      !["PayrollExpenses", "BadDebts", "InterestPaid"].includes(a.subtype),
    19,
  );

  // ---------- balances (debit positive), in cents ----------

  const bal = new Map<string, { open: number; net: number; close: number }>();
  for (const r of balances) {
    const k = `${num(r.account_id)}|${str(r.month_key)}`;
    bal.set(k, {
      open: cents(num(r.opening_balance), `balance ${k} opening`),
      net: cents(num(r.net_change), `balance ${k} net`),
      close: cents(num(r.closing_balance), `balance ${k} closing`),
    });
  }
  const b = (id: number, mk: string) =>
    bal.get(`${id}|${mk}`) ?? { open: 0, net: 0, close: 0 };
  const sumOf = (
    ids: number[],
    f: (x: { open: number; net: number; close: number }) => number,
    mk: string,
  ) => ids.reduce((s, id) => s + f(b(id, mk)), 0);

  // ---------- direct lines (CF-DAT-10) ----------

  const SEC: Record<string, Section> = {
    OPERATING: "OP",
    INVESTING: "INV",
    FINANCING: "FIN",
  };
  const lines = dimLine
    .filter((r) => r.view === "DIRECT" && r.line_kind === "data")
    .sort((x, y) => num(x.sort_order) - num(y.sort_order))
    .map((r) => ({
      code: str(r.line_code),
      section:
        SEC[str(r.section_code)] ??
        fail(`line ${str(r.line_code)}: section ${str(r.section_code)}`),
      label: str(r.line_label),
      direction: str(r.usual_direction),
    }));
  const lineIx = new Map(lines.map((l, i) => [l.code, i]));
  const perSection = (s: Section) =>
    lines.filter((l) => l.section === s).length;
  if (
    lines.length !== 16 ||
    perSection("OP") !== 8 ||
    perSection("INV") !== 4 ||
    perSection("FIN") !== 4
  )
    fail(
      `direct lines: ${lines.length} (${perSection("OP")}/${perSection("INV")}/${perSection("FIN")}), expected 16 (8/4/4)`,
    );

  // ---------- ledger rows (CF-DAT-11, CF-DAT-12) ----------

  const txnById = new Map(txns.map((t) => [num(t.txn_id), t]));
  const CLR: Record<string, string> = {
    Reconciled: "R",
    Cleared: "C",
    Uncleared: "U",
    NotApplicable: "N",
  };
  interface Group {
    date: string;
    txn: number;
    line: string;
    cp: number;
    sign: number;
    cents: number;
    memo: string;
    memos: Set<string>;
    cleared: Set<string>;
    offsets: Set<number>;
    docs: number[];
  }
  const groups = new Map<string, Group>();
  let external = 0;
  for (const p of postings) {
    if (p.is_internal_transfer === true) continue;
    external++;
    const line = str(p.direct_line_code);
    if (!lineIx.has(line))
      fail(
        `posting ${num(p.posting_id)}: line ${line} is not a direct data line`,
      );
    const amount = num(p.amount);
    const sign = amount > 0 ? 1 : -1;
    const k = `${num(p.txn_id)}|${line}|${num(p.counterparty_id)}|${sign}`;
    let g = groups.get(k);
    if (!g) {
      g = {
        date: iso(p.txn_date),
        txn: num(p.txn_id),
        line,
        cp: num(p.counterparty_id),
        sign,
        cents: 0,
        memo: "",
        memos: new Set(),
        cleared: new Set(),
        offsets: new Set(),
        docs: [],
      };
      groups.set(k, g);
    }
    g.cents += cents(amount, `posting ${num(p.posting_id)}`);
    const memo = str(p.memo);
    if (memo) g.memos.add(memo);
    if (!g.memo && memo) g.memo = memo;
    g.cleared.add(str(p.cleared_status));
    g.offsets.add(num(p.offset_account_id));
    if (p.settled_txn_id !== null) {
      const d = num(p.settled_txn_id);
      if (!g.docs.includes(d)) g.docs.push(d);
    }
  }
  const ordered = [...groups.values()].sort(
    (x, y) =>
      (x.date < y.date ? -1 : x.date > y.date ? 1 : 0) ||
      x.txn - y.txn ||
      lineIx.get(x.line)! - lineIx.get(y.line)! ||
      x.sign - y.sign,
  );
  const termPrincipal = new Array<number>(N).fill(0);
  const ltl = new Set(ltlIds);
  const ledger = ordered.map((g) => {
    if (g.cleared.size !== 1)
      fail(`txn ${g.txn} ${g.line}: mixed cleared states`);
    if (g.memos.size > 1) fail(`txn ${g.txn} ${g.line}: mixed memos`);
    const t = txnById.get(g.txn) ?? fail(`txn ${g.txn}: not in fact_txn`);
    let memo = g.memo || str(t.private_note);
    if (!memo && g.docs.length) {
      const d0 =
        txnById.get(g.docs[0]!) ??
        fail(`settled txn ${g.docs[0]}: not in fact_txn`);
      memo =
        `${str(d0.txn_type)} ${str(d0.doc_number) || num(d0.txn_id)}` +
        (g.docs.length > 1 ? ` + ${g.docs.length - 1} more` : "");
    }
    const cleared =
      CLR[[...g.cleared][0]!] ??
      fail(`txn ${g.txn}: cleared status ${[...g.cleared][0]}`);
    if (g.line === "D_FIN_REPAID") {
      const offs = [...g.offsets];
      if (offs.every((o) => ltl.has(o))) {
        const mi =
          monthIx.get(g.date.slice(0, 7)) ??
          fail(`txn ${g.txn}: date ${g.date} outside the months`);
        termPrincipal[mi] = termPrincipal[mi]! - g.cents;
      } else if (offs.some((o) => ltl.has(o)))
        fail(
          `txn ${g.txn}: one repayment group mixes term loans with another account`,
        );
    }
    return {
      txn_date: g.date,
      line_code: g.line,
      counterparty_id: g.cp,
      txn_id: g.txn,
      txn_type: str(t.txn_type),
      doc_number: str(t.doc_number),
      amount_cents: int32(g.cents, `txn ${g.txn}`),
      cleared,
      memo,
    };
  });
  console.log(
    `ledger: ${external} external postings of ${postings.length} → ${ledger.length} rows`,
  );

  // ---------- month table (CF-DAT-08) ----------

  const month = months.map((mk, i) => ({
    month_key: mk,
    cash_open: sumOf(cashIds, (x) => x.open, mk),
    cash_close: sumOf(cashIds, (x) => x.close, mk),
    net_income: -sumOf(plIds, (x) => x.net, mk),
    revenue: -sumOf(revenueIds, (x) => x.net, mk),
    interest_expense: b(interestId!, mk).net,
    depreciation_expense: b(depreciationId!, mk).net,
    ar_close: b(arId!, mk).close,
    ap_close: -b(apId!, mk).close,
    spend: sumOf(spendIds, (x) => x.net, mk),
    debt_close: -sumOf(debtIds, (x) => x.close, mk),
    term_principal: termPrincipal[i]!,
  }));

  // ---------- statement accounts (CF-DAT-09) ----------

  const stmt = accounts
    .filter((a) => !a.isPl && !a.isCash && a.section in SEC)
    .sort((x, y) => x.sort - y.sort)
    .map((a) => ({
      a,
      adj: months.map((mk) => -b(a.id, mk).net),
    }))
    .filter((s) => s.adj.some((v) => v !== 0))
    .map(({ a, adj }) => {
      const group: AccountGroup =
        a.subtype === "AccumulatedDepreciation" ? "DEP" : SEC[a.section]!;
      const parent = a.parent === null ? undefined : byId.get(a.parent);
      const label =
        group === "DEP"
          ? `Depreciation · ${parent?.name ?? fail(`account ${a.id}: no parent`)}`
          : a.fqn.replace(/:/g, " · ");
      return { id: a.id, label, group, override: a.override, adj };
    });
  const groupCount = (g: AccountGroup) =>
    stmt.filter((s) => s.group === g).length;
  if (
    stmt.length !== 17 ||
    groupCount("DEP") !== 2 ||
    groupCount("OP") !== 8 ||
    groupCount("INV") !== 2 ||
    groupCount("FIN") !== 5
  )
    fail(
      `statement accounts: ${stmt.length} (DEP ${groupCount("DEP")}, OP ${groupCount("OP")}, INV ${groupCount("INV")}, FIN ${groupCount("FIN")}), expected 17 (2/8/2/5)`,
    );
  const statementMonth = stmt.flatMap((s) =>
    months.map((mk, i) => ({
      account_id: s.id,
      month_key: mk,
      adjustment_cents: int32(s.adj[i]!, `adjustment ${s.id} ${mk}`),
    })),
  );

  // ---------- control totals ----------

  const csvText = readFileSync(
    join(PACK, "checks", "control_totals_usd.csv"),
    "utf8",
  );
  const csv = csvText
    .trim()
    .split("\n")
    .slice(1)
    .map((line) => {
      const [period_key, metric_code, scope, value] = line.split(",");
      return {
        period_key: period_key!,
        metric_code: metric_code!,
        scope: scope!,
        value: Number(value),
      };
    });
  const ctl = new Map(
    csv.map((r) => [`${r.period_key}|${r.metric_code}|${r.scope}`, r.value]),
  );

  const SHIPPED = new Set([
    "M01",
    "M02",
    "M03",
    "M04",
    "M06",
    "M07",
    "M08",
    "M09",
    "M10",
    "M15",
    "M16",
  ]);
  const control = csv
    .filter(
      (r) =>
        /^[MY]-/.test(r.period_key) &&
        ((SHIPPED.has(r.metric_code) &&
          (r.scope === "ALL" || r.scope === "OVERRIDES_ON")) ||
          r.metric_code === "DIRECT_LINE"),
    )
    .sort(
      (x, y) =>
        x.period_key.localeCompare(y.period_key) ||
        x.metric_code.localeCompare(y.metric_code) ||
        x.scope.localeCompare(y.scope),
    );
  if (control.length !== 777)
    fail(`control rows: ${control.length}, expected 777 (CF-DAT-13)`);

  // ---------- AT-01: recompute every control value from the output tables ----------

  const periods = new Map<string, number[]>();
  months.forEach((mk, i) => periods.set(`M-${mk}`, [i]));
  for (const y of new Set(months.map((m) => m.slice(0, 4))))
    periods.set(
      `Y-${y}`,
      months.flatMap((m, i) => (m.startsWith(y) ? [i] : [])),
    );
  periods.set(
    "ALL",
    months.map((_, i) => i),
  );

  const ledgerMonth = ledger.map((r) => monthIx.get(r.txn_date.slice(0, 7))!);
  const stmtByAcc = new Map(stmt.map((s) => [s.id, s]));
  let checked = 0;
  const fails: string[] = [];
  for (const [pk, ix] of periods) {
    const a = ix[0]!;
    const z = ix[ix.length - 1]!;
    const inSet = new Set(ix);
    const sum = (f: (r: (typeof month)[number]) => number) =>
      ix.reduce((s, i) => s + f(month[i]!), 0);
    const v = (id: number) =>
      ix.reduce((s, i) => s + stmtByAcc.get(id)!.adj[i]!, 0);
    const ni = sum((r) => r.net_income);
    const sec = { OP: ni, INV: 0, FIN: 0 };
    for (const s of stmt) sec[s.group === "DEP" ? "OP" : s.group] += v(s.id);
    const dl = new Map<string, number>();
    let cin = 0;
    let cout = 0;
    ledger.forEach((r, k) => {
      if (!inSet.has(ledgerMonth[k]!)) return;
      dl.set(r.line_code, (dl.get(r.line_code) ?? 0) + r.amount_cents);
      if (r.amount_cents > 0) cin += r.amount_cents;
      else cout += r.amount_cents;
    });
    const open = month[a]!.cash_open;
    const close = month[z]!.cash_close;
    if (open + cin + cout !== close)
      fails.push(`${pk}: roll-forward open + in + out ≠ close`);
    const got = new Map<string, number>([
      ["M01|ALL", open / 100],
      ["M02|ALL", close / 100],
      ["M03|ALL", (close - open) / 100],
      ["M04|ALL", ni / 100],
      ["REVENUE|ALL", sum((r) => r.revenue) / 100],
      ["M06|OVERRIDES_ON", sec.OP / 100],
      ["M07|OVERRIDES_ON", sec.INV / 100],
      ["M08|OVERRIDES_ON", sec.FIN / 100],
      ["M09|ALL", cin / 100],
      ["M10|ALL", cout / 100],
      [
        "M15|ALL",
        (sec.OP +
          (dl.get("D_INV_PURCHASE") ?? 0) +
          (dl.get("D_INV_PROCEEDS") ?? 0)) /
          100,
      ],
    ]);
    if (ni !== 0) got.set("M16|ALL", sec.OP / ni);
    for (const s of stmt) {
      const x = v(s.id);
      got.set(`M05|${s.id}`, x / 100);
    }
    // The mock build reads these two lines for M15 from a defaultdict, which adds them to every period (as zeros where
    // no cash moved); the spec count of 1,554 includes those zero checks.
    for (const code of ["D_INV_PURCHASE", "D_INV_PROCEEDS"])
      dl.set(code, dl.get(code) ?? 0);
    for (const [code, c] of dl) got.set(`DIRECT_LINE|${code}`, c / 100);
    // every control row of these metrics, and (M05, DIRECT_LINE) every non-zero recomputed row: both ways
    const keys = new Set<string>();
    for (const k of ctl.keys()) {
      const [p, mc, sc] = k.split("|") as [string, string, string];
      if (p !== pk) continue;
      if (got.has(`${mc}|${sc}`) || mc === "M05" || mc === "DIRECT_LINE")
        keys.add(`${mc}|${sc}`);
    }
    for (const k of got.keys())
      if (k.startsWith("M05|") || k.startsWith("DIRECT_LINE|")) keys.add(k);
    for (const k of keys) {
      const want = ctl.get(`${pk}|${k}`) ?? 0;
      const have = got.get(k) ?? 0;
      const ok = k.startsWith("M16|")
        ? Math.abs(have - want) <= 1e-6 * Math.max(1, Math.abs(want))
        : Math.abs(have - want) <= TOL;
      checked++;
      if (!ok)
        fails.push(
          `${pk} ${k}: page ${have.toFixed(6)} vs control ${want.toFixed(6)}`,
        );
    }
  }
  console.log(
    `AT-01: ${checked} control values over ${periods.size} periods, ${fails.length} failed`,
  );
  if (fails.length) {
    for (const f of fails.slice(0, 40)) console.error(`  ${f}`);
    process.exit(1);
  }
  if (checked !== 1554 || periods.size !== 38)
    fail(
      `expected 1,554 control values over 38 periods, got ${checked} over ${periods.size}`,
    );

  // ---------- write (only now: every assert passed) ----------

  const PARQUET_TYPE = { str: "STRING", int: "INT32", num: "DOUBLE" } as const;
  function write(key: FileKey, rows: Record<string, unknown>[]) {
    const spec: ColumnSpec = FILES[key].columns;
    const columnData = Object.entries(spec).map(([name, kind]) => ({
      name,
      data: rows.map((r) => r[name]),
      type: PARQUET_TYPE[kind as keyof typeof PARQUET_TYPE],
      nullable: false,
    }));
    const buf = Buffer.from(
      parquetWriteBuffer({
        columnData,
        statistics: false,
        rowGroupSize: 1_000_000,
        createdBy: "vosk.dev scripts/cashflow-build.ts",
      } as Parameters<typeof parquetWriteBuffer>[0]),
    );
    return {
      name: FILES[key].file,
      buf,
      rows: rows.length,
      columns: Object.fromEntries(
        Object.entries(spec).map(([n, k]) => [
          n,
          PARQUET_TYPE[k as keyof typeof PARQUET_TYPE].toLowerCase(),
        ]),
      ),
    };
  }
  const outFiles = [
    write("month", month),
    write("statementMonth", statementMonth),
    write("ledger", ledger),
    write("control", control),
  ];

  const usedCp = [...new Set(ledger.map((r) => r.counterparty_id))].sort(
    (x, y) => x - y,
  );
  const cpName = new Map(
    dimCp.map((c) => [num(c.counterparty_id), str(c.counterparty_name)]),
  );
  const manifest: Manifest = {
    dataset: "acme-cash-flow/1",
    source: {
      engine_version: src.engine_version,
      seed: src.seed,
      preset: src.preset,
    },
    as_of: src.as_of.slice(0, 10),
    start_date: src.start_date,
    end_date: src.end_date,
    currency: "USD",
    company: COMPANY,
    months,
    lines,
    accounts: stmt.map((s) => ({
      id: s.id,
      label: s.label,
      group: s.group,
      override: s.override,
    })),
    counterparties: usedCp.map((id) => ({ id, name: cpName.get(id) ?? "" })),
    files: outFiles.map((f) => ({
      name: f.name,
      rows: f.rows,
      bytes: f.buf.byteLength,
      sha256: createHash("sha256").update(f.buf).digest("hex"),
      columns: f.columns,
    })),
    asserts: { control_values: checked, periods: periods.size },
  };
  manifestSchema.parse(manifest);
  const manifestText = `${JSON.stringify(manifest, null, 1)}\n`;
  const total =
    outFiles.reduce((s, f) => s + f.buf.byteLength, 0) +
    Buffer.byteLength(manifestText);
  for (const f of outFiles)
    console.log(
      `  ${f.name.padEnd(24)} ${String(f.rows).padStart(5)} rows ${(f.buf.byteLength / 1024).toFixed(1).padStart(6)} kB`,
    );
  console.log(
    `  manifest.json${" ".repeat(18)}${(Buffer.byteLength(manifestText) / 1024).toFixed(1).padStart(6)} kB`,
  );
  console.log(
    `  total ${(total / 1024).toFixed(1)} kB of ${BUDGET_BYTES / 1024} kB`,
  );
  if (total > BUDGET_BYTES)
    fail("data/cashflow/parquet is over the 150 kB budget (CF-DAT-04)");

  mkdirSync(OUT, { recursive: true });
  mkdirSync(FIXTURE, { recursive: true });
  for (const f of outFiles) writeFileSync(join(OUT, f.name), f.buf);
  writeFileSync(join(OUT, "manifest.json"), manifestText);
  writeFileSync(join(FIXTURE, "control_totals_usd.csv"), csvText);
  console.log(
    "ALL PASS: data/cashflow/parquet and data/cashflow/checks/control_totals_usd.csv written",
  );
}

main().catch((e: unknown) =>
  fail(e instanceof Error ? (e.stack ?? e.message) : String(e)),
);
