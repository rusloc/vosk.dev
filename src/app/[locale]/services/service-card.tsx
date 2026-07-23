import styles from "../blog/title-bar.module.css";

/**
 * One service tier, presented as a card and used as a carousel slide. Fills its
 * container height so slides (and the three columns) stay equal. `flex-1` on the
 * description lets the card stretch: the title stays at the top and the price
 * pins to the bottom. The title carries the same soft-orange highlight as
 * blog-post titles; the price uses the primary accent, matching the home hero.
 */
export type ServiceCardProps = {
  eyebrow?: string;
  title: string;
  hours?: string;
  desc: string;
  price: string;
  unit: string;
};

export function ServiceCard({
  eyebrow,
  title,
  hours,
  desc,
  price,
  unit,
}: ServiceCardProps) {
  return (
    <div className="border-border flex h-full flex-col rounded-2xl border bg-white p-6">
      {eyebrow && (
        <div className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
          {eyebrow}
        </div>
      )}

      <h3
        className={`text-xl font-semibold tracking-tight ${eyebrow ? "mt-2" : ""}`}
      >
        <span className="relative inline-block">
          <span aria-hidden="true" className={styles.titleBar} />
          <span className="text-foreground relative">{title}</span>
        </span>
      </h3>

      {hours && (
        <div className="text-muted-foreground mt-2 text-xs font-medium">
          {hours}
        </div>
      )}

      <p className="text-muted-foreground mt-3 flex-1 text-sm leading-relaxed">
        {desc}
      </p>

      <div className="border-border mt-4 flex items-baseline gap-2 border-t pt-4">
        <span className="text-primary text-3xl font-bold tracking-tight">
          {price}
        </span>
        <span className="text-muted-foreground text-xs">{unit}</span>
      </div>
    </div>
  );
}
