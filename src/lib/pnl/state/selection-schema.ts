import { z } from "zod";
import type { Manifest } from "../data/manifest";
import type { EntityView, MonthNumber, Selection } from "../engine/types";

// F-37 shareable link (ADR-0002 §2.4): the URL query string is the whole state. Every key is validated at the
// boundary; an invalid value is replaced by its default (F-02 … F-21) and the URL is rewritten, and unknown keys are
// dropped, so nothing unvalidated reaches the engine. Defaults are omitted, so the bare URL is the spec default.

const entity = z.enum(["P", "S", "GROUP"]);
const flag = z.enum(["0", "1"]).transform((v) => v === "1");
const MONTH_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
const isMonth = (n: number): n is MonthNumber =>
  (MONTH_NUMBERS as readonly number[]).includes(n);

const ENUMS = {
  tv: z.enum(["MTD", "QTD", "YTD", "LTM", "FY"]),
  b: z.enum(["A", "LE", "B"]),
  ca: z.enum(["B", "LE", "PY", "NONE"]),
  cb: z.enum(["B", "LE", "PY", "NONE"]),
  cur: z.enum(["USD", "EUR", "GBP"]),
  fx: z.enum(["ACT", "CC"]),
  u: z.enum(["M", "K"]),
  cs: z.enum(["NEG", "POS"]),
  vf: z.enum(["BOTH", "ABS", "PCT"]),
  bd: z.enum(["REGION", "CHANNEL", "LINE", "SEGMENT", "ENTITY"]),
  v: z.enum(["statement", "kpi", "analysis", "profitability"]),
} as const;

/** Short URL key per Selection field, in serialisation order (ADR-0002 §2.4). */
const KEYS = {
  entity: "e",
  fy: "fy",
  month: "m",
  timeView: "tv",
  base: "b",
  compareA: "ca",
  compareB: "cb",
  region: "r",
  channel: "ch",
  line: "ln",
  segment: "sg",
  currency: "cur",
  fxBasis: "fx",
  units: "u",
  costSign: "cs",
  varianceFormat: "vf",
  showPctNr: "pn",
  showFyOutlook: "fo",
  showTags: "tg",
  hideEmpty: "he",
  breakdown: "bd",
  view: "v",
} as const satisfies Record<keyof Selection, string>;

type Query = Pick<URLSearchParams, "get">;

/** Every key the state may carry in a URL: a page URL with any of them is a shared link into the report (F-37). */
export const SELECTION_KEYS: readonly string[] = Object.values(KEYS);

/** Entity alone, readable before the manifest is loaded (it decides which data file to fetch). */
export function parseEntity(query: Query): EntityView {
  const r = entity.safeParse(query.get(KEYS.entity));
  return r.success ? r.data : "P";
}

export interface SelectionCodec {
  defaults(entity: EntityView): Selection;
  parse(query: Query): Selection;
  serialize(sel: Selection): string;
}

