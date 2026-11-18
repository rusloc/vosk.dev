import { cn } from "@/lib/cn";
import { ConditionsButton, type Conditions } from "./conditions-button";
import { ServiceCard } from "./service-card";
import { Icon } from "./service-icons";

export type ServiceGroup = {
  eyebrow: string;
  badge?: string;
  tiers: { name: string; desc: string; price: string; unit: string }[];
  servicesTitle?: string;
  services?: readonly string[];
};

/**
 * The three engagement models, every plan visible at once (SEO spec T-07, 11-18): the old one-slide carousels showed
 * one plan per group until the visitor clicked "Next", and cloned the first plan in the DOM. Server-rendered, one
 * copy of each plan heading. The subscription is the featured block, cream on maroon, its plans in a row and the
 * "available in every plan" list under them; project and other sit side by side below it.
 */
export function ServiceGroups({
  groups,
  conditions,
}: {
  groups: ServiceGroup[];
  conditions: Conditions;
}) {
  const [featured, ...rest] = groups;
  if (!featured) return null;

  return (
    <div className="mt-6 flex flex-col gap-6 lg:mt-8">
      <section className="bg-maroon overflow-hidden rounded-2xl p-6 lg:p-9">
        <GroupHead
          number={1}
          group={featured}
          conditions={conditions}
          feature
        />
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {featured.tiers.map((tier) => (
            <div
              key={tier.name}
              className="border-cream/15 overflow-hidden rounded-xl border p-6"
            >
              <ServiceCard
                {...tier}
                title={tier.name}
                feature
                titleBleed="-mx-6 px-6"
              />
            </div>
          ))}
        </div>
        {featured.servicesTitle && featured.services && (
          <div className="border-cream/15 mt-7 border-t pt-7">
            <h3 className="text-cream/80 text-xs font-semibold tracking-[0.14em] uppercase">
              {featured.servicesTitle}
            </h3>
            <ul className="mt-4 grid gap-x-6 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {featured.services.map((s) => (
                <li
                  key={s}
                  className="text-cream/85 flex items-start gap-2.5 text-sm"
                >
                  <Icon
                    name="check"
                    className="text-accent mt-0.5 h-4 w-4 shrink-0"
                  />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {rest.map((g, i) => (
          <section
            key={g.eyebrow}
            className="border-border overflow-hidden rounded-2xl border bg-white p-6 lg:p-7"
          >
            <GroupHead number={i + 2} group={g} conditions={conditions} />
            <div className="divide-border mt-2 divide-y">
              {g.tiers.map((tier) => (
                <div key={tier.name} className="py-5 last:pb-0">
                  <ServiceCard
                    {...tier}
                    title={tier.name}
                    titleBleed="-mx-6 px-6 lg:-mx-7 lg:px-7"
                  />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function GroupHead({
  number,
  group,
  conditions,
  feature = false,
}: {
  number: number;
  group: ServiceGroup;
  conditions: Conditions;
  feature?: boolean;
}) {
  return (
    <div className="flex min-h-8 items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <h2
          className={cn(
            "text-xs font-semibold tracking-[0.14em] whitespace-nowrap uppercase",
            feature ? "text-accent" : "text-maroon-soft",
          )}
        >
          {number} · {group.eyebrow}
        </h2>
        {group.badge && (
          <span
            className={cn(
              "truncate rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
              feature
                ? "border-cream/30 text-cream/90"
                : "border-accent/50 bg-accent/10 text-maroon-soft",
            )}
          >
            {group.badge}
          </span>
        )}
      </div>
      <ConditionsButton
        {...conditions}
        className={
          feature
            ? "text-cream/55 hover:text-cream"
            : "text-muted-foreground hover:text-foreground"
        }
      />
    </div>
  );
}
