import { cn } from "@/lib/cn";
import styles from "../blog/title-bar.module.css";

/**
 * One service tier — the part of a card that slides. The card frame, the group
 * eyebrow, the badge and the controls stay put in ServiceCarousel; only this
 * moves. Fills the slide's height so the price pins to the bottom.
 *
 * `feature` is the subscription card: cream on maroon, and on desktop the price
 * moves to the right of the description at display size, the way the big card
 * has room for. Everywhere else the price sits under the description.
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
        feature && "lg:flex-row lg:items-end lg:justify-between lg:gap-10",
      )}
    >
      <div className={cn(feature && "lg:max-w-md lg:self-start")}>
        <h3
          className={cn(
            "pl-[0.6em] text-2xl font-semibold tracking-tight",
            "text-foreground",
            feature && "lg:text-5xl",
          )}
        >
          {/* Same blurred orange highlight as the blog and showcase titles,
              hugging the title text. The bar overhangs the text by 0.6em on
              each side (title-bar.module.css); the heading is indented by that
              much, so the bar starts on the card's content column — flush with
              the eyebrow and the description — instead of running into the
              slide's clip.

              On the maroon card the bar's transparent end is maroon, and dark
              text on maroon is unreadable, so there the fade is over within the
              overhang (0.4em, plus the blur) and the text sits on the solid
              orange: 6.7:1 against the foreground, ≥5:1 under the first glyph.
              Inline, because the module's unlayered rule beats any utility. */}
          <span className="relative inline-block">
            <span
              aria-hidden="true"
              className={styles.titleBar}
              style={
                feature
                  ? {
                      background:
                        "linear-gradient(to right, transparent, rgba(var(--accent-rgb), 0.9) 0.4em)",
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
              ? "text-cream/75 lg:mt-4 lg:text-base"
              : "text-muted-foreground",
          )}
        >
          {desc}
        </p>
      </div>

      <div
        className={cn(
          "mt-auto flex items-baseline gap-2 pt-4",
          feature && "lg:shrink-0 lg:flex-col lg:items-end lg:gap-1 lg:pt-0",
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
