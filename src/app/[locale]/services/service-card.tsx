/**
 * One service tier, presented as a card and used as a carousel slide. Fills its
 * container height so slides (and the three columns) stay equal. `priceAccent`
 * renders the price in the amber accent — used to set the subscription tiers
 * apart. `flex-1` on the description lets the card stretch: the title stays at
 * the top and the price pins to the bottom.
 */
export type ServiceCardProps = {
  eyebrow?: string;
  title: string;
  badge?: string;
  desc: string;
  price: string;
  unit: string;
  priceAccent?: boolean;
};

export function ServiceCard({
  eyebrow,
  title,
  badge,
  desc,
  price,
  unit,
  priceAccent = false,
}: ServiceCardProps) {
  return (
    <div className="border-border flex h-full flex-col rounded-2xl border bg-white p-6">
      {eyebrow && (
        <div className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
          {eyebrow}
        </div>
      )}

      <h3
        className={`text-foreground text-xl font-semibold tracking-tight ${eyebrow ? "mt-1" : ""}`}
      >
        {title}
      </h3>

      {badge && (
        <span className="bg-muted border-border mt-2.5 inline-block w-fit rounded-full border px-3 py-1 text-xs font-semibold text-amber-800">
          {badge}
        </span>
      )}

      <p className="text-muted-foreground mt-3 flex-1 text-sm leading-relaxed">
        {desc}
      </p>

      <div className="border-border mt-4 flex items-baseline gap-2 border-t pt-4">
        <span
          className={`text-3xl font-bold tracking-tight ${priceAccent ? "text-[#c9791f]" : "text-foreground"}`}
        >
          {price}
        </span>
        <span className="text-muted-foreground text-xs">{unit}</span>
      </div>
    </div>
  );
}
