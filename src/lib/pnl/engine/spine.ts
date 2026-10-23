import type { Manifest } from "../data/manifest";
import type { EntityCode, EntityView, SpineRow } from "./types";

// The 19-step spine (spec §3, D-11, D-32): row order, labels and subtotal formulas come from dim_report_line;
// leaves from dim_account. No subtotal is stored anywhere — every one is evaluated here from its formula.

const KIND = {
  input_block: "block",
  subtotal: "subtotal",
  ratio: "ratio",
  group_total: "group_total",
  memo: "memo",
} as const;

const ENTITIES: readonly EntityCode[] = ["P", "S"];
const inScope = (scope: string, e: EntityCode) =>
  scope === e || scope === "BOTH";

/** Group-view leaf code: one account can sit under both companies (shared blocks, M-02). */
export const groupLeafCode = (account: string, e: EntityCode) =>
  `${account}@${e}`;

export interface SpineOptions {
  /** A slice filter is on: leaves allocated by C-31 carry the "alloc." tag (L-14, F-36). */
  allocated?: boolean;
}

/**
 * Spine rows for an entity view (M-02, N-11). Leaves are the accounts of each block that the entity books. Labels
 * come from dim_report_line / dim_account; the entity alias (L-11) is a secondary label. In the Group view each
 * input block holds one node per company and then its leaves, plus the Group-only accounts — the Intercompany
 * eliminations nodes of blocks 1 and 6 and the Intercompany difference (M-05, C-36, C-37).
 */
export function buildSpine(
  m: Manifest,
  entity: EntityView,
  { allocated = false }: SpineOptions = {},
): SpineRow[] {
  const lines = [...m.tables.dim_report_line].sort(
    (a, b) => a.sort_order - b.sort_order,
  );
  const accounts = [...m.tables.dim_account].sort(
    (a, b) => a.sort_order - b.sort_order,
  );
  const names = new Map(
    m.tables.dim_entity.map((e) => [e.entity_code, e.short_name]),
  );
  // F-15 / M-25: a block is a cost block when its accounts' natural signs sum below zero (RD stays a cost block
  // despite its capitalised-development credit; OOI, signed 0, is not). A group total (OPEX) sums its child blocks.
  const blockSign = new Map<string, number>();
  for (const a of m.tables.dim_account)
    blockSign.set(
      a.block_code,
      (blockSign.get(a.block_code) ?? 0) + a.natural_sign,
    );
  const lineSign = (l: (typeof lines)[number]): number =>
    l.row_type === "input_block" && l.block_code !== null
      ? (blockSign.get(l.block_code) ?? 0)
      : l.row_type === "group_total"
        ? lines
            .filter((c) => c.parent_line_code === l.line_code)
            .reduce((s, c) => s + lineSign(c), 0)
        : 0;
  const tagOf = (a: (typeof accounts)[number]) =>
    a.is_intercompany ? "IC" : allocated && a.is_below_cm ? "alloc." : null;

  const rows: SpineRow[] = [];
  for (const l of lines) {
    const level = l.parent_line_code === null ? 0 : 1;
    const isCost = lineSign(l) < 0;
    rows.push({
      code: l.line_code,
      kind: KIND[l.row_type],
      label: l.line_name,
      alias:
        (entity === "P"
          ? l.alias_products
          : entity === "S"
            ? l.alias_services
            : null) ?? null,
      parent: l.parent_line_code,
      level,
      tag: l.tag,
      isKey: l.is_key,
      isCost,
      account: null,
      entity: null,
    });
    if (l.row_type !== "input_block") continue;
    const inBlock = accounts.filter((a) => a.block_code === l.block_code);
    // leaves follow their block's cost flag, so a displayed block always equals the sum of its displayed leaves
    const leaf = (
      a: (typeof accounts)[number],
      code: string,
      parent: string,
      lvl: SpineRow["level"],
      e: EntityCode | null,
    ): SpineRow => ({
      code,
      kind: "leaf",
      label: a.account_name,
      alias: null,
      parent,
      level: lvl,
      tag: tagOf(a),
      isKey: false,
      isCost,
      account: a.account_code,
      entity: e,
    });

    if (entity !== "GROUP") {
      for (const a of inBlock)
        if (a.has_fact_rows && inScope(a.entity_scope, entity))
          rows.push(
            leaf(a, a.account_code, l.line_code, level === 0 ? 1 : 2, null),
          );
      continue;
    }
    const nodeLevel = (level + 1) as SpineRow["level"];
    const leafLevel = (level + 2) as SpineRow["level"];
    for (const e of ENTITIES) {
      const own = inBlock.filter(
        (a) => a.has_fact_rows && inScope(a.entity_scope, e),
      );
      if (own.length === 0) continue;
      const node = groupLeafCode(l.line_code, e);
      rows.push({
        code: node,
        kind: "entity",
        label: names.get(e) ?? e,
        alias: null,
        parent: l.line_code,
        level: nodeLevel,
        tag: null,
        isKey: false,
        isCost,
        account: null,
        entity: e,
      });
      for (const a of own)
        rows.push(
          leaf(a, groupLeafCode(a.account_code, e), node, leafLevel, e),
        );
    }
    for (const a of inBlock)
      if (a.entity_scope === "GROUP")
        rows.push(leaf(a, a.account_code, l.line_code, nodeLevel, null));
  }
  return rows;
}

