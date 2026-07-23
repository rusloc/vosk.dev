"use client";

import { useRef, useState, type PointerEvent } from "react";
import { type Conditions } from "./conditions-button";
import { ServiceCard } from "./service-card";
import { Icon } from "./service-icons";

/**
 * One service column: a numbered heading above a single-slide carousel. This
 * component owns the index, the sliding track, and drag/swipe, and builds each
 * ServiceCard from `tiers`. The prev/next `<` / `>` controls sit centered at the
 * very bottom of each card (in its divided footer), not on the heading line;
 * there are no dots.
 */
export function ServiceCarousel({
  number,
  label,
  tiers,
  conditions,
  prevAria,
  nextAria,
}: {
  number: number;
  label: string;
  tiers: { name: string; desc: string; price: string; unit: string }[];
  conditions: Conditions;
  prevAria: string;
  nextAria: string;
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
    "bg-foreground text-background inline-flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-full transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-25";

  return (
    <div
      className="flex min-w-0 flex-1 flex-col"
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") go(index - 1);
        if (e.key === "ArrowRight") go(index + 1);
      }}
    >
      {/* Heading eyebrow: "N · Label". Arrows live in each card's footer. */}
      <div className="mb-3 flex items-center gap-3">
        <span className="text-foreground text-xs font-semibold tracking-[0.12em] uppercase">
          {number} · {label}
        </span>
      </div>

      <div
        className="relative min-h-[280px] flex-1 touch-pan-y overflow-hidden rounded-2xl"
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
                nav={
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      aria-label={prevAria}
                      onClick={() => go(i - 1)}
                      disabled={i === 0}
                      className={btn}
                    >
                      <Icon name="chevron-left" className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      aria-label={nextAria}
                      onClick={() => go(i + 1)}
                      disabled={i === last}
                      className={btn}
                    >
                      <Icon name="chevron-right" className="h-3 w-3" />
                    </button>
                  </div>
                }
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