export function createSelectionCodec(m: Manifest): SelectionCodec {
  const closed = m.tables.dim_month.filter((d) => d.is_closed);
  const lastRow =
    closed[closed.length - 1] ??
    m.tables.dim_month[m.tables.dim_month.length - 1];
  if (!lastRow) throw new Error("selection: dim_month is empty");
  const last = lastRow;
  const years = [...new Set(m.tables.dim_month.map((d) => d.fiscal_year))];
  const lastMonth = isMonth(last.month_number) ? last.month_number : 12;
  const slices = (e: EntityView) => ({
    region: m.tables.dim_region.map((r) => r.region_code),
    // F-32: channel, category and segment are entity-specific and off in the Group view
    channel:
      e === "GROUP"
        ? []
        : m.tables.dim_channel
            .filter((d) => d.entity_code === e && !d.is_unassigned)
            .map((d) => d.channel_code),
    line:
      e === "GROUP"
        ? []
        : m.tables.dim_line
            .filter((d) => d.entity_code === e && !d.is_unassigned)
            .map((d) => d.line_code),
    segment:
      e === "GROUP"
        ? []
        : m.tables.dim_segment
            .filter((d) => d.entity_code === e && !d.is_unassigned)
            .map((d) => d.segment_code),
  });

  function defaults(e: EntityView): Selection {
    return {
      entity: e, // F-01
      fy: last.fiscal_year, // F-02: current FY = the year of the last close
      month: lastMonth, // F-03: last closed month (N-03)
      timeView: "YTD", // F-04
      base: "A", // F-05
      compareA: "B", // F-06
      compareB: "PY", // F-07
      region: [], // F-08 … F-11: [] = all
      channel: [],
      line: [],
      segment: [],
      currency: "USD", // F-12
      fxBasis: "ACT", // F-13
      units: "M", // F-14
      costSign: "NEG", // F-15
      varianceFormat: "BOTH", // F-16
      showPctNr: true, // F-17: all on
      showFyOutlook: true,
      showTags: true,
      hideEmpty: true,
      // F-18 … F-20 are gone (ADR-0007): Variance only, By function only, Expand / Collapse are not state
      breakdown: e === "GROUP" ? "ENTITY" : "CHANNEL", // F-21
      view: "statement",
    };
  }

  function pick<T>(schema: z.ZodType<T>, raw: string | null, fallback: T): T {
    if (raw === null) return fallback;
    const r = schema.safeParse(raw);
    return r.success ? r.data : fallback;
  }

  /** Multi-select codes: unknown codes dropped; empty or every value selected means all ([]) (F-33). */
  function codes(raw: string | null, allowed: readonly string[]): string[] {
    if (!raw) return [];
    const chosen = allowed.filter((c) => raw.split(",").includes(c));
    return chosen.length === allowed.length ? [] : chosen;
  }

  function parse(q: Query): Selection {
    const e = parseEntity(q);
    const d = defaults(e);
    const s = slices(e);
    const fy = pick(z.coerce.number().int(), q.get(KEYS.fy), d.fy);
    const month = pick(z.coerce.number().int(), q.get(KEYS.month), d.month);
    const breakdown = pick(ENUMS.bd, q.get(KEYS.breakdown), d.breakdown);
    return {
      entity: e,
      fy: years.includes(fy) ? fy : d.fy,
      month: isMonth(month) ? month : d.month,
      timeView: pick(ENUMS.tv, q.get(KEYS.timeView), d.timeView),
      base: pick(ENUMS.b, q.get(KEYS.base), d.base),
      compareA: pick(ENUMS.ca, q.get(KEYS.compareA), d.compareA),
      compareB: pick(ENUMS.cb, q.get(KEYS.compareB), d.compareB),
      region: codes(q.get(KEYS.region), s.region),
      channel: codes(q.get(KEYS.channel), s.channel),
      line: codes(q.get(KEYS.line), s.line),
      segment: codes(q.get(KEYS.segment), s.segment),
      currency: pick(ENUMS.cur, q.get(KEYS.currency), d.currency),
      fxBasis: pick(ENUMS.fx, q.get(KEYS.fxBasis), d.fxBasis),
      units: pick(ENUMS.u, q.get(KEYS.units), d.units),
      costSign: pick(ENUMS.cs, q.get(KEYS.costSign), d.costSign),
      varianceFormat: pick(
        ENUMS.vf,
        q.get(KEYS.varianceFormat),
        d.varianceFormat,
      ),
      showPctNr: pick(flag, q.get(KEYS.showPctNr), d.showPctNr),
      showFyOutlook: pick(flag, q.get(KEYS.showFyOutlook), d.showFyOutlook),
      showTags: pick(flag, q.get(KEYS.showTags), d.showTags),
      hideEmpty: pick(flag, q.get(KEYS.hideEmpty), d.hideEmpty),
      // F-21: the Entity breakdown exists only in the Group view, which offers Region and Entity only
      breakdown:
        (breakdown === "ENTITY" && e !== "GROUP") ||
        (e === "GROUP" && !["REGION", "ENTITY"].includes(breakdown))
          ? d.breakdown
          : breakdown,
      view: pick(ENUMS.v, q.get(KEYS.view), d.view),
    };
  }

  function serialize(sel: Selection): string {
    // The entity-dependent default (breakdown) is judged against the selected entity; the entity itself
    // against the global default.
    const d = { ...defaults(sel.entity), entity: defaults("P").entity };
    const out = new URLSearchParams();
    for (const [field, key] of Object.entries(KEYS) as [
      keyof Selection,
      string,
    ][]) {
      const v = sel[field];
      const dv = d[field];
      if (Array.isArray(v) ? v.length === 0 : v === dv) continue;
      out.set(
        key,
        Array.isArray(v)
          ? v.join(",")
          : typeof v === "boolean"
            ? v
              ? "1"
              : "0"
            : String(v),
      );
    }
    return out.toString();
  }

  return { defaults, parse, serialize };
}

/** Each company's own channel, category and segment selection (F-30). */
export type SliceMemory = Partial<
  Record<EntityView, Pick<Selection, "channel" | "line" | "segment">>
>;

const BREAKDOWNS: Record<EntityView, readonly Selection["breakdown"][]> = {
  P: ["REGION", "CHANNEL", "LINE", "SEGMENT"],
  S: ["REGION", "CHANNEL", "LINE", "SEGMENT"],
  GROUP: ["REGION", "ENTITY"],
};

/**
 * Company switch (F-01, F-30, F-31, T-14): period, versions, region and display settings carry across; channel,
 * category and segment are the target company's own, remembered from its last visit; the Group view has none
 * (F-32). A breakdown the target does not offer falls back to its default (F-21).
 */
export function switchEntity(
  sel: Selection,
  to: EntityView,
  memory: SliceMemory,
  defaults: (e: EntityView) => Selection,
): { sel: Selection; memory: SliceMemory } {
  const saved: SliceMemory = {
    ...memory,
    [sel.entity]: {
      channel: sel.channel,
      line: sel.line,
      segment: sel.segment,
    },
  };
  const own =
    to === "GROUP"
      ? { channel: [], line: [], segment: [] }
      : (saved[to] ?? { channel: [], line: [], segment: [] });
  return {
    memory: saved,
    sel: {
      ...sel,
      ...own,
      entity: to,
      breakdown: BREAKDOWNS[to].includes(sel.breakdown)
        ? sel.breakdown
        : defaults(to).breakdown,
    },
  };
}

/** F-35 Reset: the defaults, keeping the current company and view. */
export function resetSelection(
  sel: Selection,
  defaults: (e: EntityView) => Selection,
): Selection {
  return { ...defaults(sel.entity), view: sel.view };
}

/**
 * F-33 multi-select, as a BI slicer: `chosen` [] means all. From all, a click selects just that value; after that a
 * click adds or removes one. The last value stays on (never empty), and a selection that reaches every value
 * collapses back to [] (all). Order follows `all`.
 */
export function toggleSlice(
  chosen: readonly string[],
  all: readonly string[],
  code: string,
): string[] {
  if (chosen.length === 0) return all.length === 1 ? [] : [code];
  const next = chosen.includes(code)
    ? chosen.filter((c) => c !== code)
    : [...chosen, code];
  if (next.length === 0) return [...chosen];
  return next.length === all.length ? [] : all.filter((c) => next.includes(c));
}
