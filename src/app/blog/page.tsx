import type { Metadata } from "next";
import { Container } from "@/components/container";
import { buildMetadata } from "@/lib/metadata";
import { getAllPosts } from "@/lib/content";
import { BlogList } from "./blog-list";

export const metadata: Metadata = buildMetadata({
  title: "Blog",
  description: "Notes on BI, analytics, and data engineering.",
  path: "/blog",
});

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <Container className="py-16 sm:py-24">
      <h1 className="text-3xl font-semibold tracking-tight">Blog</h1>

      {posts.length === 0 ? (
        <p className="text-muted-foreground mt-12">Articles coming soon.</p>
      ) : (
        <BlogList posts={posts} />
      )}
    </Container>
  );
}
