import type { CSSProperties } from "react";
import type { EntityView } from "@/lib/pnl/engine/types";

// Design guide §2 company identity: only these three values swap with the company switch (L-10).
export const COMPANY_THEME: Record<
  EntityView,
  { acc: string; accRgb: string; accT: string; keyRule: string; sub: string }
> = {
  P: {
    acc: "#2453A6",
    accRgb: "36, 83, 166",
    accT: "#E8EEF8",
    keyRule: "#B9C8E4",
    sub: "Goods - retail, D2C, marketplaces",
  },
  S: {
    acc: "#6B48C8",
    accRgb: "107, 72, 200",
    accT: "#F0EBFB",
    keyRule: "#CFC2F0",
    sub: "E-commerce SaaS services",
  },
  GROUP: {
    acc: "#3B4A5E",
    accRgb: "59, 74, 94",
    accT: "#EAEDF1",
    keyRule: "#C5CCD5",
    sub: "Consolidated",
  },
};

export function themeVars(entity: EntityView): CSSProperties {
  const t = COMPANY_THEME[entity];
  return {
    "--acc": t.acc,
    "--acc-rgb": t.accRgb, // the Ask AI glow (chat/ask-ai.module.css .pnl)
    "--acc-t": t.accT,
    "--key-rule": t.keyRule,
  } as CSSProperties;
}
