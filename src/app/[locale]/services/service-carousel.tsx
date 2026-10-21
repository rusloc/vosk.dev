"use client";

import {
  useRef,
  useState,
  type PointerEvent,
  type TransitionEvent,
} from "react";
import { cn } from "@/lib/cn";
import { ConditionsButton, type Conditions } from "./conditions-button";
import { ServiceCard } from "./service-card";
import { Icon } from "./service-icons";

/**
 * One engagement model as a card: a stationary top row (eyebrow, badge,
 * conditions, `>`) over a single-slide track of ServiceCards. Only the tiers
 * slide; everything that describes the whole group stays put. There are no dots
 * and no way back — the carousel only moves forward, and endlessly.
 *
 * Endless: the first tier is cloned after the last. Sliding onto the clone looks
 * like wrapping to the start; once that slide lands, the track snaps back to the
 * real first tier with the transition off, so the jump can't be seen.
 *
 * `feature` is the subscription card, and it carries the "every plan includes"
 * list. On desktop the card and the list share one maroon shell (this outer
 * element); on mobile the shell is transparent and they are two maroon boxes, so
 * the card can stay square like the other two. One list in the DOM either way.
 *
 * The eyebrow is desktop-only — on mobile ServiceGroups shows one card at a time
 * and its pill row already names the group.
 */
export function ServiceCarousel({
  number,
  label,
  badge,
  tiers,
  includes,
  feature = false,
  conditions,
  nextAria,
  className,
}: {
  number: number;
  label: string;
  badge?: string;
  tiers: { name: string; desc: string; price: string; unit: string }[];
  includes?: { title: string; items: readonly string[] };
  feature?: boolean;
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

  // Transitions inside the slides would bubble up here too.
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

  // The track window bleeds into the card's side padding so slides clip at the
  // card edge, not inside it; the slides put the padding back.
  const pad = feature ? "px-6 lg:px-9" : "px-6 lg:px-7";
  const bleed = feature ? "-mx-6 lg:-mx-9" : "-mx-6 lg:-mx-7";

  return (
    <section
      className={cn(
        "flex min-w-0 flex-col",
        feature && "lg:bg-maroon lg:rounded-2xl",
        className,
      )}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") next();
      }}
    >
      <div
        // Square on mobile, so the card's height depends on its width alone and
        // never on the tier's description length. On desktop the grid row sets
        // the height instead.
        className={cn(
          "flex aspect-square flex-col overflow-hidden rounded-2xl py-6 lg:aspect-auto lg:flex-1",
          pad,
          feature
            ? "bg-maroon lg:bg-transparent lg:pt-9 lg:pb-8"
            : "border-border border bg-white lg:py-7",
        )}
      >
        <div className="flex min-h-8 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className={cn(
                "hidden text-xs font-semibold tracking-[0.14em] whitespace-nowrap uppercase lg:block",
                feature ? "text-accent" : "text-maroon-soft",
              )}
            >
              {number} · {label}
            </span>
            {badge && (
              <span
                className={cn(
                  "truncate rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
                  feature
                    ? "border-cream/30 text-cream/90"
                    : "border-accent/50 bg-accent/10 text-maroon-soft",
                )}
              >
                {badge}
              </span>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <ConditionsButton
              {...conditions}
              className={
                feature
                  ? "text-cream/55 hover:text-cream"
                  : "text-muted-foreground hover:text-foreground"
              }
            />
            {/* The pulse is the footer's "available" ping, slowed to one blink
                every 2s. */}
            <button
              type="button"
              aria-label={nextAria}
              onClick={next}
              className={cn(
                "relative inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-full transition-opacity hover:opacity-90",
                feature
                  ? "bg-cream text-maroon"
                  : "bg-foreground text-background",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "motion-safe:animate-blink absolute inset-0 rounded-full opacity-75",
                  feature ? "bg-cream" : "bg-foreground",
                )}
              />
              <Icon name="chevron-right" className="relative h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div
          className={cn(
            "flex-1 touch-pan-y overflow-hidden",
            feature && "lg:mt-2",
            bleed,
          )}
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
                className={cn(
                  "h-full w-full shrink-0 basis-full overflow-hidden pt-5",
                  pad,
                )}
                // Clipped, so a title bar's blur can't peek in from the
                // neighbouring slide. The top padding (taken from the window's
                // margin, so the row keeps its height) is the room that same
                // blur needs above the slide's own title: the bar overhangs the
                // heading by 0.1em and blurs 7.5px past that, and the heading
                // is the first thing in the slide. The clone is a visual
                // stand-in: keep its duplicate heading out of the
                // accessibility tree.
                aria-hidden={i === tiers.length || undefined}
                inert={i === tiers.length}
              >
                <ServiceCard
                  title={tier.name}
                  desc={tier.desc}
                  price={tier.price}
                  unit={tier.unit}
                  feature={feature}
                  titleBleed={cn(bleed, pad)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {includes && (
        <div className="bg-maroon lg:border-cream/15 mt-4 rounded-2xl p-6 lg:mx-9 lg:mt-0 lg:rounded-none lg:border-t lg:bg-transparent lg:px-0 lg:pt-7 lg:pb-9">
          <h3 className="text-cream/80 text-xs font-semibold tracking-[0.14em] uppercase">
            {includes.title}
          </h3>
          <ul className="mt-4 grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
            {includes.items.map((s, i) => (
              <li
                key={i}
                className="text-cream/85 flex items-start gap-2.5 text-sm"
              >
                <Icon
                  name="check"
                  className="text-accent mt-0.5 h-4 w-4 shrink-0"
                />
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
