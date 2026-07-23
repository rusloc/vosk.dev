import type { ReactNode } from "react";
import styles from "../blog/title-bar.module.css";
import { ConditionsButton, type Conditions } from "./conditions-button";

/**
 * One service tier, presented as a card and used as a carousel slide. Fills its
 * container height so slides (and the three columns) stay equal. `flex-1` on the
 * description lets the card stretch: the title stays at the top and the price
 * pins to the bottom. The title text is left-aligned, and its soft-orange
 * highlight (same fill as blog-post titles) spans the full card width. The price
 * uses the primary accent, matching the home hero. A conditions button sits in
 * the bottom-right corner. When the card is a carousel slide, the `nav` slot
 * holds the centered prev/next arrows, rendered in a divided footer at the very
 * bottom of the card.
 */
export type ServiceCardProps = {
  title: string;
  desc: string;
  price: string;
  unit: string;
  conditions: Conditions;
  nav?: ReactNode;
};

export function ServiceCard({
  title,
  desc,
  price,
  unit,
  conditions,
  nav,
}: ServiceCardProps) {
  return (
    <div className="border-border flex h-full flex-col rounded-2xl border bg-white p-6">
      <h3 className="relative text-xl font-semibold tracking-tight">
        <span aria-hidden="true" className={styles.titleBar} />
        <span className="text-foreground relative block text-left">
          {title}
        </span>
      </h3>

      <p className="text-muted-foreground mt-3 flex-1 text-sm leading-relaxed">
        {desc}
      </p>

      <div className="border-border mt-4 flex items-end justify-between border-t pt-4">
        <div className="flex items-baseline gap-2">
          <span className="text-primary text-3xl font-bold tracking-tight">
            {price}
          </span>
          <span className="text-muted-foreground text-xs">{unit}</span>
        </div>
        <ConditionsButton {...conditions} />
      </div>

      {nav && (
        <div className="border-border mt-4 flex justify-center border-t pt-4">
          {nav}
        </div>
      )}
    </div>
  );
}
