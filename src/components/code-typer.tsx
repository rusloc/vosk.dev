"use client";

import { useEffect, useState } from "react";
import styles from "./code-typer.module.css";

// Fun snippets — each takes a human concept and wraps it in an IT/coding package.
// 2–3 per language (Python / SQL / DAX), interleaved, then looped forever.
const SAMPLES = [
  `def help_me(data, clean) -> str:
    clean_data = data.process().clean().load()
    clean == True
    return clean_data`,

  `select trust, revenue
from clients
where delivered = 'on_time'
  and quality > expectations
group by relationship;`,

  `Insight =
CALCULATE(
    SUM( Data[Value] ),
    FILTER( Reality, Reality[Noise] = FALSE )
)`,

  `def make_it_work(idea: Idea) -> Product:
    while not idea.shipped:
        idea = idea.iterate().test().deploy()
    return idea.to_product()`,

  `with good_decisions as (
    select metric, value
    from raw_data
    where confusion is null
)
select clarity
from good_decisions
order by impact desc;`,

  `Momentum =
VAR Progress = DIVIDE( [Shipped], [Planned] )
RETURN
    IF( Progress >= 1, "shipped", Progress )`,

  `class DataAnalyst:
    def solve(self, chaos):
        signal = chaos.filter(noise).groupby("what_matters")
        return signal.tell_a_story()`,

  `update roadmap
set status = 'shipped'
where blockers = 0
  and coffee_level > 9000;`,

  `Trust% =
DIVIDE(
    [Promises Kept],
    [Promises Made],
    "building..."
)`,
];

const TYPE_MS = 45; // per character
const HOLD_MS = 1800; // pause on a completed snippet
const GAP_MS = 500; // pause before the next snippet

export function CodeTyper() {
  const [text, setText] = useState("");

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
    <div className={styles.wrap} aria-hidden="true">
      <pre className={styles.code}>
        {text}
        <span className={styles.caret} />
      </pre>
    </div>
  );
}
