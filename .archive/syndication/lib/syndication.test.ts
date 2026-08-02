import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { devtoTags, toSyndicatedMarkdown } from "./items";
import { commentary, linkedin } from "./linkedin";
import { devto } from "./devto";
import { devtoTeaser, excerpt } from "./summary";
import {
  emptyManifest,
  isEmpty,
  isSyndicated,
  readManifest,
  record,
  writeManifest,
} from "./manifest";
import { pending } from "./run";
import type { SyndicationItem } from "./types";

/**
 * Covers the parts that decide what leaves the machine — the canonical URL, the
 * "already posted?" check, and MDX that can't be shipped as-is. The adapters'
 * network calls are not exercised here; they are one `fetch` each and the risk
 * lives in the payload, not the transport.
 */

const post: SyndicationItem = {
  id: "blog/example",
  kind: "blog",
  title: "A post",
  description: "What it is about.",
  url: "https://vosk.dev/blog/example",
  date: "2026-01-11",
  tags: ["sql", "code quality"],
  body: "Body text.",
};

const showcase: SyndicationItem = {
  id: "work/retail-sales",
  kind: "showcase",
  title: "Retail sales",
  description: "Revenue by region.",
  url: "https://vosk.dev/work/retail-sales",
  tags: ["power bi"],
};

const tmpFiles: string[] = [];
function tmpManifest(): string {
  const file = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), "syndication-")),
    "syndication.json",
  );
  tmpFiles.push(file);
  return file;
}

afterEach(() => {
  for (const f of tmpFiles.splice(0))
    fs.rmSync(path.dirname(f), { recursive: true, force: true });
});

describe("toSyndicatedMarkdown", () => {
  it("replaces a self-closing JSX block with a link to the original", () => {
    const out = toSyndicatedMarkdown(
      "Before\n\n<WorkflowDiagram />\n\nAfter",
      post.url,
    );
    expect(out).not.toContain("<WorkflowDiagram");
    expect(out).toContain(post.url);
    expect(out).toContain("Before");
    expect(out).toContain("After");
  });

  it("handles a multi-line JSX block with attributes", () => {
    const mdx = [
      "Intro",
      "",
      "<ReportEmbed",
      '  src="https://example.com"',
      '  title="X"',
      "/>",
      "",
      "Outro",
    ].join("\n");
    const out = toSyndicatedMarkdown(mdx, post.url);
    expect(out).not.toContain("<ReportEmbed");
    expect(out).not.toContain("src=");
    expect(out).toContain("Outro");
  });

  it("leaves prose containing angle brackets alone", () => {
    const mdx = "Use `a < b` and 1 <2 in the WHERE clause.";
    expect(toSyndicatedMarkdown(mdx, post.url)).toBe(mdx);
  });

  it("does not swallow content between two separate components", () => {
    const mdx = "<Foo />\n\nkeep me\n\n<Bar />";
    expect(toSyndicatedMarkdown(mdx, post.url)).toContain("keep me");
  });

  it("strips JSX from a CRLF checkout, where `$` would otherwise sit after \\r", () => {
    const out = toSyndicatedMarkdown(
      "Before\r\n\r\n<WorkflowDiagram />\r\n\r\nAfter",
      post.url,
    );
    expect(out).not.toContain("<WorkflowDiagram");
    expect(out).toContain("After");
  });
});

describe("devtoTags", () => {
  it("strips non-alphanumerics so multi-word tags survive", () => {
    expect(devtoTags(["power bi", "data modeling"])).toEqual([
      "powerbi",
      "datamodeling",
    ]);
  });

  it("caps at four, which is Forem's limit", () => {
    expect(devtoTags(["a", "b", "c", "d", "e"])).toHaveLength(4);
  });

  it("drops tags that reduce to nothing", () => {
    expect(devtoTags(["---", "sql"])).toEqual(["sql"]);
  });
});

describe("devto adapter", () => {
  it("always sets canonical_url back to vosk.dev", () => {
    expect(devto.preview(post)).toContain(`canonical_url: ${post.url}`);
  });

  it("declines showcases — they are not articles", () => {
    expect(devto.accepts(showcase)).toBe(false);
    expect(devto.accepts(post)).toBe(true);
  });

  it("declines a blog item whose body failed to load", () => {
    expect(devto.accepts({ ...post, body: undefined })).toBe(false);
  });
});

