import { describe, expect, it } from "vitest";
import { SOURCE_MAX, sourceFromUrl } from "./lead-source";
import { leadSourceSchema } from "./schema";

describe("sourceFromUrl", () => {
  it("keeps the path and the known tags, never the rest of the query", () => {
    const url = new URL(
      "https://vosk.dev/services/power-bi-consulting?utm_source=google&utm_medium=cpc&utm_campaign=uae-test&utm_term=power+bi+consultant&gclid=abc&email=a%40b.c",
    );
    expect(sourceFromUrl(url)).toEqual({
      landing_path: "/services/power-bi-consulting",
      utm_source: "google",
      utm_medium: "cpc",
      utm_campaign: "uae-test",
      utm_term: "power bi consultant",
      gclid: "abc",
    });
  });

  it("caps each value and skips empty tags", () => {
    const url = new URL(
      `https://vosk.dev/?utm_source=${"a".repeat(300)}&utm_medium=`,
    );
    const s = sourceFromUrl(url);
    expect(s.utm_source).toHaveLength(SOURCE_MAX);
    expect(s).not.toHaveProperty("utm_medium");
  });
});

describe("leadSourceSchema", () => {
  it("caps values, strips unknown keys and never fails", () => {
    const out = leadSourceSchema.parse({
      utm_term: ` ${"t".repeat(250)} `,
      utm_source: 42,
      utm_medium: "",
      extra: "dropped",
    });
    expect(out.utm_term).toHaveLength(SOURCE_MAX);
    expect(out.utm_source).toBeUndefined();
    expect(out.utm_medium).toBeUndefined();
    expect(out).not.toHaveProperty("extra");
  });
});