/**
 * Values of every spine row from its leaves. A leaf adds into each block and company node above it (plain sums of
 * signed values, M-01); subtotals, group totals and ratios evaluate their dim_report_line formula. A ratio with a
 * zero denominator is null ("n/a").
 */
export function evaluateSpine(
  m: Manifest,
  spine: readonly SpineRow[],
  leafValue: (row: SpineRow) => number,
): Map<string, number | null> {
  const formulas = new Map(
    m.tables.dim_report_line.map((l) => [l.line_code, l.formula]),
  );
  const byCode = new Map(spine.map((r) => [r.code, r]));
  const values = new Map<string, number | null>();

  for (const r of spine)
    if (r.kind === "leaf") {
      const v = leafValue(r);
      values.set(r.code, v);
      for (
        let p = byCode.get(r.parent ?? "");
        p;
        p = byCode.get(p.parent ?? "")
      ) {
        if (p.kind !== "block" && p.kind !== "entity") break;
        values.set(p.code, (values.get(p.code) ?? 0) + v);
      }
    } else if (
      (r.kind === "block" || r.kind === "entity") &&
      !values.has(r.code)
    )
      values.set(r.code, 0);

  const resolving = new Set<string>();
  const valueOf = (code: string): number | null => {
    const known = values.get(code);
    if (known !== undefined) return known;
    const formula = formulas.get(code);
    if (!formula) throw new Error(`spine: no value or formula for ${code}`);
    if (resolving.has(code))
      throw new Error(`spine: circular formula at ${code}`);
    resolving.add(code);
    const v = evaluateFormula(formula, valueOf);
    resolving.delete(code);
    values.set(code, v);
    return v;
  };
  for (const r of spine) valueOf(r.code);
  return values;
}

/** dim_report_line formula grammar: `A + B + …`, `A / B`, `-A / B` (operands are line codes). */
export function evaluateFormula(
  formula: string,
  valueOf: (code: string) => number | null,
): number | null {
  const sum = (expr: string): number | null => {
    let total = 0;
    for (const raw of expr.split("+")) {
      const term = raw.trim();
      const negative = term.startsWith("-");
      const code = negative ? term.slice(1).trim() : term;
      if (!/^[A-Z][A-Z0-9_]*$/.test(code))
        throw new Error(`spine: bad term "${term}" in "${formula}"`);
      const v = valueOf(code);
      if (v === null) return null;
      total += negative ? -v : v;
    }
    return total;
  };
  const [numerator, denominator, extra] = formula.split("/");
  if (extra !== undefined || numerator === undefined)
    throw new Error(`spine: bad formula "${formula}"`);
  const num = sum(numerator);
  if (denominator === undefined) return num;
  const den = sum(denominator);
  return num === null || den === null || den === 0 ? null : num / den;
}
