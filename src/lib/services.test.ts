import { describe, expect, it } from "vitest";
import { en } from "./i18n/en";
import { getServiceLinks, services } from "./services";

/** The service pages registry (SEO spec T-04): the rules the spec sets on every entry. */
describe("services registry", () => {
  it("has unique slugs", () => {
    const slugs = services.map((s) => s.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it.each(services.map((s) => [s.slug, s] as const))(
    "%s follows the spec's shape",
    (_, s) => {
      expect(s.description.length).toBeGreaterThanOrEqual(140);
      expect(s.description.length).toBeLessThanOrEqual(160);
      // the layout adds " | Kirill Vosk" (14 characters); the whole title stays within 60
      expect(s.title.length + 14).toBeLessThanOrEqual(60);
      expect(s.audience.split(/\s+/).length).toBeLessThanOrEqual(100);
      expect(s.faq).toHaveLength(5);
      expect(s.steps.length).toBeGreaterThanOrEqual(3);
      expect(s.steps.length).toBeLessThanOrEqual(4);
      expect(s.postSlugs.length).toBeGreaterThanOrEqual(2);
      expect(s.postSlugs.length).toBeLessThanOrEqual(3);
      expect(new Set(s.caseSlugs).size).toBe(2);
    },
  );

  it("links only case studies and posts that exist and are shown", () => {
    for (const s of services) expect(() => getServiceLinks(s)).not.toThrow();
  });

  it("types no price: every $ amount in an entry is a dictionary price", () => {
    const prices = new Set(
      [
        en.services.subscription,
        en.services.project,
        en.services.other,
      ].flatMap((g) => g.tiers.map((t) => t.price)),
    );
    for (const s of services) {
      for (const amount of JSON.stringify(s).match(/\$[\d,.k–-]+/g) ?? []) {
        expect(prices).toContain(amount);
      }
    }
  });

  it("titles and descriptions are unique", () => {
    expect(new Set(services.map((s) => s.title)).size).toBe(services.length);
    expect(new Set(services.map((s) => s.description)).size).toBe(
      services.length,
    );
  });
});
