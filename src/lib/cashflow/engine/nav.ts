import type { Section } from "../data/manifest";

// The view stack (handoff 03 § 7, CF-KEY-02, D-7; mock `go()`, `goStep()`, `back()`, the menu's drill items). Esc pops one
// entry; pushing: a section's arrow, a Cash pop-up card, a Diagram activity node, a line label, the activity total row,
// a heat cell; replacing the top: an Activities tab; resetting: a path step or a menu drill item.

export type Entry =
  | { view: "stmt" }
  | { view: "heat"; sec: Section }
  | { view: "ledger"; sec: Section; line: number | null; day: number | null };

export interface Nav {
  stack: Entry[];
  /** the last activity opened (the Activities step's default when none is on the stack) */
  lastSec: Section;
}

export const STATEMENT: Entry = { view: "stmt" };
export const initialNav = (): Nav => ({ stack: [STATEMENT], lastSec: "OP" });

export const top = (n: Nav): Entry => n.stack[n.stack.length - 1]!;

/** Statement resets; any other entry is pushed. */
export function push(n: Nav, e: Entry): Nav {
  if (e.view === "stmt") return { ...n, stack: [STATEMENT] };
  return {
    stack: [...n.stack, e],
    lastSec: e.view === "heat" ? e.sec : n.lastSec,
  };
}

/** An Activities tab: the same slot, another activity. */
export function replaceTop(n: Nav, e: Entry): Nav {
  if (e.view === "stmt") return { ...n, stack: [STATEMENT] };
  return {
    stack: [...n.stack.slice(0, -1), e],
    lastSec: e.view === "heat" ? e.sec : n.lastSec,
  };
}

/** Esc: one step back; null when already on the Statement alone. */
export function back(n: Nav): Nav | null {
  return n.stack.length < 2 ? null : { ...n, stack: n.stack.slice(0, -1) };
}

/** A path step (0 Statement, 1 Activities, 2 Transactions), CF-NAV-07. */
export function goStep(n: Nav, step: 0 | 1 | 2): Nav {
  if (step === 0) return { ...n, stack: [STATEMENT] };
  const hi = n.stack.findIndex((e) => e.view === "heat");
  const heatEntry =
    hi >= 0 ? (n.stack[hi] as Extract<Entry, { view: "heat" }>) : null;
  const sec = heatEntry?.sec ?? n.lastSec;
  const stack: Entry[] = heatEntry
    ? n.stack.slice(0, hi + 1)
    : [STATEMENT, { view: "heat", sec }];
  if (step === 2) stack.push({ view: "ledger", sec, line: null, day: null });
  return { stack, lastSec: sec };
}

/** A menu drill item (CF-MNU-03): Statement; Activities (current activity, else Operating); Transactions. */
export function menuDrill(n: Nav, step: 0 | 1 | 2): Nav {
  if (step === 0) return { ...n, stack: [STATEMENT] };
  const t = top(n);
  const sec: Section = t.view === "stmt" ? "OP" : t.sec;
  const heatEntry: Entry = { view: "heat", sec };
  if (step === 1) return { stack: [STATEMENT, heatEntry], lastSec: sec };
  const ledger: Entry =
    t.view === "ledger"
      ? { view: "ledger", sec, line: t.line, day: t.day }
      : { view: "ledger", sec, line: null, day: null };
  return { stack: [STATEMENT, heatEntry, ledger], lastSec: sec };
}

/** The canonical stack of a deep link (CF-URL-04). */
export function canonicalStack(e: Entry): Entry[] {
  if (e.view === "stmt") return [STATEMENT];
  if (e.view === "heat") return [STATEMENT, e];
  return [STATEMENT, { view: "heat", sec: e.sec }, e];
}
