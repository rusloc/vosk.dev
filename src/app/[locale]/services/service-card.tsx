import { cn } from "@/lib/cn";
import styles from "../blog/title-bar.module.css";

/**
 * One service tier — the part of a card that slides. The card frame, the group
 * eyebrow, the badge and the controls stay put in ServiceCarousel; only this
 * moves. Fills the slide's height so the price pins to the bottom.
 *
 * The title is right-aligned on every card, over a blurred orange bar that
 * spans the card edge to edge: `titleBleed` is the slide's own negative margin
 * + padding, so the heading box is the card's full width and the text still
 * lines up with the content column.
 *
 * `feature` is the subscription card: cream on maroon. On desktop the title
 * runs across both columns at display size, with the description on the left
 * and the price on the right under it. Everywhere else the price sits under
 * the description.
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
// from 45% on the bar is ≥ 75% orange (≥ 5:1), wider than any title.
const BAR_STYLE = {
  inset: "-0.1em 0",
  borderRadius: 0,
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
    <div
      className={cn(
        "flex h-full flex-col",
        // Desktop feature: a grid, the title across both columns, then the
        // description on the left and the price on the right. The wrapper
        // below dissolves (`contents`) so all three are grid items.
        feature &&
          "lg:grid lg:grid-cols-[minmax(0,28rem)_auto] lg:grid-rows-[1fr_auto] lg:justify-between lg:gap-x-10",
      )}
    >
      <div className={cn(feature && "lg:contents")}>
        <h3
          className={cn(
            "text-foreground relative text-right text-2xl font-semibold tracking-tight",
            titleBleed,
            feature && "lg:col-span-2 lg:row-start-1 lg:self-end lg:text-5xl",
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
            feature
              ? "text-cream/75 lg:col-start-1 lg:row-start-2 lg:mt-0 lg:self-end lg:text-base"
              : "text-muted-foreground",
          )}
        >
          {desc}
        </p>
      </div>

      <div
        className={cn(
          "mt-auto flex items-baseline gap-2 pt-4",
          feature &&
            "lg:col-start-2 lg:row-start-2 lg:flex-col lg:items-end lg:gap-1 lg:pt-3",
        )}
      >
        <span
          className={cn(
            "text-3xl font-bold tracking-tight",
            feature ? "text-cream lg:text-6xl" : "text-foreground",
          )}
        >
          {price}
        </span>
        <span
          className={cn(
            "text-xs",
            feature ? "text-cream/60 lg:text-sm" : "text-muted-foreground",
          )}
        >
          {unit}
        </span>
      </div>
    </div>
  );
}
