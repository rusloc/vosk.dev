import { useRef } from "react";
import type { CSSProperties } from "react";
import type {
  AnalysisVM,
  BridgeVM,
  Tone,
  VarFilter,
  VarFilterDim,
  VarRow,
  VariancesVM,
} from "@/lib/pnl/engine/view-types";
import { NO_FILTER } from "@/lib/pnl/engine/view-types";
import { GlassPopup, InfoButton, usePopup } from "../glass";
import { FunnelIcon } from "../icons";
import { ChoiceGroup } from "../primitives";
import { DivBar, Waterfall } from "./charts";
import { useSize } from "./use-size";
import styles from "./views.module.css";

// Analysis (P&L views redesign v4, build-brief §2; one page since 2026-10-31, owner's layout change). Upper half: the
// largest variances, every line ranked by |Δ|, narrowed by a filter of up to four slice members (lvr / lvch / lvln /
// lvsg in the URL) chosen in a glass pop-up behind the funnel. Lower half: the two bridges side by side.

const TONE: Record<Tone, string | undefined> = {
  ahead: styles.ahead,
  adverse: styles.adverse,
  plan: styles.plan,
  neutral: styles.neutral,
};
const POPUP_RIGHT: CSSProperties = { top: 40, right: 8 };

function BridgePanel({ vm }: { vm: BridgeVM }) {
  const [ref, size] = useSize<HTMLDivElement>();
  return (
    <section className={styles.panel} aria-labelledby={`h-${vm.id}`}>
      <h2 id={`h-${vm.id}`}>
        {vm.title}
        <span style={{ marginLeft: "auto" }}>
          <InfoButton
            id={vm.id}
            title={vm.info.title}
            info={vm.info}
            popupStyle={POPUP_RIGHT}
          />
        </span>
      </h2>
      <div ref={ref} className={styles.ch}>
        <Waterfall steps={vm.steps} width={size.width} height={size.height} />
      </div>
    </section>
  );
}

function AnalysisBridges({ vm }: { vm: AnalysisVM }) {
  return (
    <div className={styles.halves}>
      <BridgePanel vm={vm.nr} />
      <BridgePanel vm={vm.profit} />
    </div>
  );
}

export function AnalysisView({
  bridges,
  ...variances
}: { bridges: AnalysisVM } & Parameters<typeof Variances>[0]) {
  return (
    <div className={`${styles.page} ${styles.stacked}`}>
      <Variances {...variances} />
      <AnalysisBridges vm={bridges} />
    </div>
  );
}

/** The funnel and its pop-up: one radio row per dimension ("All" + the company's members); a choice applies at once. */
function FilterButton({
  dims,
  filter,
  onFilter,
}: {
  dims: readonly VarFilterDim[];
  filter: VarFilter;
  onFilter: (filter: VarFilter) => void;
}) {
  const { open, close, toggle } = usePopup("var-filter");
  const opener = useRef<HTMLButtonElement>(null);
  const applied = dims.filter((d) => filter[d.dim] !== null).length;
  return (
    <>
      <button
        ref={opener}
        type="button"
        className={styles.filterBtn}
        aria-label={`Filter the variances${applied ? ` (${applied} applied)` : ""}`}
        aria-expanded={open}
        onClick={toggle}
      >
        <FunnelIcon />
        {applied ? <b>{applied}</b> : null}
      </button>
      {open ? (
        <GlassPopup
          title="Filter the variances"
          opener={opener}
          style={POPUP_RIGHT}
          className={styles.filterPopup}
          onClose={close}
        >
          <p>
            One member per dimension; the chosen members combine. Opex and below
            are allocated by net-revenue share to channel, category and tier
            (alloc.).
          </p>
          {dims.map((d) => (
            <div key={d.dim} className={styles.fgroup}>
              <span id={`vf-${d.dim}`} className={styles.flabel}>
                {d.label}
              </span>
              <ChoiceGroup
                labelledBy={`vf-${d.dim}`}
                className={styles.opts}
                value={filter[d.dim] ?? ""}
                options={[
                  { value: "", content: "All" },
                  ...d.options.map((o) => ({
                    value: o.code,
                    content: o.label,
                  })),
                ]}
                onChange={(v) => onFilter({ ...filter, [d.dim]: v || null })}
              />
            </div>
          ))}
          <div className={styles.fdone}>
            <button
              type="button"
              disabled={applied === 0}
              onClick={() => onFilter(NO_FILTER)}
            >
              Clear filters
            </button>
            <button type="button" onClick={close}>
              Done
            </button>
          </div>
        </GlassPopup>
      ) : null}
    </>
  );
}

function Cells({ r, scale, py }: { r: VarRow; scale: number; py: boolean }) {
  return (
    <>
      <td>{r.comparison}</td>
      <td>{r.actual}</td>
      <td>
        <DivBar delta={r.delta} scale={scale} />
      </td>
      <td className={TONE[r.tone]}>{r.deltaText}</td>
      <td className={r.deltaPct === "n.m." ? styles.nm : TONE[r.tone]}>
        {r.deltaPct}
      </td>
      {py ? <td>{r.py}</td> : null}
      <td>{r.fx}</td>
    </>
  );
}

export function Variances({
  vm,
  filter,
  onFilter,
}: {
  vm: VariancesVM;
  filter: VarFilter;
  onFilter: (filter: VarFilter) => void;
}) {
  const showPy = vm.columns.py !== ""; // Compare B = None drops the column (parity rule 17)
  return (
    <section className={styles.panel} aria-labelledby="h-variances">
      <h2 id="h-variances">
        {vm.title}
        {vm.filterText ? (
          <span className={styles.sub}>{vm.filterText}</span>
        ) : null}
        <div className={styles.ctl}>
          <FilterButton dims={vm.filter} filter={filter} onFilter={onFilter} />
        </div>
        <InfoButton
          id="variances"
          title={vm.info.title}
          info={vm.info}
          popupStyle={POPUP_RIGHT}
        />
      </h2>
      <div className={`${styles.ch} ${styles.scroll}`}>
        <table className={`${styles.table} ${styles.vtable}`}>
          <thead>
            <tr>
              <th className={styles.l}>Line</th>
              <th>{vm.columns.comparison}</th>
              <th>Actual</th>
              <th aria-label="Variance bar" />
              <th>Δ</th>
              <th>Δ %</th>
              {showPy ? <th>{vm.columns.py}</th> : null}
              <th>of which FX</th>
            </tr>
          </thead>
          <tbody>
            {vm.rows.length === 0 ? (
              <tr>
                <td className={styles.l} colSpan={showPy ? 8 : 7}>
                  Nothing is booked for this combination.
                </td>
              </tr>
            ) : null}
            {vm.rows.map((r) => (
              <tr key={r.code} className={r.alloc ? styles.alloc : ""}>
                <td className={styles.l}>
                  {r.label}
                  {r.blockName ? (
                    <span className={styles.blkn}>{r.blockName}</span>
                  ) : null}
                  {r.alloc ? <span className={styles.tag}>alloc.</span> : null}
                </td>
                <Cells r={r} scale={vm.scale} py={showPy} />
              </tr>
            ))}
          </tbody>
          <tfoot>
            {vm.footer.map((r) => (
              <tr key={`f-${r.code}`} className={styles.foot}>
                <td className={styles.l}>{r.label}</td>
                <Cells r={r} scale={vm.scale} py={showPy} />
              </tr>
            ))}
          </tfoot>
        </table>
      </div>
    </section>
  );
}
