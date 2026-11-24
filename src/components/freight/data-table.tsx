"use client";

import { useMemo, useRef, useState } from "react";
import { totals } from "@/lib/freight/engine";
import type { Cell, Column, Table } from "@/lib/freight/engine";
import { money2, num1 } from "@/lib/freight/format";
import s from "./freight.module.css";

// A scrolling table that renders only the rows in view (a flat table runs to tens of thousands of rows), with a
// sticky header and a Total row. Click a header to sort; click a shipment id to open its details.

const ROW = 34;
const OVERSCAN = 8;

function width(c: Column): number {
  if (c.key === "client" || c.key.endsWith("Port")) return 250;
  if (c.key === "serial") return 140;
  if (c.kind === "money") return 170;
  if (c.kind === "num") return 110;
  if (c.kind === "date") return 120;
  return 160;
}

function show(c: Column, v: Cell): string {
  if (v === null) return "";
  if (typeof v === "number")
    return c.kind === "money"
      ? money2(v)
      : c.key === "shipments"
        ? v.toLocaleString("en-US")
        : num1(v);
  return v;
}

function compare(a: Cell, b: Cell): number {
  if (a === null) return b === null ? 0 : 1;
  if (b === null) return -1;
  return typeof a === "number" && typeof b === "number"
    ? a - b
    : String(a).localeCompare(String(b));
}

export function DataTable({
  table,
  onSerial,
}: {
  table: Table;
  onSerial?: (serial: string) => void;
}) {
  const [sort, setSort] = useState<{ col: number; dir: 1 | -1 } | null>(null);
  const [top, setTop] = useState(0);
  const [height, setHeight] = useState(600);
  const box = useRef<HTMLDivElement>(null);

  const order = useMemo(() => {
    const idx = table.rows.map((_, i) => i);
    if (sort)
      idx.sort(
        (a, b) =>
          sort.dir *
          compare(table.rows[a]![sort.col]!, table.rows[b]![sort.col]!),
      );
    return idx;
  }, [table, sort]);
  const sum = useMemo(() => totals(table), [table]);

  const first = Math.max(0, Math.floor(top / ROW) - OVERSCAN);
  const last = Math.min(
    order.length,
    Math.ceil((top + height) / ROW) + OVERSCAN,
  );
  const serialCol = table.columns.findIndex((c) => c.key === "serial");
  const cols = table.columns;

  return (
    <div
      ref={box}
      className={s.tableBox}
      onScroll={(e) => {
        setTop(e.currentTarget.scrollTop);
        setHeight(e.currentTarget.clientHeight);
      }}
    >
      <table
        className={s.table}
        style={{ width: cols.reduce((w, c) => w + width(c), 0) }}
      >
        <colgroup>
          {cols.map((c) => (
            <col key={c.key} style={{ width: width(c) }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {cols.map((c, j) => (
              <th
                key={c.key}
                className={
                  c.kind === "money" || c.kind === "num" ? s.right : undefined
                }
              >
                <button
                  type="button"
                  onClick={() =>
                    setSort((o) =>
                      o?.col === j
                        ? o.dir === 1
                          ? { col: j, dir: -1 }
                          : null
                        : { col: j, dir: 1 },
                    )
                  }
                >
                  {c.label}
                  {sort?.col === j ? (sort.dir === 1 ? " ▲" : " ▼") : ""}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {first > 0 && <tr style={{ height: first * ROW }} aria-hidden />}
          {order.slice(first, last).map((i) => {
            const row = table.rows[i]!;
            return (
              <tr key={i} style={{ height: ROW }}>
                {cols.map((c, j) => (
                  <td
                    key={c.key}
                    className={
                      c.kind === "money" || c.kind === "num"
                        ? s.right
                        : undefined
                    }
                  >
                    {j === serialCol && onSerial && table.serials ? (
                      <button
                        type="button"
                        className={s.serial}
                        onClick={() => onSerial(table.serials![i]!)}
                      >
                        {show(c, row[j]!)}
                      </button>
                    ) : (
                      show(c, row[j]!)
                    )}
                  </td>
                ))}
              </tr>
            );
          })}
          {last < order.length && (
            <tr style={{ height: (order.length - last) * ROW }} aria-hidden />
          )}
          {order.length === 0 && (
            <tr>
              <td colSpan={cols.length} className={s.empty}>
                No rows for this selection.
              </td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr>
            {cols.map((c, j) => (
              <td
                key={c.key}
                className={
                  c.kind === "money" || c.kind === "num" ? s.right : undefined
                }
              >
                {j === 0
                  ? `Total · ${order.length.toLocaleString("en-US")} rows`
                  : show(c, sum[j]!)}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
