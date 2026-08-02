import "server-only";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import readingTime from "reading-time";
import { z } from "zod";
import { tagSlug } from "./tags";

/**
 * Single seam for reading/validating blog MDX. Pages/sitemap/feed consume this —
 * never the filesystem directly (keeps a future CMS swap cheap). Frontmatter is
 * validated with a strict Zod schema so bad/unknown fields fail the build loudly.
 */

const POSTS_DIR = path.join(process.cwd(), "content", "blog");

const frontmatterSchema = z
  .object({
    title: z.string().min(1),
    description: z.string().min(1),
    date: z.iso.date(), // "YYYY-MM-DD"
    // Lowercase words joined by single spaces or hyphens. Constrained so every
    // tag survives the round-trip through `tagSlug` and can address a
    // /blog/tag/<slug> page — anything else fails the build rather than
    // silently producing a tag with no reachable URL.
    tags: z
      .array(
        z
          .string()
          .regex(
            /^[a-z0-9]+(?:[ -][a-z0-9]+)*$/,
            "tags must be lowercase words separated by single spaces or hyphens",
          ),
      )
      .default([]),
    cover: z.string().optional(),
    draft: z.boolean().default(false),
  })
  .strict();

export type PostFrontmatter = z.infer<typeof frontmatterSchema>;

export type PostMeta = PostFrontmatter & {
  slug: string;
  readingTime: string;
};

export type Post = PostMeta & { content: string };

const isProd = process.env.NODE_ENV === "production";

function readPost(slug: string): Post {
  const raw = fs.readFileSync(path.join(POSTS_DIR, `${slug}.mdx`), "utf8");
  const { data, content } = matter(raw);
  // `.parse` throws on invalid/unknown frontmatter → build fails loudly, by design.
  const frontmatter = frontmatterSchema.parse(data);
  return {
    ...frontmatter,
    slug,
    readingTime: readingTime(content).text,
    content,
  };
}

function toMeta(post: Post): PostMeta {
  return {
    slug: post.slug,
    title: post.title,
    description: post.description,
    date: post.date,
    tags: post.tags,
    cover: post.cover,
    draft: post.draft,
    readingTime: post.readingTime,
  };
}

export function getPostSlugs(): string[] {
  if (!fs.existsSync(POSTS_DIR)) return [];
  return fs
    .readdirSync(POSTS_DIR)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => f.replace(/\.mdx$/, ""));
}

/** All posts, newest first, drafts hidden in production. Metadata only (no body). */
export function getAllPosts(): PostMeta[] {
  return getPostSlugs()
    .map(readPost)
    .filter((p) => !(isProd && p.draft))
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .map(toMeta);
}

/** One post with its MDX body, or null if missing / a draft in production. */
export function getPostBySlug(slug: string): Post | null {
  if (!getPostSlugs().includes(slug)) return null;
  const post = readPost(slug);
  if (isProd && post.draft) return null;
  return post;
}

export type TagSummary = { tag: string; slug: string; count: number };

/**
 * Every tag in use, most-used first then alphabetical. Derived from
 * {@link getAllPosts}, so a tag that only appears on a hidden draft doesn't mint
 * a page. Drives `generateStaticParams` for /blog/tag/[tag] and the sitemap.
 */
export function getAllTags(): TagSummary[] {
  const byslug = new Map<string, TagSummary>();

  for (const post of getAllPosts()) {
    for (const tag of post.tags) {
      const slug = tagSlug(tag);
      const seen = byslug.get(slug);
      if (seen) seen.count += 1;
      else byslug.set(slug, { tag, slug, count: 1 });
    }
  }

  return [...byslug.values()].sort(
    (a, b) => b.count - a.count || a.slug.localeCompare(b.slug),
  );
}

/** Posts carrying `slug`, newest first. Empty when the tag doesn't exist. */
export function getPostsByTag(slug: string): PostMeta[] {
  return getAllPosts().filter((p) => p.tags.some((t) => tagSlug(t) === slug));
}
