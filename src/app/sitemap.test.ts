import { describe, expect, it } from "vitest";
import sitemap from "./sitemap";
import {
  getAllTags,
  isTagIndexable,
  MIN_INDEXED_TAG_POSTS,
} from "@/lib/content";
import { getIndexableShowcases } from "@/lib/work";

const urls = () => sitemap().map((e) => new URL(e.url).pathname);

/** The sitemap lists no noindexed URL: thin tag pages (SEO spec T-13), /privacy (R-06), drafts. */
describe("sitemap", () => {
  it("leaves out tag pages with fewer than MIN_INDEXED_TAG_POSTS posts", () => {
    const listed = urls();
    for (const tag of getAllTags()) {
      expect(listed.includes(`/blog/tag/${tag.slug}`)).toBe(
        tag.count >= MIN_INDEXED_TAG_POSTS,
      );
      expect(isTagIndexable(tag)).toBe(tag.count >= MIN_INDEXED_TAG_POSTS);
    }
  });

  it("leaves out /privacy", () => {
    expect(urls()).not.toContain("/privacy");
  });

  it("dates each case study by its own `updated` (T-14)", () => {
    const byPath = new Map(
      sitemap().map((e) => [new URL(e.url).pathname, e.lastModified]),
    );
    for (const s of getIndexableShowcases()) {
      expect(byPath.get(`/work/${s.slug}`)).toEqual(new Date(s.updated));
    }
  });
});
