"use client";

import { useState } from "react";
import { type Conditions } from "./conditions-button";
import { ServiceCarousel } from "./service-carousel";

export type ServiceGroup = {
  eyebrow: string;
  tiers: { name: string; desc: string; price: string; unit: string }[];
};

/**
 * The three engagement models. Desktop keeps all three side by side, each with
 * its own "N · Label" eyebrow. Mobile shows a pill row instead and reveals a
 * single carousel at a time — three stacked carousels don't fit a phone screen,
 * and the pills double as the labels the eyebrows carry on desktop.
 *
 * The carousels are rendered once and hidden with `hidden lg:flex` rather than
 * duplicated into a mobile-only tree, so there's one copy of the nine tier
 * headings in the DOM and each group keeps its slide position across pills.
 */
export function ServiceGroups({
  groups,
  conditions,
  prevAria,
  nextAria,
}: {
  groups: ServiceGroup[];
  conditions: Conditions;
  prevAria: string;
  nextAria: string;
}) {
  const [active, setActive] = useState(0);

  return (
    <>
      {/* Mobile-only group switcher. Plain toggle buttons, not tabs: on desktop
          every group is visible at once, so tab semantics would be a lie. */}
      <div className="mt-5 flex flex-wrap gap-2 lg:hidden">
        {groups.map((g, i) => (
          <button
            key={i}
            type="button"
            aria-pressed={i === active}
            onClick={() => setActive(i)}
            className={
              i === active
                ? "bg-foreground text-background border-foreground cursor-pointer rounded-full border px-3 py-1.5 text-xs font-semibold tracking-[0.12em] uppercase"
                : "border-border text-muted-foreground hover:text-foreground cursor-pointer rounded-full border bg-white px-3 py-1.5 text-xs font-semibold tracking-[0.12em] uppercase transition-colors"
            }
          >
            {g.eyebrow}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-1 flex-col gap-6 lg:mt-6 lg:flex-row">
        {groups.map((g, i) => (
          <ServiceCarousel
            key={i}
            number={i + 1}
            label={g.eyebrow}
            tiers={g.tiers}
            conditions={conditions}
            prevAria={prevAria}
            nextAria={nextAria}
            className={i === active ? undefined : "hidden lg:flex"}
          />
        ))}
      </div>
    </>
  );
}
