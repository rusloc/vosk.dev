"use client";

import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

/**
 * A fixed-size dashboard board (1440 × 810, the size the Mirelo and Nordmark reports were designed and checked at)
 * that scales down to the width it gets. The popup is near full-screen, so on a wide window the board renders at
 * its own size and on a laptop it shrinks to fit, instead of scrolling sideways.
 *
 * The scale is a CSS transform, which also makes the board the containing block of every `position: fixed`
 * element inside it (Nordmark's side bar, pop-ups and tooltip), so they stay inside the popup rather than
 * anchoring to the browser window. Code that positions from `getBoundingClientRect()` reads the scale through
 * {@link useBoardScale} and divides.
 */
const ScaleContext = createContext(1);

export const useBoardScale = () => useContext(ScaleContext);

export function ReportBoard({
  width = 1440,
  height = 810,
  className,
  children,
}: {
  width?: number;
  height?: number;
  className?: string;
  children: ReactNode;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const el = host.current;
    if (!el) return;
    const fit = () => setScale(Math.min(1, el.clientWidth / width));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [width]);

  // The host fills the popup (its ground colour continues below a board shorter than the popup) and is at least
  // the board's scaled height; at full size the board sits centred in a wider popup.
  return (
    <div
      ref={host}
      className={className}
      style={{ height: height * scale, minHeight: "100%" }}
    >
      <ScaleContext.Provider value={scale}>
        <div
          style={{
            width,
            height,
            margin: "0 auto",
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          {children}
        </div>
      </ScaleContext.Provider>
    </div>
  );
}
