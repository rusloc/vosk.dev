import type { Metadata } from "next";
import { Container } from "@/components/container";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Work",
  description: "Selected BI and analytics case studies.",
  path: "/work",
});

export default function WorkPage() {
  return (
    <Container className="py-24">
      <h1 className="text-3xl font-semibold tracking-tight">Work</h1>
      <p className="text-muted-foreground mt-4">Case studies coming soon.</p>
    </Container>
  );
}
