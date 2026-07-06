import type { Metadata } from "next";
import { Container } from "@/components/container";
import { buildMetadata } from "@/lib/metadata";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = buildMetadata({
  title: "Contact",
  description: "Get in touch about a BI or analytics project.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <Container className="py-24">
      <h1 className="text-3xl font-semibold tracking-tight">Contact</h1>
      <p className="text-muted-foreground mt-4">
        A contact form is coming soon. In the meantime, email{" "}
        <a
          href={`mailto:${siteConfig.contactEmail}`}
          className="text-primary hover:underline"
        >
          {siteConfig.contactEmail}
        </a>
        .
      </p>
    </Container>
  );
}
