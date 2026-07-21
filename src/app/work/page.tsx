import type { Metadata } from "next";
import { Container } from "@/components/container";
import { buildMetadata } from "@/lib/metadata";
import { showcases } from "@/lib/work";
import { ShowcaseCard } from "./showcase-card";

export const metadata: Metadata = buildMetadata({
  title: "Showcase",
  description:
    "Client dashboards written up as case studies — each with the story and a live Power BI or Apache Superset report you can explore.",
  path: "/work",
});

export default function WorkPage() {
  return (
    <Container className="py-16 sm:py-24">
      <h1 className="text-3xl font-semibold tracking-tight">Showcase</h1>
      <p className="text-muted-foreground mt-4 max-w-2xl">
        Real client dashboards, written up as short case studies. Open any one for
        the story and the live report — filter and drill down exactly as the client
        does. Built in{" "}
        <strong className="text-foreground font-medium">Power BI</strong> and{" "}
        <strong className="text-foreground font-medium">Apache Superset</strong>.
      </p>

      {showcases.length === 0 ? (
        <p className="text-muted-foreground mt-12">Case studies coming soon.</p>
      ) : (
        <ul className="mt-12 space-y-6">
          {showcases.map((showcase) => (
            <li key={showcase.slug}>
              <ShowcaseCard showcase={showcase} />
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
