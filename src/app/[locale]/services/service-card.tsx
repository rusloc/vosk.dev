import { cn } from "@/lib/cn";
import styles from "../blog/title-bar.module.css";

/**
 * One service tier: title, description, price. Fills its cell's height so the price pins to the bottom.
 *
 * The title is right-aligned on every card, over a blurred orange bar that
 * starts at the card's left edge and stops 1rem short of its right edge (owner,
 * 11-06: it must not touch the edge): `titleBleed` is the cell's own negative
 * margin + padding, so the heading box is the card's full width and the text
 * still lines up with the content column.
 *
 * `feature` is a subscription plan: cream on maroon.
 */
export type ServiceCardProps = {
  title: string;
  desc: string;
  price: string;
  unit: string;
  feature?: boolean;
  titleBleed: string;
};

// Same orange as the blog bars, fading in from the card's own background
// (transparent) at its left edge. The text is right-aligned, so it always sits
// in the solid end: on the maroon card dark text on bare maroon is 1.3:1, and
// from 45% on the bar is ≥ 75% orange (≥ 5:1), wider than any title. The
// right end sits 1rem inside the card (padding is 24–36px, so still past the
// text) and is rounded, like the home and blog bars.
const BAR_STYLE = {
  inset: "-0.1em 1rem -0.1em 0",
  borderRadius: "0 8px 8px 0",
  background:
    "linear-gradient(to right, transparent, rgba(var(--accent-rgb), 0.75) 45%, rgba(var(--accent-rgb), 0.9))",
};

export function ServiceCard({
  title,
  desc,
  price,
  unit,
  feature,
  titleBleed,
}: ServiceCardProps) {
  return (
    <div className="flex h-full flex-col">
      <div>
        <h3
          className={cn(
            "text-foreground relative text-right text-2xl font-semibold tracking-tight",
            titleBleed,
          )}
        >
          {/* Inline, because the module's unlayered rule beats any utility. */}
          <span
            aria-hidden="true"
            className={styles.titleBar}
            style={BAR_STYLE}
          />
          <span className="relative">{title}</span>
        </h3>
        <p
          className={cn(
            "mt-3 text-sm leading-relaxed",
            feature ? "text-cream/75" : "text-muted-foreground",
          )}
        >
          {desc}
        </p>
      </div>

      <div className="mt-auto flex items-baseline gap-2 pt-4">
        <span
          className={cn(
            "text-3xl font-bold tracking-tight",
            feature ? "text-cream" : "text-foreground",
          )}
        >
          {price}
        </span>
        <span
          className={cn(
            "text-xs",
            feature ? "text-cream/60" : "text-muted-foreground",
          )}
        >
          {unit}
        </span>
      </div>
    </div>
  );
}
