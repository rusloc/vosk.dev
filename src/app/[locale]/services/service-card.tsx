import styles from "../blog/title-bar.module.css";
import { ConditionsButton, type Conditions } from "./conditions-button";

/**
 * One service tier, presented as a card and used as a carousel slide. Fills its
 * container height so slides (and the three columns) stay equal. `flex-1` on the
 * description lets the card stretch: the title stays at the top and the price
 * pins to the bottom. The title is right-aligned and carries the same
 * soft-orange highlight as blog-post titles; the price uses the primary accent,
 * matching the home hero. A conditions button sits in the bottom-right corner.
 */
export type ServiceCardProps = {
  title: string;
  hours?: string;
  desc: string;
  price: string;
  unit: string;
  conditions: Conditions;
};

export function ServiceCard({
  title,
  hours,
  desc,
  price,
  unit,
  conditions,
}: ServiceCardProps) {
  return (
    <div className="border-border flex h-full flex-col rounded-2xl border bg-white p-6">
      <h3 className="text-right text-xl font-semibold tracking-tight">
        <span className="relative inline-block">
          <span aria-hidden="true" className={styles.titleBar} />
          <span className="text-foreground relative">{title}</span>
        </span>
      </h3>

      {hours && (
        <div className="text-muted-foreground mt-2 text-right text-xs font-medium">
          {hours}
        </div>
      )}

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
    </div>
  );
}