describe("excerpt", () => {
  it("returns empty for an item with no body, such as a showcase", () => {
    expect(excerpt(undefined, 400)).toBe("");
  });

  it("skips headings, code fences, quotes and images", () => {
    const md = [
      "# Heading",
      "",
      "```sql\nSELECT 1;\n```",
      "",
      "> quoted",
      "",
      "![alt](/img.png)",
      "",
      "Real prose here.",
    ].join("\n\n");
    expect(excerpt(md, 400)).toBe("Real prose here.");
  });

  it("unwraps links to their text and drops emphasis markers", () => {
    expect(
      excerpt("See the **docs** at [our site](https://x.dev) now.", 400),
    ).toBe("See the docs at our site now.");
  });

  it("stops on a sentence boundary rather than mid-clause", () => {
    const md = `${"A".repeat(60)}. ${"B".repeat(300)}.`;
    const out = excerpt(md, 100);
    expect(out.endsWith(".")).toBe(true);
    expect(out.length).toBeLessThanOrEqual(100);
  });

  it("ellipsises when no sentence boundary is reachable", () => {
    expect(excerpt("C".repeat(500), 100)).toMatch(/…$/);
  });

  it("splits paragraphs on a CRLF checkout, not just LF", () => {
    const md = "First para.\r\n\r\n## Heading\r\n\r\nSecond para.";
    expect(excerpt(md, 400)).toBe("First para.\n\nSecond para.");
  });

  it("drops a heading that has no blank line after it", () => {
    expect(excerpt("Intro text.\n\n## Heading\nBody text.", 400)).toBe(
      "Intro text.\n\nBody text.",
    );
  });

  it("removes fenced code even when it contains blank lines", () => {
    const md = "Intro.\n\n```sql\nselect 1\n\nfrom t\n```\n\nOutro.";
    const out = excerpt(md, 400);
    expect(out).not.toContain("select");
    expect(out).not.toContain("from t");
    expect(out).toBe("Intro.\n\nOutro.");
  });

  it("stops at a lead-in whose code block or list was stripped", () => {
    const md =
      "Real intro.\n\nHere's the sample:\n\n```sql\nselect 1\n```\n\nStray tail.";
    expect(excerpt(md, 900)).toBe("Real intro.");
  });

  it("keeps paragraphs separate rather than welding them into one blob", () => {
    expect(excerpt("One.\n\nTwo.", 400)).toBe("One.\n\nTwo.");
  });

  it("caps at three paragraphs even when the budget allows more", () => {
    const md = Array.from({ length: 10 }, (_, i) => `Para ${i}.`).join("\n\n");
    expect(excerpt(md, 9000).split("\n\n")).toHaveLength(3);
  });

  it("never exceeds the requested length", () => {
    const md = Array.from({ length: 20 }, () => "Sentence text here.").join(
      "\n\n",
    );
    expect(excerpt(md, 120).length).toBeLessThanOrEqual(120);
  });
});

describe("linkedin teaser", () => {
  it("leads with the title and hook, then a taste of the article", () => {
    const text = commentary({
      ...post,
      body: "The opening paragraph of prose.",
    });
    expect(text).toContain(post.title);
    expect(text).toContain(post.description);
    expect(text).toContain("The opening paragraph of prose.");
  });

  it("carries a CTA with the canonical link", () => {
    const text = commentary(post);
    expect(text).toContain("Read the full write-up");
    expect(text).toContain(post.url);
  });

  it("uses a dashboard CTA for showcases, which have no body", () => {
    const text = commentary(showcase);
    expect(text).toContain("See the live dashboard");
    expect(text).toContain(showcase.url);
  });

  it("emits hashtags with no spaces or stray hashes", () => {
    expect(commentary(post)).toContain("#codequality");
    expect(commentary(post)).not.toContain("# ");
  });

  it("stays within LinkedIn's 3000-character limit", () => {
    const text = commentary({ ...post, description: "x".repeat(5000) });
    expect(text.length).toBeLessThanOrEqual(3000);
  });

  it("never emits a run of blank lines", () => {
    expect(commentary(showcase)).not.toMatch(/\n\n\n/);
  });

  it("accepts showcases", () => {
    expect(linkedin.accepts(showcase)).toBe(true);
  });
});

describe("devto teaser", () => {
  it("is a teaser plus CTA, not the whole article", () => {
    const body = devtoTeaser({
      ...post,
      body: "Opening prose. " + "z".repeat(4000),
    });
    expect(body).toContain(post.description);
    expect(body).toContain(`](${post.url})`);
    expect(body.length).toBeLessThan(2000);
  });

  it("states where it was originally published", () => {
    expect(devtoTeaser(post)).toContain("Originally published");
  });
});

describe("manifest", () => {
  it("round-trips through disk", () => {
    const file = tmpManifest();
    const m = record(emptyManifest, post, "devto", {
      at: "2026-08-01T10:00:00.000Z",
      url: "https://dev.to/x",
    });
    writeManifest(m, file);
    expect(readManifest(file)).toEqual(m);
  });

  it("treats a missing file as empty rather than failing", () => {
    expect(
      isEmpty(readManifest(path.join(os.tmpdir(), "nope-does-not-exist.json"))),
    ).toBe(true);
  });

  it("throws on a corrupt manifest instead of re-posting everything", () => {
    const file = tmpManifest();
    fs.writeFileSync(file, '{"version": 2, "entries": {}}');
    expect(() => readManifest(file)).toThrow();
  });

  it("records one platform without marking the other as done", () => {
    const m = record(emptyManifest, post, "devto", {
      at: "2026-08-01T10:00:00.000Z",
    });
    expect(isSyndicated(m, post, "devto")).toBe(true);
    expect(isSyndicated(m, post, "linkedin")).toBe(false);
  });
});

describe("pending", () => {
  it("pairs each item with every adapter that accepts it", () => {
    const q = pending(emptyManifest, [post, showcase]);
    expect(q.map((p) => `${p.adapter.platform}:${p.item.id}`).sort()).toEqual([
      "devto:blog/example",
      "linkedin:blog/example",
      "linkedin:work/retail-sales",
    ]);
  });

  it("drops pairs already recorded, leaving the rest to retry", () => {
    const m = record(emptyManifest, post, "devto", {
      at: "2026-08-01T10:00:00.000Z",
    });
    const q = pending(m, [post]);
    expect(q.map((p) => p.adapter.platform)).toEqual(["linkedin"]);
  });
});
