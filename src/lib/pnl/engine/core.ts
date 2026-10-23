import type { Dataset } from "../data/dataset";
import {
  allocates,
  createAggregator,
  type Accounts,
  type SliceFilter,
  type Translation,
} from "./aggregate";
import { createFx } from "./fx";
import { buildSpine, evaluateSpine } from "./spine";
import type { ColumnPlan, EntityView, Selection, SpineRow } from "./types";
import { hasNoData } from "./versions";

// What every view shares: one column of spine values for a company or the Group, from the cached aggregator.

// Group-only accounts (data contract: display rows, no fact rows). Revenue billed by Commerce Cloud to Consumer
// Products sits in block GR, the matching cost in block VSC (C-35).
const IC_REVENUE_BLOCK = "GR";
const IC_COST_BLOCK = "VSC";
export const ELIM_REVENUE = "ELIM_GR";
export const ELIM_COST = "ELIM_VSC";
export const IC_DIFFERENCE = "OOI_4";

export type Column = Map<string, number | null>;

export function createCore(ds: Dataset) {
  const m = ds.manifest;
  const fx = createFx(m);
  const agg = createAggregator(ds);
  const accountIdx = new Map(m.dict.account.map((c, i) => [c, i]));
  const blockAccounts = (block: string) =>
    m.tables.dim_account
      .filter((a) => a.block_code === block)
      .map((a) => accountIdx.get(a.account_code) ?? -1);
  const icRevenue = blockAccounts(IC_REVENUE_BLOCK);
  const icCost = blockAccounts(IC_COST_BLOCK);
  const sumAt = (v: Float64Array, idx: readonly number[]) =>
    idx.reduce((s, i) => s + (v[i] ?? 0), 0);

  const spines = new Map<string, SpineRow[]>();
  const spine = (entity: EntityView, allocated: boolean) => {
    const key = `${entity}|${allocated}`;
    let s = spines.get(key);
    if (!s) {
      s = buildSpine(m, entity, { allocated });
      spines.set(key, s);
    }
    return s;
  };

  const translation = (
    sel: Pick<Selection, "currency" | "fxBasis" | "fy">,
    basis = sel.fxBasis,
  ): Translation => ({ fx, currency: sel.currency, basis, fy: sel.fy });

  /**
   * One column's spine values. Group = Consumer Products + Commerce Cloud + eliminations (C-36, D-33, T-01): the
   * eliminations remove the intercompany revenue in block 1 and the same amount of cost in block 6, so contribution
   * margin and everything below it is unchanged (T-02); a mismatch between the two sides is the Intercompany
   * difference (C-37), zero while they match.
   */
  function column(
    entity: EntityView,
    rows: readonly SpineRow[],
    plan: ColumnPlan | null,
    f: SliceFilter,
    tr: Translation,
  ): Column | null {
    if (plan === null || hasNoData(plan)) return null;
    const at = (acc: Accounts, r: SpineRow) =>
      acc.all[accountIdx.get(r.account ?? "") ?? -1] ?? 0;
    if (entity !== "GROUP") {
      const acc = agg.accounts(entity, plan, f, tr);
      return evaluateSpine(m, rows, (r) => at(acc, r));
    }
    const p = agg.accounts("P", plan, f, tr);
    const s = agg.accounts("S", plan, f, tr);
    const ic = (idx: readonly number[]) => sumAt(p.ic, idx) + sumAt(s.ic, idx);
    const revenue = ic(icRevenue);
    const cost = ic(icCost);
    const group: Record<string, number> = {
      [ELIM_REVENUE]: -revenue,
      [ELIM_COST]: revenue,
      [IC_DIFFERENCE]: -(revenue + cost),
    };
    return evaluateSpine(m, rows, (r) =>
      r.entity === "P"
        ? at(p, r)
        : r.entity === "S"
          ? at(s, r)
          : (group[r.account ?? ""] ?? 0),
    );
  }

  /** Spine values of one entity view for a plan, with the selection's slice filter. */
  const values = (
    entity: EntityView,
    plan: ColumnPlan | null,
    f: SliceFilter,
    tr: Translation,
  ) => column(entity, spine(entity, allocates(f)), plan, f, tr);

  return { m, fx, agg, spine, translation, column, values };
}

export type Core = ReturnType<typeof createCore>;
