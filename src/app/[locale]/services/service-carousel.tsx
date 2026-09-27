"use client";

import { useRef, useState, type PointerEvent } from "react";
import { cn } from "@/lib/cn";
import { type Conditions } from "./conditions-button";
import { ServiceCard } from "./service-card";
import { Icon } from "./service-icons";

/**
 * One service column: a numbered heading above a single-slide carousel. This
 * component owns the index, the sliding track, and drag/swipe, and builds each
 * ServiceCard from `tiers`. The prev/next `<` / `>` controls sit in the card's
 * top-left corner, level with the title, but outside the sliding track so they
 * stay in one fixed place; there are no dots.
 *
 * The eyebrow is desktop-only — on mobile ServiceGroups shows one carousel at a
 * time and its pill row already names the group.
 */
export function ServiceCarousel({
  number,
  label,
  tiers,
  conditions,
  prevAria,
  nextAria,
  className,
}: {
  number: number;
  label: string;
  tiers: { name: string; desc: string; price: string; unit: string }[];
  conditions: Conditions;
  prevAria: string;
  nextAria: string;
  className?: string;
}) {
  const [index, setIndex] = useState(0);
  const last = tiers.length - 1;
  const clamp = (i: number) => Math.max(0, Math.min(last, i));
  const go = (i: number) => setIndex(clamp(i));

  // Pointer drag → swipe. 40px threshold, same as the design mock.
  const startX = useRef(0);
  const onDown = (e: PointerEvent) => {
    startX.current = e.clientX;
  };
  const onUp = (e: PointerEvent) => {
    const dx = e.clientX - startX.current;
    if (dx > 40) go(index - 1);
    else if (dx < -40) go(index + 1);
  };

  const btn =
    "group bg-foreground text-background relative inline-flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-full transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-25";

  // The footer's "available" dot pulse, on whichever arrows still lead
  // somewhere — a pulsing disabled arrow would invite a click that does nothing.
  // Hidden, not unmounted, so every pulse on the page keeps one shared phase.
  const ping = (
    <span
      aria-hidden="true"
      className="bg-foreground absolute inset-0 rounded-full opacity-75 group-disabled:invisible motion-safe:animate-ping"
    />
  );

  return (
    <div
      className={cn("flex min-w-0 flex-1 flex-col", className)}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") go(index - 1);
        if (e.key === "ArrowRight") go(index + 1);
      }}
    >
      {/* Heading eyebrow: "N · Label". Arrows live in the card's top-left corner. */}
      <div className="mb-3 hidden items-center gap-3 lg:flex">
        <span className="text-foreground text-xs font-semibold tracking-[0.12em] uppercase">
          {number} · {label}
        </span>
      </div>

      <div
        // Square at every width, so the card's height is a function of the
        // column width alone and never of the tier's description length. No
        // `flex-1`: growing to fill the parent would override the ratio. The
        // width cap that keeps this from becoming an 850px box on a tablet
        // lives in ServiceGroups, on the row.
        className="relative aspect-square touch-pan-y overflow-hidden rounded-2xl"
        onPointerDown={onDown}
        onPointerUp={onUp}
      >
        <div
          className="flex h-full transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {tiers.map((tier, i) => (
            <div key={i} className="h-full w-full shrink-0 basis-full">
              <ServiceCard
                title={tier.name}
                desc={tier.desc}
                price={tier.price}
                unit={tier.unit}
                conditions={conditions}
              />
            </div>
          ))}
        </div>

        {/* Stationary arrows over the card — a sibling of the track, so they
            don't ride it. `top-7 left-6` is the card's 1px border + p-6, with
            the 20px buttons centred on the title's 28px line. The title is
            right-aligned, so the left end of its row is free. */}
        <div className="absolute top-7 left-6 z-10 flex gap-1.5">
          <button
            type="button"
            aria-label={prevAria}
            onClick={() => go(index - 1)}
            disabled={index === 0}
            className={btn}
          >
            {ping}
            <Icon name="chevron-left" className="relative h-3 w-3" />
          </button>
          <button
            type="button"
            aria-label={nextAria}
            onClick={() => go(index + 1)}
            disabled={index === last}
            className={btn}
          >
            {ping}
            <Icon name="chevron-right" className="relative h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
