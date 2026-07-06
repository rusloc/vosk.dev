import type { Metadata } from "next";
import { Container } from "@/components/container";
import { ContactForm } from "@/components/contact-form";
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
      <p className="text-muted-foreground mt-4 max-w-xl">
        Have a project or a question? Send a message below and it lands straight
        in my inbox — or reach me directly.
      </p>

      <div className="mt-10 grid gap-12 md:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="max-w-xl">
          <ContactForm />
        </div>

        <dl className="md:border-border space-y-3 text-sm md:border-l md:pl-8">
          <div className="flex gap-2">
            <dt className="text-muted-foreground w-16">Email</dt>
            <dd>
              <a
                href={`mailto:${siteConfig.contactEmail}`}
                className="text-primary hover:underline"
              >
                {siteConfig.contactEmail}
              </a>
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-muted-foreground w-16">Phone</dt>
            <dd>
              <a
                href={`tel:${siteConfig.contactPhoneHref}`}
                className="text-primary hover:underline"
              >
                {siteConfig.contactPhone}
              </a>
            </dd>
          </div>
        </dl>
      </div>
    </Container>
  );
}
