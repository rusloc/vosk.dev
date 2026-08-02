/**
 * What the executive email actually looks like in an inbox — for the "data to
 * the inbox" post. Rendered inline (not a screenshot) so it stays sharp, stays
 * readable on a phone, and inherits the site font.
 *
 * The figures are invented and the country list is fictional. They are internally
 * consistent — country GP sums to group GP, GP % equals GP / revenue, every YoY
 * is computed from its own pair — so the table reads like a real one without
 * being anyone's real one.
 */

type Row = {
  name: string;
  unit?: string;
  yoy?: string;
  ytd: string;
  ytdPy: string;
  mtd: string;
  mtdPy: string;
};

const GROUP: Row[] = [
  {
    name: "Revenue",
    unit: "$m",
    yoy: "+18.4%",
    ytd: "512.3",
    ytdPy: "432.7",
    mtd: "84.5",
    mtdPy: "71.4",
  },
  {
    name: "GP",
    unit: "$m",
    yoy: "+11.1%",
    ytd: "58.9",
    ytdPy: "53.0",
    mtd: "9.7",
    mtdPy: "8.8",
  },
  { name: "GP %", ytd: "11.5%", ytdPy: "12.2%", mtd: "11.5%", mtdPy: "12.3%" },
  {
    name: "TEUs",
    unit: "k",
    yoy: "+6.8%",
    ytd: "96.4",
    ytdPy: "90.3",
    mtd: "12.1",
    mtdPy: "11.4",
  },
  {
    name: "Ch. weight",
    unit: "kt",
    yoy: "+14.1%",
    ytd: "22.6",
    ytdPy: "19.8",
    mtd: "4.1",
    mtdPy: "3.6",
  },
];

const CONTRACT: Row[] = [
  {
    name: "Revenue",
    unit: "$m",
    yoy: "+8.8%",
    ytd: "7.4",
    ytdPy: "6.8",
    mtd: "1.1",
    mtdPy: "0.9",
  },
  {
    name: "GP",
    unit: "$m",
    yoy: "-37.9%",
    ytd: "1.8",
    ytdPy: "2.9",
    mtd: "0.2",
    mtdPy: "0.4",
  },
];

const COUNTRIES: Row[] = [
  {
    name: "Brazil",
    yoy: "+21.0%",
    ytd: "9.8",
    ytdPy: "8.1",
    mtd: "1.6",
    mtdPy: "1.3",
  },
  {
    name: "Canada",
    yoy: "-6.7%",
    ytd: "4.2",
    ytdPy: "4.5",
    mtd: "0.7",
    mtdPy: "0.8",
  },
  {
    name: "Denmark",
    yoy: "+10.5%",
    ytd: "2.1",
    ytdPy: "1.9",
    mtd: "0.4",
    mtdPy: "0.3",
  },
  {
    name: "France",
    yoy: "+2.7%",
    ytd: "7.6",
    ytdPy: "7.4",
    mtd: "1.2",
    mtdPy: "1.3",
  },
  {
    name: "Japan",
    yoy: "+32.7%",
    ytd: "6.9",
    ytdPy: "5.2",
    mtd: "1.1",
    mtdPy: "0.8",
  },
  {
    name: "Mexico",
    yoy: "-10.0%",
    ytd: "5.4",
    ytdPy: "6.0",
    mtd: "0.9",
    mtdPy: "1.1",
  },
  {
    name: "Norway",
    yoy: "+18.2%",
    ytd: "1.3",
    ytdPy: "1.1",
    mtd: "0.2",
    mtdPy: "0.2",
  },
  {
    name: "Poland",
    yoy: "+26.1%",
    ytd: "8.7",
    ytdPy: "6.9",
    mtd: "1.5",
    mtdPy: "1.1",
  },
  {
    name: "Portugal",
    yoy: "-8.8%",
    ytd: "3.1",
    ytdPy: "3.4",
    mtd: "0.5",
    mtdPy: "0.6",
  },
  {
    name: "Sweden",
    yoy: "+15.3%",
    ytd: "9.8",
    ytdPy: "8.5",
    mtd: "1.6",
    mtdPy: "1.3",
  },
];

/** Green for growth, red for decline, muted for "no comparison". */
function yoyColor(v?: string) {
  if (!v) return "text-[#6f6a5f]";
  return v.startsWith("-") ? "text-[#b3261e]" : "text-[#1f6f43]";
}

const CELL = "px-3 py-2 text-right tabular-nums whitespace-nowrap";
/** The two YTD columns are the ones the reader actually scans first. */
const HILITE = "bg-[#eef2f0]";

function SectionHeader({ title, note }: { title: string; note?: string }) {
  return (
    <tr>
      <th
        colSpan={6}
        scope="colgroup"
        className="border-y border-[#e4e0d4] bg-[#faf7ef] px-3 py-2 text-left text-[13px] font-semibold text-[#1f1b16]"
      >
        {title}
        {note && (
          <span className="ml-2 text-[11px] font-normal text-[#8b8578]">
            {note}
          </span>
        )}
      </th>
    </tr>
  );
}

