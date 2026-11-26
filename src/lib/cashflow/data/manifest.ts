import { z } from "zod";
import type { ColumnSpec } from "@/lib/cashflow/data/parquet-columns";

// Data contract of the ACME Cash Flow report (handoff js-spec 02 § 2, CF-DAT-03 … CF-DAT-14; 2026-11-26). The build
// (scripts/cashflow-build.ts) writes these four tables and the manifest into data/cashflow/parquet; the load script puts
// them into Supabase schema `cashflow_demo`; the browser reads them back from /api/cashflow as columns. FILES is the one
// place the build, the loader, the load script and the tests share the column specs.
//
// Money is integer cents (D-2). One deviation from the spec: `ledger.txn_date` is an ISO date string, not date32, so it
// travels through the shared column codec and the database unchanged.

export const FILES = {
  /** month (34): cash, P&L and balance inputs of the KPIs, int cents. */
  month: {
    file: "month.parquet",
    columns: {
      month_key: "str",
      cash_open: "int",
      cash_close: "int",
      net_income: "int",
      revenue: "int",
      interest_expense: "int",
      depreciation_expense: "int",
      ar_close: "int",
      ap_close: "int",
      spend: "int",
      debt_close: "int",
      term_principal: "int",
    },
  },
  /** statement account × month, dense: the indirect adjustment (−net change), int cents. */
  statementMonth: {
    file: "statement-month.parquet",
    columns: { account_id: "int", month_key: "str", adjustment_cents: "int" },
  },
  /** transaction × direct line × counterparty × sign: the cash movements (in +, out −). */
  ledger: {
    file: "ledger.parquet",
    columns: {
      txn_date: "str",
      line_code: "str",
      counterparty_id: "int",
      txn_id: "int",
      txn_type: "str",
      doc_number: "str",
      amount_cents: "int",
      cleared: "str",
      memo: "str",
    },
  },
  /** the control totals the Reconciliation pop-up shows (months and years only, D-4). */
  control: {
    file: "control.parquet",
    columns: {
      period_key: "str",
      metric_code: "str",
      scope: "str",
      value: "num",
    },
  },
} as const satisfies Record<string, { file: string; columns: ColumnSpec }>;

export type FileKey = keyof typeof FILES;
export const FILE_KEYS = Object.keys(FILES) as FileKey[];

export const SECTIONS = ["OP", "INV", "FIN"] as const;
export type Section = (typeof SECTIONS)[number];
export const ACCOUNT_GROUPS = ["DEP", "OP", "INV", "FIN"] as const;
export type AccountGroup = (typeof ACCOUNT_GROUPS)[number];
export const CLEARED = ["R", "C", "U", "N"] as const;
export type Cleared = (typeof CLEARED)[number];

const int = z.number().int();
const isoDate = z.iso.date();
const monthKey = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);

export const manifestSchema = z
  .object({
    dataset: z.literal("acme-cash-flow/1"),
    source: z
      .object({
        engine_version: z.string().min(1),
        seed: int,
        preset: z.string().min(1),
      })
      .strict(),
    as_of: isoDate,
    start_date: isoDate,
    end_date: isoDate,
    currency: z.literal("USD"),
    company: z.string().min(1),
    months: z.array(monthKey).min(1),
    lines: z
      .array(
        z
          .object({
            code: z.string().regex(/^D_[A-Z_]+$/),
            section: z.enum(SECTIONS),
            label: z.string().min(1),
            direction: z.string().min(1),
          })
          .strict(),
      )
      .min(1),
    accounts: z.array(
      z
        .object({
          id: int,
          label: z.string().min(1),
          group: z.enum(ACCOUNT_GROUPS),
          override: z.boolean(),
        })
        .strict(),
    ),
    counterparties: z.array(
      z.object({ id: int.min(0), name: z.string() }).strict(),
    ),
    files: z.array(
      z
        .object({
          name: z.string().regex(/^[a-z-]+\.parquet$/),
          rows: int.min(0),
          bytes: int.min(1),
          sha256: z.string().regex(/^[0-9a-f]{64}$/),
          columns: z.record(z.string(), z.string()),
        })
        .strict(),
    ),
    asserts: z
      .object({ control_values: int.min(1), periods: int.min(1) })
      .strict(),
  })
  .strict();

export type Manifest = z.infer<typeof manifestSchema>;
