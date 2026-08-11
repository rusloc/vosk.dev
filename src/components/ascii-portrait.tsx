"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import styles from "./ascii-portrait.module.css";

/** Total reveal time. The art is thousands of characters, so the reveal is
 *  batched per animation frame rather than per character — a per-character
 *  timer at any readable interval would take minutes (the trap the 07-22 spec
 *  called out when this was still planned for the home page). */
const TYPE_MS = 2000;

/**
 * Decorative ASCII portrait that types itself in on load.
 *
 * Sequential, not random: the reveal is a single `slice()` of the art string,
 * so it falls out as line-by-line for free and costs one substring per frame.
 * Purely decorative — `aria-hidden`, no hover, no click.
 */
export function AsciiPortrait({ art }: { art: string }) {
  const [count, setCount] = useState(0);

  const { rows, charScale } = useMemo(() => {
    const lines = art.split("\n");
    const cols = lines.reduce((max, line) => Math.max(max, line.length), 0);
    // The CSS divides the container width by this to get a font-size that
    // makes `cols` characters span the band exactly. 0.6 is the monospace
    // advance width and must match CHAR_ASPECT in the generator script.
    return { rows: lines.length, charScale: cols * 0.6 };
  }, [art]);

  useEffect(() => {
    let raf = 0;
    let start = 0;

    // Reduced motion: the finished art, no reveal. Deferred to a frame rather
    // than set inline, because a synchronous setState in an effect body is a
    // cascading render (and a lint error).
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      raf = requestAnimationFrame(() => setCount(art.length));
      return () => cancelAnimationFrame(raf);
    }

    const step = (now: number) => {
      if (!start) start = now;
      const progress = Math.min((now - start) / TYPE_MS, 1);
      setCount(Math.ceil(progress * art.length));
      if (progress < 1) raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [art]);

  return (
    <div
      className={styles.wrap}
      style={{ "--rows": rows, "--char-scale": charScale } as CSSProperties}
      aria-hidden="true"
    >
      <pre className={styles.art}>{art.slice(0, count)}</pre>
    </div>
  );
}
