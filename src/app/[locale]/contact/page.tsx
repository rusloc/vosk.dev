import type { Metadata } from "next";
import { Container } from "@/components/container";
import { ContactForm } from "@/components/contact-form";
import { JsonLd } from "@/components/json-ld";
import { PageHeader } from "@/components/page-header";
import { buildMetadata } from "@/lib/metadata";
import { contactGraph } from "@/lib/structured-data";
import { ga } from "@/lib/analytics";
import { siteConfig } from "@/lib/site";
import { resolveLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const l = resolveLocale(locale);
  const t = getDictionary(l).contact;
  return buildMetadata({
    title: t.metaTitle,
    description: t.metaDescription,
    path: "/contact",
    locale: l,
  });
}

export default async function ContactPage({ params }: Props) {
  const { locale } = await params;
  const l = resolveLocale(locale);
  const dict = getDictionary(l);
  const t = dict.contact;

  return (
    <Container className="py-10 sm:py-12">
      <JsonLd
        data={contactGraph(l, {
          name: t.title,
          description: t.metaDescription,
        })}
      />

      <PageHeader title={t.title}>
        {t.intro}
        {siteConfig.replyTime && ` ${siteConfig.replyTime}`}
      </PageHeader>

      {/* Empty until the owner gives a booking link (SEO spec T-06): no link, no promise. */}
      {siteConfig.bookingUrl && (
        <a
          href={siteConfig.bookingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-primary text-primary-foreground mt-5 inline-flex rounded-md px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90"
          {...ga("booking_click", undefined, "contact")}
        >
          {t.bookCall}
        </a>
      )}

      {/* The contact details block (name, email, profiles, DP-600) moved to /about (owner, 11-20). */}
      <div className="mt-6 max-w-xl">
        <ContactForm locale={l} dict={dict} />
      </div>

      {/*
        The decorative ASCII portrait is HIDDEN for now — unmounted, not deleted.
        `components/ascii-portrait.tsx`, its CSS module, `lib/ascii-portrait-art.ts`
        and `scripts/portrait-to-ascii.py` are all still in the tree; restoring it
        is this block:

          <div className="mt-12 sm:mt-16">
            <AsciiPortrait art={PORTRAIT_CODE} />
          </div>

        plus the two imports at the top of this file. Swap PORTRAIT_CODE for
        PORTRAIT_BLOCKS (same module) to switch between the code-glyph and
        block-shading renderings — both are generated in one pass by the script,
        so no regenerate is needed. Note the art shipped is still the synthetic
        placeholder; the real source has never landed at
        article-src/service-page/portrait.png.
      */}
    </Container>
  );
}
