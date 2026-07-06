import type { Metadata } from "next";
import { Container } from "@/components/container";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Services",
  description: "BI consulting, dashboard development, and data pipelines.",
  path: "/services",
});

export default function ServicesPage() {
  return (
    <Container className="py-24">
      <h1 className="text-3xl font-semibold tracking-tight">Services</h1>
      <p className="text-muted-foreground mt-4">Service details coming soon.</p>
    </Container>
  );
}
