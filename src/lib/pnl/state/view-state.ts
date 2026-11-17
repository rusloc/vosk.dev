import { z } from "zod";
import type { VarFilter } from "../engine/view-types";
import { NO_FILTER, VAR_DIMS } from "../engine/view-types";

// URL keys of the P&L views redesign (F-37 shareable link): the largest-variances filter. Validated at the boundary
// like the Selection keys: an invalid value falls back to its default and the URL is rewritten; defaults are omitted.
// The view itself stays `v` (Vitals keeps the value `kpi`).
//   p   = retired 2026-11-15 (Profitability's sub-page; Analysis lost its pages 2026-10-31): every view is one page,
//         an old link's `p` is an unknown key, dropped by the rewrite
//   lvr · lvch · lvln · lvsg = the variances filter, one member code per slice dimension (2026-10-31); a member the
//   company does not have is dropped by the shell (engine.validVarFilter), the code shape is checked here

/** The view-state keys, after the Selection keys (shared links). */
export const VIEW_STATE_KEYS = ["lvr", "lvch", "lvln", "lvsg"] as const;
const FILTER_KEYS: Readonly<Record<keyof VarFilter, string>> = {
  region: "lvr",
  channel: "lvch",
  line: "lvln",
  segment: "lvsg",
};

export interface ViewState {
  filter: VarFilter;
}

export const VIEW_STATE_DEFAULTS: ViewState = {
  filter: NO_FILTER,
};

const member = z
  .string()
  .regex(/^[A-Z0-9_]{1,16}$/)
  .nullable()
  .catch(null);
const schema = z
  .object({
    region: member,
    channel: member,
    line: member,
    segment: member,
  })
  .strict();

type Query = Pick<URLSearchParams, "get">;

export function parseViewState(q: Query): ViewState {
  const r = schema.parse({
    region: q.get(FILTER_KEYS.region),
    channel: q.get(FILTER_KEYS.channel),
    line: q.get(FILTER_KEYS.line),
    segment: q.get(FILTER_KEYS.segment),
  });
  return {
    filter: {
      region: r.region,
      channel: r.channel,
      line: r.line,
      segment: r.segment,
    },
  };
}

/** Non-default keys only, appended after the Selection keys. */
export function serializeViewState(s: ViewState): string {
  const out = new URLSearchParams();
  for (const d of VAR_DIMS) {
    const m = s.filter[d];
    if (m !== null) out.set(FILTER_KEYS[d], m);
  }
  return out.toString();
}

export const joinQuery = (...parts: string[]) =>
  parts.filter(Boolean).join("&");
