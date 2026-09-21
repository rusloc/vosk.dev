"use client";

import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
  type ChartConfiguration,
} from "chart.js";
import { useEffect, useRef } from "react";

// Only what the sales dashboard draws — `chart.js/auto` would register every controller,
// scale and plugin and roughly triple this chunk. No Legend: legends are HTML (real text,
// text tokens), not canvas.
Chart.register(
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
);

/**
 * The whole Chart.js ↔ React seam: create on mount, `update()` when the config changes,
 * destroy on unmount. Updating rather than recreating is what lets a filter change morph
 * the bars instead of replaying the entrance animation on all six charts.
 *
 * The parent must be positioned and have a height of its own — with
 * `maintainAspectRatio: false` the chart sizes itself to this wrapper. The wrapper is
 * `absolute` so the canvas never feeds back into the parent's height: a flex-sized parent
 * measuring a canvas that is measuring the parent is how a chart grows by itself forever.
 *
 * A canvas is opaque to assistive tech, so `label` is the accessible name and the
 * dashboard's table view is the full equivalent.
 */
export function ChartCanvas({
  config,
  label,
}: {
  config: ChartConfiguration;
  label: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const chart = chartRef.current;
    if (chart) {
      chart.data = config.data;
      chart.options = config.options ?? {};
      chart.update();
      return;
    }

    // Canvas text cannot resolve `var(--font-geist-sans)`; the computed family can.
    Chart.defaults.font.family = getComputedStyle(canvas).fontFamily;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      Chart.defaults.animation = false;
    }
    chartRef.current = new Chart(canvas, config);
  }, [config]);

  useEffect(
    () => () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    },
    [],
  );

  return (
    <div className="absolute inset-0">
      <canvas ref={canvasRef} role="img" aria-label={label} />
    </div>
  );
}