function DataRow({ row }: { row: Row }) {
  return (
    <tr className="border-b border-[#efece2] last:border-0">
      <th
        scope="row"
        className="px-3 py-2 text-left text-[13px] font-medium whitespace-nowrap text-[#3d382f]"
      >
        {row.name}
        {row.unit && (
          <span className="ml-1 text-[11px] font-normal text-[#8b8578]">
            {row.unit}
          </span>
        )}
      </th>
      <td className={`${CELL} ${HILITE} font-semibold ${yoyColor(row.yoy)}`}>
        {row.yoy ?? "—"}
      </td>
      <td className={`${CELL} ${HILITE} font-semibold text-[#1f1b16]`}>
        {row.ytd}
      </td>
      <td className={`${CELL} ${HILITE} text-[#6f6a5f]`}>{row.ytdPy}</td>
      <td className={`${CELL} text-[#1f1b16]`}>{row.mtd}</td>
      <td className={`${CELL} text-[#6f6a5f]`}>{row.mtdPy}</td>
    </tr>
  );
}

export function EmailReportPreview() {
  return (
    <figure className="my-8">
      <div className="overflow-hidden rounded-xl border border-[#e4e0d4] bg-white shadow-sm">
        <div className="border-b border-[#efece2] px-4 py-3">
          <p className="text-[11px] tracking-wide text-[#8b8578] uppercase">
            Subject — Group KPI, daily
          </p>
          <h3 className="mt-1 text-base font-bold text-[#1f1b16]">
            Northwind Logistics — executive overview
          </h3>
          <p className="mt-0.5 text-[11px] text-[#8b8578]">
            Generated 2026-08-02 · figures in the unit shown per row
          </p>
        </div>

        {/* Wide table on a phone: scroll the table, never the page. */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <caption className="sr-only">
              Group revenue, gross profit, volume and gross profit by country —
              year to date and month to date against the prior year.
            </caption>
            <thead>
              <tr className="text-[11px] font-semibold tracking-wide text-[#8b8578] uppercase">
                <th scope="col" className="px-3 py-2 text-left"></th>
                <th
                  scope="col"
                  className={`px-3 py-2 text-right ${HILITE} whitespace-nowrap`}
                >
                  YoY %
                </th>
                <th
                  scope="col"
                  className={`px-3 py-2 text-right ${HILITE} whitespace-nowrap`}
                >
                  YTD
                </th>
                <th
                  scope="col"
                  className={`px-3 py-2 text-right ${HILITE} whitespace-nowrap`}
                >
                  YTD PY
                </th>
                <th
                  scope="col"
                  className="px-3 py-2 text-right whitespace-nowrap"
                >
                  MTD
                </th>
                <th
                  scope="col"
                  className="px-3 py-2 text-right whitespace-nowrap"
                >
                  MTD PY
                </th>
              </tr>
            </thead>
            <tbody>
              <SectionHeader
                title="Group indicators"
                note="excl. intercompany and contract logistics"
              />
              {GROUP.map((r) => (
                <DataRow key={r.name} row={r} />
              ))}

              <SectionHeader title="Contract logistics" />
              {CONTRACT.map((r) => (
                <DataRow key={`cl-${r.name}`} row={r} />
              ))}

              <SectionHeader
                title="GP by country"
                note="$m, excl. contract logistics"
              />
              {COUNTRIES.map((r) => (
                <DataRow key={r.name} row={r} />
              ))}
            </tbody>
          </table>
        </div>

        {/*
          The escape hatch. Depicted, not clickable — this is a picture of an
          email, so a live <a> here would be a dead end for the reader.
        */}
        <div className="border-t border-[#efece2] px-4 py-3">
          <span className="inline-block rounded-md bg-[#4f46e5] px-3 py-2 text-[13px] font-semibold text-white">
            Open the full report →
          </span>
          <p className="mt-2 text-[11px] text-[#8b8578]">
            Drill by country, month, trade lane — opens the Power BI report this
            email was built from.
          </p>
        </div>

        <div className="border-t border-[#efece2] px-4 py-3 text-[11px] leading-relaxed text-[#8b8578]">
          <div>
            YTD 2026-01-01 → 2026-07-31 · YTD PY 2025-01-01 → 2025-07-31
          </div>
          <div>
            MTD 2026-07-01 → 2026-07-31 · MTD PY 2025-07-01 → 2025-07-31
          </div>
        </div>
      </div>
      <figcaption className="text-muted-foreground mt-3 text-sm">
        The whole deliverable: one email, no attachment, no login — and one
        button out to the full report for anyone who wants to dig. Figures and
        countries here are invented; the layout is the real one.
      </figcaption>
    </figure>
  );
}
