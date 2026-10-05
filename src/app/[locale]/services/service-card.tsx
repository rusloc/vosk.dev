import { cn } from "@/lib/cn";
import styles from "../blog/title-bar.module.css";
import card from "./service-card.module.css";
import { ConditionsButton, type Conditions } from "./conditions-button";

/**
 * One service tier, presented as a card and used as a carousel slide. Fills its
 * container height so slides (and the three columns) stay equal. `flex-1` on the
 * description lets the card stretch: the title stays at the top and the price
 * pins to the bottom. The title text is right-aligned, and its soft-orange
 * highlight (same fill as blog-post titles) spans the full card width. The card
 * fades from moon-gray to dark red (service-card.module.css), so the price sits
 * in moonlight cream on the dark footer. A conditions button sits in
 * the bottom-right corner. The carousel's prev/next arrows overlay the card's
 * top-left corner but belong to the carousel, not to this component.
 */
export type ServiceCardProps = {
  title: string;
  desc: string;
  price: string;
  unit: string;
  conditions: Conditions;
};

export function ServiceCard({
  title,
  desc,
  price,
  unit,
  conditions,
}: ServiceCardProps) {
  return (
    <div
      className={cn(card.card, "flex h-full flex-col rounded-2xl border p-6")}
    >
      <h3 className="relative text-xl font-semibold tracking-tight">
        <span aria-hidden="true" className={styles.titleBar} />
        <span className="text-foreground relative block text-right">
          {title}
        </span>
      </h3>

      <p className="mt-3 flex-1 text-sm leading-relaxed text-(--moon-ink)">
        {desc}
      </p>

      <div className="mt-4 flex items-end justify-between border-t border-(--moonlight)/15 pt-4">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold tracking-tight text-(--moonlight)">
            {price}
          </span>
          <span className="text-xs text-(--moonlight)/60">{unit}</span>
        </div>
        <ConditionsButton {...conditions} />
      </div>
    </div>
  );
}
