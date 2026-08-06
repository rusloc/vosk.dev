import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Title + intro for a top-level page. Extracted because the five pages using
 * this pattern had drifted into three different subtitle styles — `text-sm` vs
 * base, `max-w-xl` vs `max-w-2xl`. Sharing the markup makes that drift
 * impossible rather than merely corrected once.
 *
 * Renders a fragment, not a wrapper: every caller has the pair as direct
 * children of a flex column, and a wrapper would collapse them into one item.
 * `titleClassName` is for a caller's own offset (the tag page sits under an
 * eyebrow) — not for restyling the type.
 */
export function PageHeader({
  title,
  titleClassName,
  children,
}: {
  title: string;
  titleClassName?: string;
  children?: ReactNode;
}) {
  return (
    <>
      <h1
        className={cn("text-3xl font-semibold tracking-tight", titleClassName)}
      >
        {title}
      </h1>
      {children ? (
        <p className="text-muted-foreground mt-3 max-w-2xl">{children}</p>
      ) : null}
    </>
  );
}
