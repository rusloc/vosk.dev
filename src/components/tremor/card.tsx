// Tremor Card [v1.0.0]
// Modified for vosk.dev: dark-mode variants removed, border colour -> border token

import React from "react";
import { Slot } from "@radix-ui/react-slot";

import { cx } from "./utils";

interface CardProps extends React.ComponentPropsWithoutRef<"div"> {
  asChild?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, asChild, ...props }, forwardedRef) => {
    const Component = asChild ? Slot : "div";
    return (
      <Component
        ref={forwardedRef}
        className={cx(
          // base
          "relative w-full rounded-lg border p-6 text-left shadow-xs",
          // background color
          "bg-white",
          // border color
          "border-border",
          className,
        )}
        tremor-id="tremor-raw"
        {...props}
      />
    );
  },
);

Card.displayName = "Card";

export { Card, type CardProps };
