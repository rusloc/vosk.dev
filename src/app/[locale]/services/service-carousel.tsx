"use client";

import { useRef, useState, type PointerEvent, type ReactNode } from "react";
import { Icon } from "./service-icons";

/**
 * One service column: a numbered heading with inline prev/next controls, above a
 * single-slide carousel. Slides are rendered on the server (ServiceCard) and
 * passed in as `slides`; this component owns the index, the sliding track, and
 * drag/swipe. The `<` / `>` buttons sit on the heading line, sized to the row's
 * text; there are no dots.
 */
export function ServiceCarousel({
  number,
  label,
  slides,
  prevAria,
  nextAria,
}: {
  number: number;
  label: string;
  slides: ReactNode[];
  prevAria: string;
  nextAria: string;
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

  const btn =
    "bg-foreground text-background inline-flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-full transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-25";

  return (
    <div
      className="flex min-h-[340px] flex-col"
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") go(index - 1);
        if (e.key === "ArrowRight") go(index + 1);
      }}
    >
      {/* Heading row: "N · Label" left, prev/next controls right. */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-foreground text-xs font-semibold tracking-[0.12em] uppercase">
          {number} · {label}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label={prevAria}
            onClick={() => go(index - 1)}
            disabled={index === 0}
            className={btn}
          >
            <Icon name="chevron-left" className="h-3 w-3" />
          </button>
          <button
            type="button"
            aria-label={nextAria}
            onClick={() => go(index + 1)}
            disabled={index === last}
            className={btn}
          >
            <Icon name="chevron-right" className="h-3 w-3" />
          </button>
        </div>
      </div>

      <div
        className="relative min-h-0 flex-1 touch-pan-y overflow-hidden rounded-2xl"
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
    </div>
  );
}
