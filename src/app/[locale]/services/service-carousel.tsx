"use client";

import { useRef, useState, type PointerEvent, type ReactNode } from "react";
import { Icon } from "./service-icons";

/**
 * Minimal slide carousel for the multi-tier service columns. Slides are rendered
 * on the server (ServiceCard) and passed in as `slides`; this component only owns
 * the index, the sliding track, drag/swipe, and the arrow + dot controls. One
 * slide visible at a time; height follows the tallest slide.
 */
export function ServiceCarousel({
  slides,
  prevAria,
  nextAria,
  goToAria,
}: {
  slides: ReactNode[];
  prevAria: string;
  nextAria: string;
  goToAria: string;
}) {
  const [index, setIndex] = useState(0);
  const last = slides.length - 1;
  const clamp = (i: number) => Math.max(0, Math.min(last, i));
  const go = (i: number) => setIndex(clamp(i));

  // Pointer drag → swipe. 40px threshold, same as the design mock.
  const startX = useRef(0);
  const onDown = (e: PointerEvent) => {
    startX.current = e.clientX;
  };
  const onUp = (e: PointerEvent) => {
    const dx = e.clientX - startX.current;
    if (dx > 40) go(index - 1);
    else if (dx < -40) go(index + 1);
  };

  return (
    <div
      className="flex min-h-0 flex-1 flex-col"
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") go(index - 1);
        if (e.key === "ArrowRight") go(index + 1);
      }}
    >
      <div
        className="border-border relative min-h-0 flex-1 touch-pan-y overflow-hidden rounded-2xl"
        onPointerDown={onDown}
        onPointerUp={onUp}
      >
        <div
          className="flex h-full transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {slides.map((slide, i) => (
            <div key={i} className="h-full w-full shrink-0 basis-full">
              {slide}
            </div>
          ))}
        </div>
      </div>

      {/* Controls: prev · dots · next */}
      <div className="mt-4 flex items-center justify-center gap-4">
        <button
          type="button"
          aria-label={prevAria}
          onClick={() => go(index - 1)}
          disabled={index === 0}
          className="bg-foreground text-background inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <Icon name="chevron-left" className="h-4.5 w-4.5" />
        </button>

        <div className="flex items-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`${goToAria} ${i + 1}`}
              aria-current={i === index}
              onClick={() => go(i)}
              className={`h-2 cursor-pointer rounded-full transition-all ${
                i === index
                  ? "bg-foreground w-6"
                  : "w-2 bg-[rgba(30,20,0,0.18)] hover:bg-[rgba(30,20,0,0.3)]"
              }`}
            />
          ))}
        </div>

        <button
          type="button"
          aria-label={nextAria}
          onClick={() => go(index + 1)}
          disabled={index === last}
          className="bg-foreground text-background inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <Icon name="chevron-right" className="h-4.5 w-4.5" />
        </button>
      </div>
    </div>
  );
}
