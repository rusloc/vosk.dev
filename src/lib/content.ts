import "server-only";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import readingTime from "reading-time";
import { z } from "zod";

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
    tags: z.array(z.string()).default([]),
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
