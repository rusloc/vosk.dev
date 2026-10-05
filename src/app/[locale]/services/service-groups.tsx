"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { type Conditions } from "./conditions-button";
import { GROUP_WIDTH } from "./group-width";
import { ServiceCarousel } from "./service-carousel";

const PILL =
  "cursor-pointer rounded-full border px-1.5 py-1.5 text-center text-[10px] font-semibold tracking-[0.04em] whitespace-nowrap uppercase transition-colors sm:px-3 sm:text-xs sm:tracking-[0.12em]";
const PILL_ON = "bg-foreground text-background border-foreground";
const PILL_OFF =
  "border-border text-muted-foreground hover:text-foreground bg-white";

export type ServiceGroup = {
  eyebrow: string;
  badge?: string;
  tiers: { name: string; desc: string; price: string; unit: string }[];
  servicesTitle?: string;
  services?: readonly string[];
};

/**
 * The three engagement models. On desktop the first (subscription) is the
 * featured card — big, maroon, spanning two rows with its "every plan includes"
 * list — and the other two stack beside it. Mobile shows a pill row instead and
 * reveals a single card at a time — three stacked cards don't fit a phone
 * screen, and the pills double as the labels the eyebrows carry on desktop.
 *
 * The carousels are rendered once and hidden with `hidden lg:flex` rather than
 * duplicated into a mobile-only tree, so there's one copy of the nine tier
 * headings in the DOM and each group keeps its slide position across pills.
 */
export function ServiceGroups({
  groups,
  conditions,
  nextAria,
}: {
  groups: ServiceGroup[];
  conditions: Conditions;
  nextAria: string;
}) {
  const [active, setActive] = useState(0);

  return (
    <>
      {/* Mobile-only group switcher. Plain toggle buttons, not tabs: on desktop
          every group is visible at once, so tab semantics would be a lie.

          A 3-column grid, so the row spans the carousel's full width and each
          pill is one equal third regardless of label length. The type steps down
          below `sm` because "SUBSCRIPTION" at the eyebrow's 12px/0.12em needs
          ~107px and a third of a 360px phone is 104px — it would wrap. */}
      <div className={cn(GROUP_WIDTH, "mt-5 grid grid-cols-3 gap-2 lg:hidden")}>
        {groups.map((g, i) => (
          <button
            key={i}
            type="button"
            aria-pressed={i === active}
            onClick={() => setActive(i)}
            className={cn(PILL, i === active ? PILL_ON : PILL_OFF)}
          >
            {g.eyebrow}
          </button>
        ))}
      </div>

      {/* GROUP_WIDTH keeps the square cards sane between `sm` and `lg`, where
          one card still spans the whole column: a tablet would otherwise render
          an ~850px box. Phones are narrower than the cap, so it never touches
          them, and `lg` drops it for the grid. Two equal rows, so the stacked
          cards split the featured card's height between them. */}
      <div
        className={cn(
          GROUP_WIDTH,
          "mt-4 flex flex-col lg:mt-8 lg:grid lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] lg:grid-rows-2 lg:gap-6",
        )}
      >
        {groups.map((g, i) => (
          <ServiceCarousel
            key={i}
            number={i + 1}
            label={g.eyebrow}
            badge={g.badge}
            tiers={g.tiers}
            includes={
              g.servicesTitle && g.services
                ? { title: g.servicesTitle, items: g.services }
                : undefined
            }
            feature={i === 0}
            conditions={conditions}
            nextAria={nextAria}
            className={cn(
              i === active ? undefined : "hidden lg:flex",
              i === 0 && "lg:row-span-2",
            )}
          />
        ))}
      </div>
    </>
  );
}
