"use client";

import { useEffect, useRef, useState } from "react";
import s from "./landing-dock.module.css";

/**
 * The numbered section dock on the right. Plain anchors, so it works without JS; JS only moves the highlight to the
 * section that holds the middle of the screen (the design's rule).
 *
 * `darkFrom`: from that section on, the dock marks its header `data-dark` (the header's colour change where the
 * browser has no scroll-driven animations; the page's CSS draws it).
 */
export function LandingDock({
  sections,
  darkFrom,
}: {
  sections: readonly (readonly [id: string, label: string])[];
  darkFrom?: number;
}) {
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (darkFrom === undefined) return;
    ref.current
      ?.closest("header")
      ?.toggleAttribute("data-dark", active >= darkFrom);
  }, [active, darkFrom]);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const mid = window.innerHeight / 2;
      let a = 0;
      sections.forEach(([id], i) => {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top - mid <= 0) a = i;
      });
      setActive(a);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [sections]);

  return (
    <nav ref={ref} className={s.dock} aria-label="Sections">
      {sections.map(([id, label], i) => (
        <a
          key={id}
          href={`#${id}`}
          className={`${s.dk} ${i === active ? s.on : ""}`}
          aria-current={i === active ? "true" : undefined}
        >
          <span>{String(i + 1).padStart(2, "0")}</span>
          <span className={s.dkL}>{label}</span>
        </a>
      ))}
    </nav>
  );
}
