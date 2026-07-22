import { Icon, type IconName } from "./service-icons";

/**
 * One service tier, presented as a card. Used standalone (the Urgent column) and
 * as a carousel slide (Subscription / Project). Fills its container height so
 * carousel slides stay equal. `priceAccent` renders the price in the amber
 * accent — used to set the subscription tiers apart, as in the design mock.
 */
export type ServiceCardProps = {
  icon: IconName;
  eyebrow?: string;
  title: string;
  badge?: string;
  desc: string;
  price: string;
  unit: string;
  priceAccent?: boolean;
};

export function ServiceCard({
  icon,
  eyebrow,
  title,
  badge,
  desc,
  price,
  unit,
  priceAccent = false,
}: ServiceCardProps) {
  return (
    <div className="border-border flex h-full flex-col rounded-2xl border bg-white p-7">
      <div className="bg-muted border-border text-foreground flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border">
        <Icon name={icon} className="h-6 w-6" />
      </div>

      {eyebrow && (
        <div className="text-muted-foreground mt-4 text-xs font-medium tracking-wider uppercase">
          {eyebrow}
        </div>
      )}

      <h3
        className={`text-foreground text-xl font-semibold tracking-tight ${eyebrow ? "mt-1" : "mt-4"}`}
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
