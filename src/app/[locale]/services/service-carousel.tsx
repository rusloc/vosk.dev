"use client";

import {
  useRef,
  useState,
  type PointerEvent,
  type TransitionEvent,
} from "react";
import { cn } from "@/lib/cn";
import { type Conditions } from "./conditions-button";
import { ServiceCard } from "./service-card";
import { Icon } from "./service-icons";

/**
 * One service column: a numbered heading above a single-slide carousel. This
 * component owns the index, the sliding track, and swipe, and builds each
 * ServiceCard from `tiers`. One `>` control sits in the card's top-left corner,
 * level with the title, but outside the sliding track so it stays in one fixed
 * place; there are no dots and no way back — the carousel only moves forward,
 * and endlessly.
 *
 * Endless: the first tier is cloned after the last. Sliding onto the clone looks
 * like wrapping to the start; once that slide lands, the track snaps back to the
 * real first tier with the transition off, so the jump can't be seen.
 *
 * The eyebrow is desktop-only — on mobile ServiceGroups shows one carousel at a
 * time and its pill row already names the group.
 */
export function ServiceCarousel({
  number,
  label,
  tiers,
  conditions,
  nextAria,
  className,
}: {
  number: number;
  label: string;
  tiers: { name: string; desc: string; price: string; unit: string }[];
  conditions: Conditions;
  nextAria: string;
  className?: string;
}) {
  const slides = [...tiers, ...tiers.slice(0, 1)];
  const [index, setIndex] = useState(0);
  const [animate, setAnimate] = useState(true);

  const next = () => {
    // On the clone the snap-back is still pending; one more step would run off
    // the end of the track.
    if (index === tiers.length) return;
    setAnimate(true);
    setIndex(index + 1);
  };

  // Children's transitions (the conditions button's colour) bubble up here too.
  const onTransitionEnd = (e: TransitionEvent) => {
    if (e.target !== e.currentTarget || index !== tiers.length) return;
    setAnimate(false);
    setIndex(0);
  };

  // Pointer drag → swipe left to advance. 40px threshold, same as the design mock.
  const startX = useRef(0);
  const onDown = (e: PointerEvent) => {
    startX.current = e.clientX;
  };
  const onUp = (e: PointerEvent) => {
    if (e.clientX - startX.current < -40) next();
  };

  return (
    <div
      className={cn("flex min-w-0 flex-1 flex-col", className)}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") next();
      }}
    >
      {/* Heading eyebrow: "N · Label". The arrow lives in the card's top-left corner. */}
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
          className={cn(
            "flex h-full",
            animate && "transition-transform duration-500 ease-out",
          )}
          style={{ transform: `translateX(-${index * 100}%)` }}
          onTransitionEnd={onTransitionEnd}
        >
          {slides.map((tier, i) => (
            <div
              key={i}
              className="h-full w-full shrink-0 basis-full"
              // The clone is a visual stand-in: keep its duplicate heading and
              // button out of the accessibility tree and the tab order.
              aria-hidden={i === tiers.length || undefined}
              inert={i === tiers.length}
            >
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

        {/* Stationary arrow over the card — a sibling of the track, so it
            doesn't ride it. `top-7 left-6` is the card's 1px border + p-6, with
            the 20px button centred on the title's 28px line. The title is
            right-aligned, so the left end of its row is free. The pulse is the
            footer's "available" ping, slowed to one blink every 2s. */}
        <button
          type="button"
          aria-label={nextAria}
          onClick={next}
          className="bg-foreground text-background absolute top-7 left-6 z-10 inline-flex h-5 w-5 cursor-pointer items-center justify-center rounded-full transition-opacity hover:opacity-90"
        >
          <span
            aria-hidden="true"
            className="bg-foreground motion-safe:animate-blink absolute inset-0 rounded-full opacity-75"
          />
          <Icon name="chevron-right" className="relative h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
