import { cn } from "@/lib/cn";
import styles from "../blog/title-bar.module.css";

/**
 * One service tier — the part of a card that slides. The card frame, the group
 * eyebrow, the badge and the controls stay put in ServiceCarousel; only this
 * moves. Fills the slide's height so the price pins to the bottom.
 *
 * `feature` is the subscription card: cream on maroon, and on desktop the title
 * and the price move to the right of the description at display size, the
 * title right-aligned just above the price, the way the big card has room for.
 * Everywhere else the price sits under the description.
 */
export type ServiceCardProps = {
  title: string;
  desc: string;
  price: string;
  unit: string;
  feature?: boolean;
};

export function ServiceCard({
  title,
  desc,
  price,
  unit,
  feature,
}: ServiceCardProps) {
  return (
    <div
      className={cn(
        "flex h-full flex-col",
        // Desktop feature: a grid, description on the left, title over price
        // on the right. The wrapper below dissolves (`contents`) so the title
        // and the description can sit in different columns.
        feature &&
          "lg:grid lg:grid-cols-[minmax(0,28rem)_auto] lg:grid-rows-[1fr_auto] lg:justify-between lg:gap-x-10",
      )}
    >
      <div className={cn(feature && "lg:contents")}>
        <h3
          className={cn(
            "pl-[0.6em] text-2xl font-semibold tracking-tight",
            "text-foreground",
            feature &&
              "[--lead:0.6em] lg:col-start-2 lg:row-start-1 lg:self-end lg:pr-[0.6em] lg:pl-0 lg:text-right lg:text-5xl lg:[--lead:2em]",
          )}
        >
          {/* Same blurred orange highlight as the blog and showcase titles,
              hugging the title text. The bar overhangs the text by 0.6em on
              each side (title-bar.module.css); the heading is indented by that
              much, so the bar starts on the card's content column — flush with
              the eyebrow and the description — instead of running into the
              slide's clip. Right-aligned on the desktop feature card, the
              indent moves to the right, flush with the price.

              On the maroon card the bar's transparent end is maroon, and dark
              text on maroon is unreadable (1.3:1), so there the bar reaches
              further left (--lead: 0.6em, 2em on desktop where the right
              column has room) and the fade runs out before the text starts:
              the first glyph sits on 75% orange (5:1), the last on 90% (6.7:1).
              Inline, because the module's unlayered rule beats any utility. */}
          <span className="relative inline-block">
            <span
              aria-hidden="true"
              className={styles.titleBar}
              style={
                feature
                  ? {
                      left: "calc(-1 * var(--lead))",
                      background:
                        "linear-gradient(to right, transparent, rgba(var(--accent-rgb), 0.75) var(--lead), rgba(var(--accent-rgb), 0.9))",
                    }
                  : undefined
              }
            />
            <span className="relative">{title}</span>
          </span>
        </h3>
        <p
          className={cn(
            "mt-3 text-sm leading-relaxed",
            feature
              ? "text-cream/75 lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:mt-0 lg:self-end lg:text-base"
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
