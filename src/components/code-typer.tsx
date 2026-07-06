"use client";

import { useEffect, useState } from "react";
import styles from "./code-typer.module.css";

// Fun snippets — each wraps a human idea in an IT/coding package.
// 3 per language (Python / SQL / DAX), interleaved, then looped forever.
// Constraints: 7–9 lines each, ≤28 columns wide (indent = 4 spaces).
const SAMPLES = [
  // — Python —
  `def save_money(data):
    clean = (
        data
        .dropna()
        .simplify()
    )
    roi = clean.value()
    return roi > cost`,

  // — SQL —
  `select
    trust,
    revenue
from clients
where delivered
  and quality
    > promises
group by trust;`,

  // — DAX —
  `Insight =
CALCULATE(
    SUM( Data[Value] ),
    FILTER(
        Reality,
        Reality[Noise]
            = FALSE
    )
)`,

  // — Python —
  `def make_it_work(idea):
    while not idea.done:
        idea = (
            idea
            .test()
            .deploy()
        )
    return idea.ship()`,

  // — SQL —
  `with clarity as (
    select metric,
           value
    from raw_data
    where confusion
        is null
)
select clarity
from clarity;`,

  // — DAX —
  `Momentum =
VAR Progress =
    DIVIDE(
        [Shipped],
        [Planned]
    )
RETURN
    IF( Progress
        >= 1, "yes" )`,

  // — Python —
  `class Analyst:
    def solve(self, mess):
        signal = (
            mess
            .filter(noise)
            .groupby("key")
        )
        return signal.tell()`,

  // — SQL —
  `update roadmap
set status =
    'shipped'
where blockers = 0
  and coffee > 9000
  and doubt is null
  and tests = 'pass'
returning status;`,

  // — DAX —
  `Trust% =
VAR Kept = [Kept]
VAR Made = [Made]
RETURN
    DIVIDE(
        Kept,
        Made,
        "soon..."
    )`,
];

const TYPE_MS = 45; // per character
const HOLD_MS = 1800; // pause on a completed snippet
const GAP_MS = 500; // pause before the next snippet

export function CodeTyper() {
  const [text, setText] = useState("");
  // Index of the snippet currently running in the background.
  const [sampleIdx, setSampleIdx] = useState(0);
  // Snippet index the popup is looping, or null when closed.
  const [popupIdx, setPopupIdx] = useState<number | null>(null);

  useEffect(() => {
    // Honor reduced-motion: show one static snippet, no typing loop.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const t = setTimeout(() => setText(SAMPLES[0] ?? ""), 0);
      return () => clearTimeout(t);
    }

    let sample = 0;
    let char = 0;
    let clearing = false;
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      const current = SAMPLES[sample] ?? "";

      if (clearing) {
        clearing = false;
        char = 0;
        sample = (sample + 1) % SAMPLES.length;
        setSampleIdx(sample);
        setText("");
        timer = setTimeout(tick, GAP_MS);
        return;
      }

      char += 1;
      setText(current.slice(0, char));

      if (char >= current.length) {
        clearing = true;
        timer = setTimeout(tick, HOLD_MS); // hold the finished snippet
        return;
      }

      timer = setTimeout(tick, TYPE_MS);
    };

    timer = setTimeout(tick, GAP_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <div className={styles.wrap} aria-hidden="true">
        <pre className={styles.code}>
          {text}
          <span className={styles.caret} />
        </pre>
      </div>

      {/* Desktop-only invisible hit area over the code region — click to open
          a clear, looping view of the running snippet. No visual affordance. */}
      <button
        type="button"
        aria-label="Show the code clearly"
        className={styles.hit}
        onClick={() => setPopupIdx(sampleIdx)}
      />

      {popupIdx !== null && (
        <CodePopup
          snippet={SAMPLES[popupIdx] ?? ""}
          onClose={() => setPopupIdx(null)}
        />
      )}
    </>
  );
}

// Clear (unblurred), fixed-size popup that types out one snippet and loops it
// forever. Closes on backdrop click or Escape.
function CodePopup({
  snippet,
  onClose,
}: {
  snippet: string;
  onClose: () => void;
}) {
  const [text, setText] = useState("");

  useEffect(() => {
    let char = 0;
    let clearing = false;
    let timer: ReturnType<typeof setTimeout>;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      timer = setTimeout(() => setText(snippet), 0);
      return () => clearTimeout(timer);
    }

    const tick = () => {
      if (clearing) {
        clearing = false;
        char = 0;
        setText("");
        timer = setTimeout(tick, GAP_MS);
        return;
      }

      char += 1;
      setText(snippet.slice(0, char));

      if (char >= snippet.length) {
        clearing = true;
        timer = setTimeout(tick, HOLD_MS);
        return;
      }

      timer = setTimeout(tick, TYPE_MS);
    };

    timer = setTimeout(tick, GAP_MS);
    return () => clearTimeout(timer);
  }, [snippet]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <pre className={styles.dialogCode}>
          {text}
          <span className={styles.caret} />
        </pre>
      </div>
    </div>
  );
}
