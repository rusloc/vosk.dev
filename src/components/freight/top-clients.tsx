"use client";

import {
  MONEY,
  MONEY_TITLE,
  VOLUME,
  VOLUME_TITLE,
  topN,
} from "@/lib/freight/engine";
import type {
  Bar,
  ClientTotals,
  MoneyKey,
  VolumeKey,
} from "@/lib/freight/engine";
import { chartValue } from "@/lib/freight/format";
import s from "./freight.module.css";

// Top N clients: one chart by money, one by volume (Power BI's two cards). A bar click cross-filters the page to that
// client; the KPI tiles and the other chart follow.

function Chart<K extends string>({
  title,
  options,
  value,
  onPick,
  bars,
  money,
  tone,
  onClient,
}: {
  title: string;
  options: Record<K, string>;
  value: K;
  onPick: (k: K) => void;
  bars: Bar[];
  money: boolean;
  tone: "orange" | "navy";
  onClient: (client: string) => void;
}) {
  const max = bars[0]?.value ?? 0;
  return (
    <section className={s.chartCard}>
      <div className={s.segment} role="group" aria-label="Measure">
        {(Object.keys(options) as K[]).map((k) => (
          <button
            key={k}
            type="button"
            aria-pressed={k === value}
            onClick={() => onPick(k)}
          >
            {options[k]}
          </button>
        ))}
      </div>
      <h3 className={s.chartTitle}>{title}</h3>
      {bars.length === 0 ? (
        <p className={s.empty}>No clients for this selection.</p>
      ) : (
        <ol className={s.bars}>
          {bars.map((b) => (
            <li key={b.client}>
              <button
                type="button"
                onClick={() => onClient(b.client)}
                title={`Filter the page to ${b.client}`}
              >
                <span className={s.barLabel}>{b.client}</span>
                <span className={s.barTrack}>
                  <span
                    className={tone === "orange" ? s.barOrange : s.barNavy}
                    style={{
                      width: `${max > 0 ? Math.max(1, (b.value / max) * 100) : 0}%`,
                    }}
                  />
                  <span className={s.barValue}>
                    {chartValue(b.value, max, money)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export function TopClients({
  totals,
  n,
  money,
  volume,
  onMoney,
  onVolume,
  onClient,
}: {
  totals: Map<string, ClientTotals>;
  n: number;
  money: MoneyKey;
  volume: VolumeKey;
  onMoney: (k: MoneyKey) => void;
  onVolume: (k: VolumeKey) => void;
  onClient: (client: string) => void;
}) {
  return (
    <div className={s.charts}>
      <Chart
        title={`Top ${n} clients by ${MONEY_TITLE[money]}`}
        options={MONEY}
        value={money}
        onPick={onMoney}
        bars={topN(totals, money, n)}
        money
        tone="orange"
        onClient={onClient}
      />
      <Chart
        title={`Top ${n} clients by ${VOLUME_TITLE[volume]}`}
        options={VOLUME}
        value={volume}
        onPick={onVolume}
        bars={topN(totals, volume, n)}
        money={false}
        tone="navy"
        onClient={onClient}
      />
    </div>
  );
}
