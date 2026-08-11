import type { Metadata } from "next";
import { AsciiPortrait } from "@/components/ascii-portrait";
import { Container } from "@/components/container";
import { ContactForm } from "@/components/contact-form";
import { JsonLd } from "@/components/json-ld";
import { PageHeader } from "@/components/page-header";
import { PORTRAIT_CODE } from "@/lib/ascii-portrait-art";
import { buildMetadata } from "@/lib/metadata";
import { contactGraph } from "@/lib/structured-data";
import { siteConfig } from "@/lib/site";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

type Props = { params: Promise<{ locale: string }> };

/**
 * A social profile row. Until `siteConfig.social` holds a real URL this renders
 * dull, non-interactive text — linking to a platform's root would dead-end the
 * visitor on someone else's home page, which is worse than no link. Setting the
 * URL in site.ts is the only edit needed to make it live; `rel="me"` is the
 * identity claim that pairs with JSON-LD `sameAs` when those URLs land.
 */
function Profile({ url, pending }: { url: string; pending: string }) {
  if (!url) {
    return <span className="text-muted-foreground/60 italic">{pending}</span>;
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="me noopener noreferrer"
      className="text-primary hover:underline"
    >
      {url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
    </a>
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const l = (isLocale(locale) ? locale : "en") as Locale;
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
  const l = (isLocale(locale) ? locale : "en") as Locale;
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

      <PageHeader title={t.title}>{t.intro}</PageHeader>

      <div className="mt-6 grid gap-8 md:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="max-w-xl">
          <ContactForm locale={l} dict={dict} />
        </div>

        {/*
          Two-column grid rather than per-row flex + a fixed-width `dt`: the
          label column sizes to the longest label, so "LinkedIn" and the longer
          Russian labels stay aligned with "Name" instead of overflowing a w-16
          cell. `items-baseline` sits the label on the value's first baseline.

          `content-start` is load-bearing: this <dl> is itself a grid item that
          stretches to the form's height, and grid's default `align-content:
          stretch` would hand all that slack to the four auto-sized rows — which
          it did, spacing them ~95px apart instead of 12. The old `space-y-3`
          block layout could not hit this.
        */}
        <dl className="md:border-border grid grid-cols-[auto_1fr] content-start items-baseline gap-x-6 gap-y-3 text-sm md:border-l md:pl-8">
          <dt className="text-muted-foreground">{t.labelName}</dt>
          <dd className="font-medium">{siteConfig.author.firstName}</dd>

          <dt className="text-muted-foreground">{t.labelEmail}</dt>
          <dd>
            <a
              href={`mailto:${siteConfig.contactEmail}`}
              className="text-primary hover:underline"
            >
              {siteConfig.contactEmail}
            </a>
          </dd>

          <dt className="text-muted-foreground">{t.labelLinkedin}</dt>
          <dd>
            <Profile url={siteConfig.social.linkedin} pending={t.linkPending} />
          </dd>

          <dt className="text-muted-foreground">{t.labelUpwork}</dt>
          <dd>
            <Profile url={siteConfig.social.upwork} pending={t.linkPending} />
          </dd>
        </dl>
      </div>

      {/*
        Decorative ASCII portrait, typed in over ~2s on load. Swap
        PORTRAIT_CODE for PORTRAIT_BLOCKS (same module) to switch between the
        code-glyph and block-shading renderings — both are generated in one
        pass by scripts/portrait-to-ascii.py, so no regenerate is needed.
      */}
      <div className="mt-12 sm:mt-16">
        <AsciiPortrait art={PORTRAIT_CODE} />
      </div>
    </Container>
  );
}
