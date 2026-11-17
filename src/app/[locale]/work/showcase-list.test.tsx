import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import { rememberPage } from "@/components/pagination";
import { ShowcaseList } from "./showcase-list";

// Back from a showcase on page 2 used to land on page 1: the page lived in plain
// `useState`, lost when the list unmounted. A fresh mount must open on the
// remembered page.
const cards = Array.from({ length: 7 }, (_, i) => (
  <span key={i}>card-{i}</span>
));
// the shown page is the one <ul> without `invisible`; the others stay in the HTML, stacked under it
const visible = (html: string) => {
  const shown = [...html.matchAll(/<ul[^>]*>(.*?)<\/ul>/g)].filter(
    (m) => !m[0].includes("invisible"),
  );
  expect(shown).toHaveLength(1);
  return [...(shown[0]?.[1] ?? "").matchAll(/card-(\d)/g)].map((m) =>
    Number(m[1]),
  );
};
const render = () =>
  renderToStaticMarkup(<ShowcaseList cards={cards} label="Pages" />);

describe("ShowcaseList page memory", () => {
  afterEach(() => rememberPage("work", 0));

  it("opens on page 1 when nothing is remembered", () => {
    expect(visible(render())).toEqual([0, 1, 2, 3]);
  });

  it("opens on the page the visitor left", () => {
    rememberPage("work", 1);
    expect(visible(render())).toEqual([4, 5, 6]);
    expect(render()).toMatch(/aria-current="page"[^>]*>2</);
  });

  it("keeps every page in the HTML and the page menu in one place (pages share one grid cell)", () => {
    const html = render();
    expect([...html.matchAll(/card-\d/g)]).toHaveLength(7);
    expect([...html.matchAll(/<ul[^>]*col-start-1 row-start-1/g)]).toHaveLength(
      2,
    );
    expect(html).toMatch(/aria-hidden="true" class="[^"]*invisible/);
  });

  it("clamps a remembered page that no longer exists", () => {
    rememberPage("work", 9);
    expect(visible(render())).toEqual([4, 5, 6]);
  });
});
