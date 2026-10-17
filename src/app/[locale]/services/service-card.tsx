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
            "text-2xl font-semibold tracking-tight",
            "text-foreground",
            feature && "lg:text-5xl",
          )}
        >
          {/* Same blurred orange highlight as the blog and showcase titles,
              hugging the title text. On the maroon card its transparent end
              would leave dark text on maroon, so there it turns cream within
              the first 15% (before the text starts) — the text stays dark and
              readable along the whole bar, and the bar still fades in.
              Inline, because the module's unlayered rule beats any utility. */}
          <span className="relative inline-block">
            <span
              aria-hidden="true"
              className={styles.titleBar}
              style={
                feature
                  ? {
                      background:
                        "linear-gradient(to right, transparent, var(--color-cream) 15%, rgba(var(--accent-rgb), 0.9))",
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
