import type { Metadata } from "next";
import { Container } from "@/components/container";
import { buildMetadata } from "@/lib/metadata";
import { showcases } from "@/lib/work";
import { ShowcaseCard } from "./showcase-card";

export const metadata: Metadata = buildMetadata({
  title: "Showcase",
  description:
    "Live Power BI and Apache Superset dashboards built for clients — open any report and explore it interactively.",
  path: "/work",
});

export default function WorkPage() {
  return (
    <Container className="py-16 sm:py-24">
      <h1 className="text-3xl font-semibold tracking-tight">Showcase</h1>
      <p className="text-muted-foreground mt-4 max-w-2xl">
        Real client dashboards — live and interactive. Each preview is the actual
        report: open it full-screen to filter, drill down, and explore. Built in{" "}
        <strong className="text-foreground font-medium">Power BI</strong> and{" "}
        <strong className="text-foreground font-medium">Apache Superset</strong>.
      </p>

      {showcases.length === 0 ? (
        <p className="text-muted-foreground mt-12">Dashboards coming soon.</p>
      ) : (
        <div className="mt-12 space-y-10">
          {showcases.map((showcase) => (
            <ShowcaseCard key={showcase.slug} showcase={showcase} />
          ))}
        </div>
      )}
    </Container>
  );
}
